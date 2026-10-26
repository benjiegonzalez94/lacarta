-- =============================================================================
-- Migration: Counter Pickup Flow (No Table Selection), Multi-Branch Distinction,
--            Saved Customer Cards & Seller Card Settlement Configuration
-- =============================================================================

-- 1. Add multi-branch distinction & card receiving configuration to public.tenants
alter table public.tenants
  add column if not exists branch_name text not null default 'Matriz Principal',
  add column if not exists card_payments_enabled boolean not null default true,
  add column if not exists card_gateway text not null default 'payphone',
  add column if not exists card_merchant_id text,
  add column if not exists settlement_bank_name text,
  add column if not exists settlement_account_type text not null default 'Ahorros',
  add column if not exists settlement_account_number text,
  add column if not exists settlement_holder_name text,
  add column if not exists settlement_holder_id text;

update public.tenants
set
  branch_name = coalesce(nullif(branch_name, ''), 'Sucursal Iñaquito'),
  card_payments_enabled = true,
  card_gateway = 'payphone',
  card_merchant_id = coalesce(card_merchant_id, 'PP-EC-COWIINGS-01'),
  settlement_bank_name = coalesce(settlement_bank_name, 'Banco Pichincha'),
  settlement_account_type = coalesce(settlement_account_type, 'Ahorros'),
  settlement_account_number = coalesce(settlement_account_number, '2208945123'),
  settlement_holder_name = coalesce(settlement_holder_name, 'Cowiings Ecuador'),
  settlement_holder_id = coalesce(settlement_holder_id, '1712345678001')
where slug = 'cowiings';

-- 2. Create public.customer_cards table for tokenized saved cards in customer profile
create table if not exists public.customer_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_brand  text not null default 'Visa',
  last4       text not null,
  holder_name text not null,
  exp_month   integer not null check (exp_month between 1 and 12),
  exp_year    integer not null check (exp_year >= 2025),
  card_token  text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_customer_cards_user_id on public.customer_cards(user_id);

alter table public.customer_cards enable row level security;

drop policy if exists "customer_cards_select_own" on public.customer_cards;
create policy "customer_cards_select_own"
  on public.customer_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "customer_cards_insert_own" on public.customer_cards;
create policy "customer_cards_insert_own"
  on public.customer_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "customer_cards_update_own" on public.customer_cards;
create policy "customer_cards_update_own"
  on public.customer_cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "customer_cards_delete_own" on public.customer_cards;
create policy "customer_cards_delete_own"
  on public.customer_cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Seed a default tokenized demo card for cliente@lacarta.ec
insert into public.customer_cards (
  user_id,
  card_brand,
  last4,
  holder_name,
  exp_month,
  exp_year,
  card_token,
  is_default
)
select
  u.id,
  'Visa',
  '4242',
  'CLIENTE DEMO',
  12,
  2028,
  'tok_visa_demo_4242',
  true
from auth.users u
where u.email = 'cliente@lacarta.ec'
  and not exists (
    select 1 from public.customer_cards c where c.user_id = u.id
  );

-- 3. Add card payment columns to public.orders & relax payment_method check to allow 'card'
alter table public.orders
  add column if not exists card_brand text,
  add column if not exists card_last4 text,
  add column if not exists payment_reference text,
  add column if not exists payment_status text not null default 'pending';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_method_check'
  ) then
    alter table public.orders drop constraint orders_payment_method_check;
  end if;
end;
$$;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cash', 'transfer', 'card', 'card_soon'));

-- 4. Update public.place_order RPC (returns uuid) to support direct in-app card payment
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text, integer, text, text);
drop function if exists public.place_order(text, text, jsonb, text, text, text, text, text, text, text, numeric, numeric, text, text, integer, text, text, text, text, text);

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
  p_customer_avatar_url text default null,
  p_card_brand          text default null,
  p_card_last4          text default null,
  p_payment_reference   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant           public.tenants%rowtype;
  v_order_id         uuid;
  v_subtotal         numeric(10, 2) := 0;
  v_total            numeric(10, 2) := 0;
  v_item             jsonb;
  v_product          public.products%rowtype;
  v_qty              integer;
  v_line_total       numeric(10, 2);
  v_item_notes       text;
  v_mod_delta        numeric(10, 2);
  v_mod_names        text;
  v_unit_price       numeric(10, 2);
  v_effective_method text;
  v_effective_mode   text;
  v_pickup_pin       text;
  v_payment_status   text;
  v_payment_ref      text;
