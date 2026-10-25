-- =============================================================================
-- Migration: 20261025000002_modifiers_hours_and_branding.sql
-- Purpose:
--   Phase 1: Universal Modifier & Variant Engine (modifier_groups,
--            modifier_options, product_modifier_groups) with price_delta
--            recomputed server-side in public.place_order().
--   Phase 2: Dynamic Branding columns on public.tenants + editable
--            public.business_hours table with RLS.
-- =============================================================================

-- 1. Dynamic Branding columns on tenants --------------------------------------
alter table public.tenants
  add column if not exists slogan text not null default 'Arte en Sabor'
    check (char_length(slogan) <= 120),
  add column if not exists primary_color text not null default '#E5A93C'
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists secondary_color text not null default '#D34E27'
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists banner_url text;

-- Ensure composite FK target exists on products (id, tenant_id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_id_tenant_id_key'
  ) then
    alter table public.products add constraint products_id_tenant_id_key unique (id, tenant_id);
  end if;
end;
$$;

-- 2. Editable Business Hours table --------------------------------------------
create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time   time not null default '17:00',
  close_time  time not null default '22:00',
  is_open     boolean not null default true,
  unique (tenant_id, day_of_week)
);

create index if not exists business_hours_tenant_idx
  on public.business_hours (tenant_id, day_of_week);

alter table public.business_hours enable row level security;

drop policy if exists business_hours_public_read on public.business_hours;
create policy business_hours_public_read on public.business_hours
  for select to anon, authenticated using (true);

drop policy if exists business_hours_owner_all on public.business_hours;
create policy business_hours_owner_all on public.business_hours
  for all to authenticated
  using (public.is_tenant_owner(tenant_id))
  with check (public.is_tenant_owner(tenant_id));

-- 3. Universal Modifier & Variant Engine --------------------------------------
create table if not exists public.modifier_groups (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  min_select  integer not null default 0 check (min_select >= 0),
  max_select  integer not null default 1 check (max_select >= 1 and max_select >= min_select),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, tenant_id)
);

create index if not exists modifier_groups_tenant_idx
  on public.modifier_groups (tenant_id, sort_order);

create table if not exists public.modifier_options (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  group_id      uuid not null,
  name          text not null check (char_length(name) between 1 and 80),
  price_delta   numeric(10,2) not null default 0 check (price_delta >= 0),
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (group_id, tenant_id)
    references public.modifier_groups (id, tenant_id) on delete cascade
);

create index if not exists modifier_options_group_idx
  on public.modifier_options (tenant_id, group_id, sort_order);

create table if not exists public.product_modifier_groups (
  product_id  uuid not null,
  group_id    uuid not null,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  sort_order  integer not null default 0,
  primary key (product_id, group_id),
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete cascade,
  foreign key (group_id, tenant_id)
    references public.modifier_groups (id, tenant_id) on delete cascade
);

create index if not exists product_modifier_groups_tenant_idx
  on public.product_modifier_groups (tenant_id, product_id, sort_order);

alter table public.modifier_groups         enable row level security;
alter table public.modifier_options        enable row level security;
alter table public.product_modifier_groups enable row level security;

drop policy if exists modifier_groups_public_read on public.modifier_groups;
create policy modifier_groups_public_read on public.modifier_groups
  for select to anon, authenticated using (true);

drop policy if exists modifier_groups_owner_all on public.modifier_groups;
create policy modifier_groups_owner_all on public.modifier_groups
  for all to authenticated
  using (public.is_tenant_owner(tenant_id))
  with check (public.is_tenant_owner(tenant_id));

drop policy if exists modifier_options_public_read on public.modifier_options;
create policy modifier_options_public_read on public.modifier_options
  for select to anon, authenticated using (true);

drop policy if exists modifier_options_owner_all on public.modifier_options;
create policy modifier_options_owner_all on public.modifier_options
  for all to authenticated
  using (public.is_tenant_owner(tenant_id))
  with check (public.is_tenant_owner(tenant_id));

drop policy if exists product_modifier_groups_public_read on public.product_modifier_groups;
create policy product_modifier_groups_public_read on public.product_modifier_groups
  for select to anon, authenticated using (true);

drop policy if exists product_modifier_groups_owner_all on public.product_modifier_groups;
create policy product_modifier_groups_owner_all on public.product_modifier_groups
  for all to authenticated
  using (public.is_tenant_owner(tenant_id))
  with check (public.is_tenant_owner(tenant_id));

