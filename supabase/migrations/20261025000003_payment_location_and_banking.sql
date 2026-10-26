-- =============================================================================
-- Migration: 20261025000003_payment_location_and_banking.sql
-- Purpose:
--   1. Add seller profile fields (`address`, `bank_details`) to `public.tenants`.
--   2. Add `payment_method`, `delivery_lat`, `delivery_lng` to `public.orders`.
--   3. Update `public.place_order()` RPC to store payment method & GPS coordinates.
--   4. Fix broken Unsplash URLs on Salchipapas products for pilot tenant Cowiings.
-- =============================================================================

-- 1. Extend public.tenants with seller profile & bank transfer details --------
alter table public.tenants
  add column if not exists address text,
  add column if not exists bank_details text;

update public.tenants
set
  address = coalesce(address, 'Servicio a domicilio y atención en local • Ecuador'),
  bank_details = coalesce(bank_details, 'Banco Pichincha / Guayaquil — Solicita el número de cuenta por WhatsApp al confirmar tu pedido.')
where slug = 'cowiings';

-- 2. Extend public.orders with payment_method and GPS coordinates -------------
alter table public.orders
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'transfer', 'card_soon')),
  add column if not exists delivery_lat numeric(10, 7),
  add column if not exists delivery_lng numeric(10, 7);

-- 3. Unify public.place_order() RPC with payment_method, GPS & modifier deltas
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text);
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric);

create or replace function public.place_order(
  p_slug               text,
  p_order_type         text,
  p_items              jsonb,
  p_customer_name      text default null,
  p_customer_phone     text default null,
  p_delivery_address   text default null,
  p_delivery_reference text default null,
  p_notes              text default null,
  p_table_token        text default null,
  p_payment_method     text default 'cash',
  p_delivery_lat       numeric default null,
  p_delivery_lng       numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant        public.tenants%rowtype;
  v_table_id      uuid;
  v_order_id      uuid;
  v_subtotal      numeric(10, 2) := 0;
  v_delivery_fee  numeric(10, 2) := 0;
  v_total         numeric(10, 2) := 0;
  v_item          jsonb;
  v_product       public.products%rowtype;
  v_qty           integer;
  v_item_notes    text;
  v_options_delta numeric(10, 2) := 0;
  v_unit_price    numeric(10, 2) := 0;
  v_line_total    numeric(10, 2) := 0;
  v_payment       text := coalesce(nullif(btrim(p_payment_method), ''), 'cash');
begin
  if p_order_type not in ('delivery', 'pickup', 'dine_in') then
    raise exception 'Invalid order_type: %', p_order_type using errcode = '22023';
  end if;

  if v_payment not in ('cash', 'transfer', 'card_soon') then
    v_payment := 'cash';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Order exceeds maximum number of line items (50)' using errcode = '22023';
  end if;

  select * into v_tenant
  from public.tenants
  where slug = btrim(p_slug);

  if not found then
    raise exception 'Active tenant not found for slug: %', p_slug using errcode = 'P0002';
  end if;

  if p_order_type = 'dine_in' then
    if p_table_token is null or length(btrim(p_table_token)) = 0 then
      raise exception 'table_token is required for dine_in orders' using errcode = '22023';
    end if;

    select tb.id
      into v_table_id
    from public.tables tb
    where tb.tenant_id = v_tenant.id
      and tb.qr_token = btrim(p_table_token)
      and tb.is_active = true;

    if not found then
      raise exception 'Active table not found for token' using errcode = 'P0002';
    end if;
  elsif p_order_type = 'delivery' then
    if p_delivery_address is null or length(btrim(p_delivery_address)) = 0 then
      raise exception 'delivery_address is required for delivery orders' using errcode = '22023';
    end if;
    v_delivery_fee := v_tenant.delivery_fee;
  end if;

  insert into public.orders (
    tenant_id,
    table_id,
    order_type,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_reference,
    notes,
    payment_method,
    delivery_lat,
    delivery_lng,
    subtotal,
    delivery_fee,
    total
  )
  values (
    v_tenant.id,
    v_table_id,
    p_order_type,
    'pending',
    left(nullif(btrim(p_customer_name), ''), 120),
    left(nullif(btrim(p_customer_phone), ''), 40),
    left(nullif(btrim(p_delivery_address), ''), 300),
    left(nullif(btrim(p_delivery_reference), ''), 300),
    left(nullif(btrim(p_notes), ''), 500),
    v_payment,
    p_delivery_lat,
    p_delivery_lng,
    0,
    v_delivery_fee,
    0
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_qty <= 0 or v_qty > 99 then
      raise exception 'Invalid quantity for item: %', v_item using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and tenant_id = v_tenant.id
      and is_available = true;

    if not found then
      raise exception 'Product unavailable or does not belong to tenant: %', (v_item ->> 'product_id')
        using errcode = 'P0002';
    end if;

    v_options_delta := 0;
    if v_item ? 'option_ids' and jsonb_typeof(v_item -> 'option_ids') = 'array' then
      select coalesce(sum(mo.price_delta), 0)
        into v_options_delta
      from public.modifier_options mo
      where mo.tenant_id = v_tenant.id
        and mo.is_available = true
        and mo.id in (
          select (jsonb_array_elements_text(v_item -> 'option_ids'))::uuid
        );
    end if;

    v_unit_price := round(v_product.price + coalesce(v_options_delta, 0), 2);
    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal   := v_subtotal + v_line_total;
    v_item_notes := left(nullif(btrim(v_item ->> 'notes'), ''), 400);

    insert into public.order_items (
      order_id,
      tenant_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      line_total,
      notes
    )
    values (
      v_order_id,
      v_tenant.id,
      v_product.id,
      v_product.name,
      v_unit_price,
      v_qty,
      v_line_total,
      v_item_notes
    );
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  update public.orders
  set subtotal = v_subtotal,
      total    = v_total
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric) from public;
grant execute on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric) to anon, authenticated;

-- 4. Fix broken Unsplash URLs for Salchipapas products in Cowiings ------------
update public.products
set image_url = 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80'
where tenant_id = 'd1452a53-5345-403d-9ed2-b4466415721d'
  and name ilike '%Salchipapa%';