begin
  select *
  into v_tenant
  from public.tenants
  where slug = p_slug
    and is_active = true
  limit 1;

  if not found then
    raise exception 'Restaurante no encontrado o inactivo';
  end if;

  if p_order_type not in ('delivery', 'pickup', 'dine_in') then
    raise exception 'Tipo de pedido inválido';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe contener al menos un producto';
  end if;

  v_effective_method := coalesce(p_payment_method, 'cash');
  if v_effective_method not in ('cash', 'transfer', 'card', 'card_soon') then
    v_effective_method := 'cash';
  end if;

  v_effective_mode := 'at_table';
  v_pickup_pin := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  if v_effective_method = 'card' then
    v_payment_status := 'paid';
    v_payment_ref := coalesce(
      nullif(trim(p_payment_reference), ''),
      'PAY-' || upper(substr(md5(random()::text), 1, 8))
    );
  elsif v_effective_method = 'transfer' then
    v_payment_status := 'pending_verification';
    v_payment_ref := null;
  else
    v_payment_status := 'pending_cash_at_counter';
    v_payment_ref := null;
  end if;

  insert into public.orders (
    tenant_id,
    order_type,
    status,
    customer_name,
    customer_phone,
    customer_cedula,
    customer_avatar_url,
    delivery_address,
    delivery_reference,
    notes,
    table_id,
    manual_table_number,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    delivery_lat,
    delivery_lng,
    payment_proof_url,
    arrival_mode,
    pickup_pin,
    cash_commitment_confirmed,
    card_brand,
    card_last4,
    payment_reference,
    payment_status
  ) values (
    v_tenant.id,
    p_order_type,
    'pending',
    nullif(trim(p_customer_name), ''),
    nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_cedula), ''),
    nullif(trim(p_customer_avatar_url), ''),
    null,
    null,
    nullif(trim(p_notes), ''),
    null,
    null,
    0,
    0,
    0,
    v_effective_method,
    null,
    null,
    nullif(trim(p_payment_proof_url), ''),
    v_effective_mode,
    v_pickup_pin,
    (v_effective_method = 'cash'),
    nullif(trim(p_card_brand), ''),
    nullif(trim(p_card_last4), ''),
    v_payment_ref,
    v_payment_status
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 or v_qty > 99 then
      raise exception 'Cantidad inválida en ítem del pedido';
    end if;

    select *
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and tenant_id = v_tenant.id
      and is_available = true
    limit 1;

    if not found then
      raise exception 'Producto no disponible o inválido';
    end if;

    v_mod_delta := 0;
    v_mod_names := null;

    if v_item ? 'option_ids' and jsonb_typeof(v_item->'option_ids') = 'array' and jsonb_array_length(v_item->'option_ids') > 0 then
      select
        coalesce(sum(mo.price_delta), 0),
        string_agg(mo.name, ', ' order by mo.name)
      into v_mod_delta, v_mod_names
      from public.modifier_options mo
      where mo.tenant_id = v_tenant.id
        and mo.is_available = true
        and mo.id in (
          select (val)::uuid
          from jsonb_array_elements_text(v_item->'option_ids') as val
        );
    end if;

    v_unit_price := round((v_product.price + coalesce(v_mod_delta, 0))::numeric, 2);
    v_line_total := round((v_unit_price * v_qty)::numeric, 2);
    v_subtotal := v_subtotal + v_line_total;

    v_item_notes := nullif(trim(coalesce(v_item->>'notes', '')), '');
    if v_mod_names is not null then
      if v_item_notes is not null then
        v_item_notes := v_mod_names || ' | ' || v_item_notes;
      else
        v_item_notes := v_mod_names;
      end if;
    end if;

    insert into public.order_items (
      order_id,
      tenant_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      line_total,
      notes
    ) values (
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

  update public.orders
  set
    subtotal = v_subtotal,
    delivery_fee = 0,
    total = v_total
  where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(
  text,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

-- 5. Update public.get_order_live_status to include card payment & branch info
drop function if exists public.get_order_live_status(uuid);

create or replace function public.get_order_live_status(
  p_order_id uuid
)
returns table (
  order_id          uuid,
  tenant_slug       text,
  tenant_name       text,
  tenant_branch     text,
  tenant_phone      text,
  order_type        text,
  status            text,
  arrival_mode      text,
  table_number      integer,
  payment_method    text,
  payment_status    text,
  card_brand        text,
  card_last4        text,
  payment_reference text,
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
    tn.branch_name as tenant_branch,
    tn.phone as tenant_phone,
    o.order_type,
    o.status,
    o.arrival_mode,
    o.manual_table_number as table_number,
    o.payment_method,
    o.payment_status,
    o.card_brand,
    o.card_last4,
    o.payment_reference,
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
  where o.id = p_order_id
  limit 1;
$$;

grant execute on function public.get_order_live_status(uuid) to anon, authenticated;
