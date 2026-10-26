-- =============================================================================
-- Migration: 20261026000002_dine_in_pickup_live_tracking.sql
-- Purpose:
--   1. Align orders with in-venue experience (dine_in / pickup, arrival_mode,
--      table assignment, bank transfer receipt attachment, 4-digit pickup PIN).
--   2. Add 'ready' (Listo para retirar / servir) and 'no_show' (No se presentó)
--      statuses to public.orders.
--   3. Create Anti-No-Show Cash Shield RPCs & Live Order Tracking RPCs.
--   4. Create public Storage bucket `payment-proofs` for transfer receipts.
-- =============================================================================

-- 1. Extend public.orders columns & status check constraint -------------------
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'no_show'));

alter table public.orders
  add column if not exists payment_proof_url text,
  add column if not exists arrival_mode text not null default 'on_the_way'
    check (arrival_mode in ('on_the_way', 'at_table')),
  add column if not exists pickup_pin text not null default lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

-- 2. Storage bucket for bank transfer receipts (`payment-proofs`) -------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880;

drop policy if exists "payment_proofs_public_read" on storage.objects;
create policy "payment_proofs_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'payment-proofs');

drop policy if exists "payment_proofs_public_insert" on storage.objects;
create policy "payment_proofs_public_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'payment-proofs');

-- 3. Public RPC: list_public_tables(p_slug) -----------------------------------
-- Allows customers at the venue to select their table number from a dropdown.
create or replace function public.list_public_tables(
  p_slug text
)
returns table (
  table_id     uuid,
  table_number integer,
  qr_token     text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tb.id as table_id,
    tb.table_number,
    tb.qr_token
  from public.tables tb
  join public.tenants tn on tn.id = tb.tenant_id
  where tn.slug = btrim(p_slug)
  order by tb.table_number asc;
$$;

revoke all on function public.list_public_tables(text) from public;
grant execute on function public.list_public_tables(text) to anon, authenticated;

-- 4. Public RPC: get_customer_trust_profile(p_phone) --------------------------
-- Powers the Anti-No-Show Cash Shield by checking completed vs no_show orders.
create or replace function public.get_customer_trust_profile(
  p_phone text
)
returns table (
  completed_orders integer,
  no_show_orders   integer,
  cash_allowed     boolean,
  max_cash_remote  numeric(10, 2),
  trust_tier       text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_clean_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_completed   integer := 0;
  v_no_show     integer := 0;
begin
  if length(v_clean_phone) >= 7 then
    select
      count(*) filter (where o.status = 'completed'),
      count(*) filter (where o.status = 'no_show')
    into v_completed, v_no_show
    from public.orders o
    where regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_clean_phone;
  end if;

  if v_no_show > 0 then
    return query select
      v_completed,
      v_no_show,
      false as cash_allowed,
      0.00::numeric(10, 2) as max_cash_remote,
      'restricted'::text as trust_tier;
  elsif v_completed >= 1 then
    return query select
      v_completed,
      v_no_show,
      true as cash_allowed,
      60.00::numeric(10, 2) as max_cash_remote,
      'verified'::text as trust_tier;
  else
    return query select
      v_completed,
      v_no_show,
      true as cash_allowed,
      15.00::numeric(10, 2) as max_cash_remote,
      'new'::text as trust_tier;
  end if;
end;
$$;

revoke all on function public.get_customer_trust_profile(text) from public;
grant execute on function public.get_customer_trust_profile(text) to anon, authenticated;

-- 5. Updated RPC: public.place_order(...) -------------------------------------
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric);
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text);

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
  p_delivery_lng       numeric default null,
  p_payment_proof_url  text default null,
  p_arrival_mode       text default 'on_the_way'
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

    if not found then
      raise exception 'Active table not found for token' using errcode = 'P0002';
    end if;
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

revoke all on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text) to anon, authenticated;

-- 6. Public RPC: get_order_live_status(p_order_id) ----------------------------
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
    tb.table_number,
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

-- 7. Public RPC: assign_order_table(p_order_id, p_slug, p_table_token) --------
create or replace function public.assign_order_table(
  p_order_id    uuid,
  p_slug        text,
  p_table_token text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_id     uuid;
  v_table_number integer;
begin
  select tb.id, tb.table_number
    into v_table_id, v_table_number
  from public.tables tb
  join public.tenants tn on tn.id = tb.tenant_id
  where tn.slug = btrim(p_slug)
    and tb.qr_token = btrim(p_table_token);

  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.orders
  set table_id     = v_table_id,
      arrival_mode = 'at_table',
      order_type   = 'dine_in'
  where id = p_order_id
    and status in ('pending', 'confirmed', 'preparing', 'ready');

  return v_table_number;
end;
$$;

revoke all on function public.assign_order_table(uuid, text, text) from public;
grant execute on function public.assign_order_table(uuid, text, text) to anon, authenticated;