-- 4. Update public.place_order() to compute modifier price_delta server-side --
create or replace function public.place_order(
  p_slug                text,
  p_order_type          text,
  p_items               jsonb,
  p_customer_name       text default null,
  p_customer_phone      text default null,
  p_delivery_address    text default null,
  p_delivery_reference  text default null,
  p_notes               text default null,
  p_table_token         text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant        public.tenants%rowtype;
  v_table_id      uuid;
  v_order_id      uuid;
  v_item          jsonb;
  v_product       public.products%rowtype;
  v_qty           integer;
  v_options_delta numeric(10,2);
  v_unit_price    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
  v_fee           numeric(10,2) := 0;
  v_name          text := nullif(left(btrim(coalesce(p_customer_name, '')), 120), '');
  v_phone         text := nullif(left(btrim(coalesce(p_customer_phone, '')), 30), '');
  v_address       text := nullif(left(btrim(coalesce(p_delivery_address, '')), 300), '');
  v_reference     text := nullif(left(btrim(coalesce(p_delivery_reference, '')), 300), '');
  v_notes         text := nullif(left(btrim(coalesce(p_notes, '')), 500), '');
begin
  select * into v_tenant from public.tenants where slug = btrim(p_slug);
  if not found then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  if p_order_type not in ('delivery', 'pickup', 'dine_in') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_ITEMS';
  end if;

  if p_order_type = 'dine_in' then
    select tb.id into v_table_id
    from public.tables tb
    where tb.tenant_id = v_tenant.id and tb.qr_token = btrim(coalesce(p_table_token, ''));
    if v_table_id is null then
      raise exception 'TABLE_NOT_FOUND';
    end if;
  else
    if v_name is null or v_phone is null then
      raise exception 'CUSTOMER_REQUIRED';
    end if;
    if p_order_type = 'delivery' and v_address is null then
      raise exception 'ADDRESS_REQUIRED';
    end if;
  end if;

  if p_order_type = 'delivery' then
    v_fee := v_tenant.delivery_fee;
  end if;

  insert into public.orders (
    tenant_id, order_type, table_id, customer_name, customer_phone,
    delivery_address, delivery_reference, notes
  ) values (
    v_tenant.id, p_order_type, v_table_id, v_name, v_phone,
    case when p_order_type = 'delivery' then v_address end,
    case when p_order_type = 'delivery' then v_reference end,
    v_notes
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and tenant_id = v_tenant.id
      and is_available;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    v_options_delta := 0;
    if jsonb_typeof(v_item -> 'option_ids') = 'array'
       and jsonb_array_length(v_item -> 'option_ids') > 0 then
      select coalesce(sum(mo.price_delta), 0)
      into v_options_delta
      from public.modifier_options mo
      where mo.tenant_id = v_tenant.id
        and mo.is_available
        and mo.id in (
          select (val)::uuid
          from jsonb_array_elements_text(v_item -> 'option_ids') as val
        );
    end if;

    v_unit_price := v_product.price + v_options_delta;

    insert into public.order_items (
      order_id, tenant_id, product_id, product_name, unit_price, quantity, line_total, notes
    ) values (
      v_order_id, v_tenant.id, v_product.id, v_product.name, v_unit_price,
      v_qty, v_unit_price * v_qty, nullif(left(btrim(coalesce(v_item ->> 'notes', '')), 300), '')
    );

    v_subtotal := v_subtotal + v_unit_price * v_qty;
  end loop;

  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- 5. Seed business_hours and modifier_groups for pilot tenant "cowiings" ------
do $$
declare
  v_tenant        uuid;
  g_salsas_2      uuid;
  g_salsas_3      uuid;
  g_salsas_4      uuid;
  g_salsas_5      uuid;
  g_salsa_extra   uuid;
  g_sabor_cola_v  uuid;
  g_sabor_cola_p  uuid;
  g_sabor_fuze    uuid;
  v_group         uuid;
begin
  select id into v_tenant from public.tenants where slug = 'cowiings';
  if v_tenant is null then
    return;
  end if;

  -- Business hours (0=Sunday .. 6=Saturday)
  insert into public.business_hours (tenant_id, day_of_week, open_time, close_time, is_open)
  values
    (v_tenant, 1, '17:00', '22:00', false), -- Lunes
    (v_tenant, 2, '17:00', '22:00', false), -- Martes
    (v_tenant, 3, '17:00', '22:00', false), -- Miércoles
    (v_tenant, 4, '17:00', '22:00', true),  -- Jueves
    (v_tenant, 5, '17:00', '23:00', true),  -- Viernes
    (v_tenant, 6, '17:00', '23:59', true),  -- Sábado
    (v_tenant, 0, '17:00', '22:00', true)   -- Domingo
  on conflict (tenant_id, day_of_week) do nothing;

  -- Only seed modifier groups if none exist for cowiings yet
  if exists (select 1 from public.modifier_groups where tenant_id = v_tenant) then
    return;
  end if;

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Elige tus Salsas (Hasta 2)', 1, 2, 1) returning id into g_salsas_2;

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Elige tus Salsas (Hasta 3)', 1, 3, 2) returning id into g_salsas_3;

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Elige tus Salsas (Hasta 4)', 1, 4, 3) returning id into g_salsas_4;

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Elige tus Salsas (Hasta 5)', 1, 5, 4) returning id into g_salsas_5;

  for v_group in select unnest(array[g_salsas_2, g_salsas_3, g_salsas_4, g_salsas_5]) loop
    insert into public.modifier_options (tenant_id, group_id, name, price_delta, sort_order) values
      (v_tenant, v_group, 'BBQ',              0.00, 1),
      (v_tenant, v_group, 'Mostaza y Miel',   0.00, 2),
      (v_tenant, v_group, 'Queso Parmesano',  0.00, 3),
      (v_tenant, v_group, 'Carolina 🔥',      0.00, 4),
      (v_tenant, v_group, 'Buffalo 🔥🔥',     0.00, 5);
  end loop;

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Tipo de Salsa Adicional', 1, 1, 5) returning id into g_salsa_extra;

  insert into public.modifier_options (tenant_id, group_id, name, price_delta, sort_order) values
    (v_tenant, g_salsa_extra, 'Salsa Cheddar', 0.00, 1),
    (v_tenant, g_salsa_extra, 'Salsa Ranch',   0.00, 2),
    (v_tenant, g_salsa_extra, 'Queso Crema',   0.00, 3);

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Sabor de Gaseosa (Vidrio)', 1, 1, 6) returning id into g_sabor_cola_v;

  insert into public.modifier_options (tenant_id, group_id, name, price_delta, sort_order) values
    (v_tenant, g_sabor_cola_v, 'Coca-Cola',  0.00, 1),
    (v_tenant, g_sabor_cola_v, 'Sprite',     0.00, 2),
    (v_tenant, g_sabor_cola_v, 'Fanta',      0.00, 3),
    (v_tenant, g_sabor_cola_v, 'Inca Kola',  0.00, 4),
    (v_tenant, g_sabor_cola_v, 'Fioravanti', 0.00, 5);

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Sabor de Gaseosa (Plástico)', 1, 1, 7) returning id into g_sabor_cola_p;

  insert into public.modifier_options (tenant_id, group_id, name, price_delta, sort_order) values
    (v_tenant, g_sabor_cola_p, 'Coca-Cola', 0.00, 1),
    (v_tenant, g_sabor_cola_p, 'Sprite',    0.00, 2),
    (v_tenant, g_sabor_cola_p, 'Fanta',     0.00, 3),
    (v_tenant, g_sabor_cola_p, 'Inca Kola', 0.00, 4);

  insert into public.modifier_groups (tenant_id, name, min_select, max_select, sort_order)
  values (v_tenant, 'Sabor de Fuze Tea', 1, 1, 8) returning id into g_sabor_fuze;

  insert into public.modifier_options (tenant_id, group_id, name, price_delta, sort_order) values
    (v_tenant, g_sabor_fuze, 'Fuze Tea Limón',   0.00, 1),
    (v_tenant, g_sabor_fuze, 'Fuze Tea Durazno', 0.00, 2);

  -- Link products to their modifier groups
  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_salsas_2, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and (p.name ilike '6 Alitas%' or p.name ilike 'Promo de Hoy%');

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_salsas_3, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike '12 Alitas%';

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_salsas_4, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike '18 Alitas%';

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_salsas_5, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and (p.name ilike '24 Alitas%' or p.name ilike '30 Alitas%');

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_salsa_extra, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike 'Salsa Cheddar%';

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_sabor_cola_v, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike '%de Vidrio' and p.name not ilike '%Fuze%';

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_sabor_cola_p, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike '%de Plástico';

  insert into public.product_modifier_groups (product_id, group_id, tenant_id, sort_order)
  select p.id, g_sabor_fuze, v_tenant, 1
  from public.products p
  where p.tenant_id = v_tenant and p.name ilike '%Fuze%';
end;
$$;
