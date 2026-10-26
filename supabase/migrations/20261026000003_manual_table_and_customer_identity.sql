-- =============================================================================
-- Migration: 20261026000003_manual_table_and_customer_identity.sql
-- Purpose:
--   1. Support manual table number entry (`manual_table_number`) on orders
--      without requiring QR tokens.
--   2. Store customer identity (`customer_cedula`, `customer_avatar_url`) on orders.
--   3. Create public Storage bucket `avatars` for customer profile photos and
--      seller restaurant logos.
--   4. Update `place_order`, `get_order_live_status`, and create
--      `assign_order_table_number(p_order_id, p_table_number)`.
-- =============================================================================

-- 1. Extend public.orders with manual_table_number and customer identity ------
alter table public.orders
  add column if not exists manual_table_number integer
    check (manual_table_number is null or (manual_table_number >= 1 and manual_table_number <= 500)),
  add column if not exists customer_cedula text,
  add column if not exists customer_avatar_url text;

-- 2. Public Storage bucket `avatars` for profile photos & logos ---------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_public_insert" on storage.objects;
create policy "avatars_public_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'avatars');

-- 3. Update public.place_order(...) with manual table number & cedula ---------
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text);
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text, integer, text, text);

create or replace function public.place_order(
  p_slug                text,
  p_order_type          text,
  p_items               jsonb,
  p_customer_name       text default null,
  p_customer_phone      text default null,
  p_delivery_address    text default null,
  p_delivery_reference  text default null,
  p_notes               text default null,
  p_table_token         text default null,
  p_payment_method      text default 'cash',
  p_delivery_lat        numeric default null,
  p_delivery_lng        numeric default null,
  p_payment_proof_url   text default null,
  p_arrival_mode        text default 'on_the_way',
  p_table_number        integer default null,
  p_customer_cedula     text default null,
  p_customer_avatar_url text default null
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
  v_total         numeric(10, 2) := 0;
  v_item          jsonb;
  v_product       public.products%rowtype;
  v_qty           integer;
  v_item_notes    text;
  v_options_delta numeric(10, 2) := 0;
  v_unit_price    numeric(10, 2) := 0;
  v_line_total    numeric(10, 2) := 0;
  v_payment       text := coalesce(nullif(btrim(p_payment_method), ''), 'cash');
  v_arrival       text := coalesce(nullif(btrim(p_arrival_mode), ''), 'on_the_way');
  v_clean_phone   text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_no_shows      integer := 0;
  v_completed     integer := 0;
  v_pin           text := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
begin
  if p_order_type not in ('delivery', 'pickup', 'dine_in') then
    raise exception 'Invalid order_type: %', p_order_type using errcode = '22023';
  end if;

  if v_payment not in ('cash', 'transfer', 'card_soon') then
    v_payment := 'cash';
  end if;

  if v_arrival not in ('on_the_way', 'at_table') then
    v_arrival := 'on_the_way';
  end if;

  if p_table_number is not null and p_table_number >= 1 then
    v_arrival := 'at_table';
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

  if p_table_token is not null and length(btrim(p_table_token)) > 0 then
    select tb.id
      into v_table_id
    from public.tables tb
    where tb.tenant_id = v_tenant.id
      and tb.qr_token = btrim(p_table_token);
    v_arrival := 'at_table';
  end if;

  if v_payment = 'cash' and length(v_clean_phone) >= 7 then
    select
      count(*) filter (where o.status = 'no_show'),
      count(*) filter (where o.status = 'completed')
    into v_no_shows, v_completed
    from public.orders o
    where regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_clean_phone;

    if v_no_shows > 0 then
      raise exception 'CASH_RESTRICTED_NO_SHOW' using errcode = '22023';
    end if;
  end if;

  insert into public.orders (
    tenant_id,
    table_id,
    manual_table_number,
    order_type,
    status,
    customer_name,
    customer_phone,
    customer_cedula,
    customer_avatar_url,
    delivery_address,
    delivery_reference,
    notes,
    payment_method,
    delivery_lat,
    delivery_lng,
    payment_proof_url,
    arrival_mode,
    pickup_pin,
    subtotal,
    delivery_fee,
    total
  )
  values (
    v_tenant.id,
    v_table_id,
    p_table_number,
    p_order_type,
    'pending',
    left(nullif(btrim(p_customer_name), ''), 120),
    left(nullif(btrim(p_customer_phone), ''), 40),
    left(nullif(btrim(p_customer_cedula), ''), 20),
    left(nullif(btrim(p_customer_avatar_url), ''), 2000),
    left(nullif(btrim(p_delivery_address), ''), 300),
    left(nullif(btrim(p_delivery_reference), ''), 300),
    left(nullif(btrim(p_notes), ''), 500),
    v_payment,
    p_delivery_lat,
    p_delivery_lng,
    left(nullif(btrim(p_payment_proof_url), ''), 2000),
    v_arrival,
    v_pin,
    0,
    0,
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

  v_total := v_subtotal;

  if v_payment = 'cash' and v_arrival = 'on_the_way' and v_completed = 0 and v_total > 15.00 then
    raise exception 'CASH_LIMIT_EXCEEDED_ON_THE_WAY' using errcode = '22023';
  end if;

  update public.orders
  set subtotal = v_subtotal,
      total    = v_total
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text, integer, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text, integer, text, text) to anon, authenticated;

-- 4. Update get_order_live_status to return manual_table_number ---------------
create or replace function public.get_order_live_status(
  p_order_id uuid
)
returns table (
  order_id          uuid,
  tenant_slug       text,
  tenant_name       text,
  tenant_phone      text,
  order_type        text,
  status            text,
  arrival_mode      text,
  table_number      integer,
  payment_method    text,
  has_payment_proof boolean,
  pickup_pin        text,
  customer_name     text,
  total             numeric(10, 2),
  created_at        timestamptz,
  items             jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id as order_id,
    tn.slug as tenant_slug,
    tn.name as tenant_name,
    tn.phone as tenant_phone,
    o.order_type,
    o.status,
    o.arrival_mode,
    coalesce(o.manual_table_number, tb.table_number) as table_number,
    o.payment_method,
    (o.payment_proof_url is not null and length(o.payment_proof_url) > 0) as has_payment_proof,
    o.pickup_pin,
    o.customer_name,
    o.total,
    o.created_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'line_total', oi.line_total,
            'notes', oi.notes
          )
        )
        from public.order_items oi
        where oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as items
  from public.orders o
  join public.tenants tn on tn.id = o.tenant_id
  left join public.tables tb on tb.id = o.table_id
  where o.id = p_order_id;
$$;

revoke all on function public.get_order_live_status(uuid) from public;
grant execute on function public.get_order_live_status(uuid) to anon, authenticated;

-- 5. RPC: assign_order_table_number(p_order_id, p_table_number) ---------------
create or replace function public.assign_order_table_number(
  p_order_id     uuid,
  p_table_number integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table_number is null or p_table_number < 1 or p_table_number > 500 then
    raise exception 'INVALID_TABLE_NUMBER' using errcode = '22023';
  end if;

  update public.orders
  set manual_table_number = p_table_number,
      arrival_mode        = 'at_table',
      order_type          = 'dine_in'
  where id = p_order_id
    and status in ('pending', 'confirmed', 'preparing', 'ready');

  return p_table_number;
end;
$$;

revoke all on function public.assign_order_table_number(uuid, integer) from public;
grant execute on function public.assign_order_table_number(uuid, integer) to anon, authenticated;
