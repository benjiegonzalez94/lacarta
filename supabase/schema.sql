-- =============================================================================
-- LaCarta — Multi-tenant schema (PostgreSQL / Supabase)
-- =============================================================================
-- Isolation model: shared schema, every business row carries tenant_id.
-- Public (anon) can read menu data; only the authenticated tenant owner can
-- modify it. Public orders are created exclusively through the
-- public.place_order() function, which recomputes prices server-side.
-- Run order: schema.sql -> seed.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name          text not null check (char_length(name) between 1 and 120),
  phone         text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'), -- E.164, used for wa.me
  logo_url      text,
  delivery_fee  numeric(10,2) not null default 0 check (delivery_fee >= 0),
  owner_id      uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index tenants_owner_id_idx on public.tenants (owner_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id) -- target for composite FK (prevents cross-tenant links)
);

create index categories_tenant_sort_idx on public.categories (tenant_id, sort_order);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  category_id   uuid not null,
  name          text not null check (char_length(name) between 1 and 120),
  description   text check (char_length(description) <= 500),
  price         numeric(10,2) not null check (price >= 0),
  image_url     text,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  foreign key (category_id, tenant_id)
    references public.categories (id, tenant_id) on delete cascade
);

create index products_tenant_category_idx on public.products (tenant_id, category_id, sort_order);

create table public.tables (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  table_number  integer not null check (table_number > 0),
  -- Unguessable token printed in the QR: /{slug}/mesa/{qr_token}
  qr_token      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at    timestamptz not null default now(),
  unique (tenant_id, table_number),
  unique (id, tenant_id)
);

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  order_type          text not null check (order_type in ('delivery', 'pickup', 'dine_in')),
  table_id            uuid,
  customer_name       text check (char_length(customer_name) <= 120),
  customer_phone      text check (char_length(customer_phone) <= 30),
  delivery_address    text check (char_length(delivery_address) <= 300),
  delivery_reference  text check (char_length(delivery_reference) <= 300),
  notes               text check (char_length(notes) <= 500),
  subtotal            numeric(10,2) not null default 0 check (subtotal >= 0),
  delivery_fee        numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total               numeric(10,2) not null default 0 check (total >= 0),
  status              text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')),
  created_at          timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (table_id, tenant_id) references public.tables (id, tenant_id) on delete set null (table_id),
  check (order_type <> 'dine_in' or table_id is not null),
  check (order_type <> 'delivery' or delivery_address is not null)
);

create index orders_tenant_created_idx on public.orders (tenant_id, created_at desc);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null,
  tenant_id     uuid not null,
  product_id    uuid references public.products (id) on delete set null,
  product_name  text not null,          -- snapshot at order time (audit)
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity between 1 and 50),
  line_total    numeric(10,2) not null check (line_total >= 0),
  notes         text check (char_length(notes) <= 300), -- e.g. selected sauces / flavor
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_tenant_idx on public.order_items (tenant_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.owner_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.tenants     enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.tables      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- tenants: public read (resolved by slug in the app), owner can update.
-- Creation/deletion of tenants is done server-side with the service role.
create policy tenants_public_read on public.tenants
  for select to anon, authenticated using (true);

create policy tenants_owner_update on public.tenants
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- categories: public read, owner writes.
create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);

create policy categories_owner_insert on public.categories
  for insert to authenticated with check (public.is_tenant_owner(tenant_id));
create policy categories_owner_update on public.categories
  for update to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));
create policy categories_owner_delete on public.categories
  for delete to authenticated using (public.is_tenant_owner(tenant_id));

-- products: public sees available products; owner sees all and writes.
create policy products_read on public.products
  for select to anon, authenticated
  using (is_available or public.is_tenant_owner(tenant_id));

create policy products_owner_insert on public.products
  for insert to authenticated with check (public.is_tenant_owner(tenant_id));
create policy products_owner_update on public.products
  for update to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));
create policy products_owner_delete on public.products
  for delete to authenticated using (public.is_tenant_owner(tenant_id));

-- tables: owner only (public resolves a QR via public.resolve_table()).
create policy tables_owner_all on public.tables
  for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- orders / order_items: owner reads and updates status. No direct public
-- inserts (use public.place_order). No deletes: kept for audit.
create policy orders_owner_read on public.orders
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy orders_owner_update on public.orders
  for update to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create policy order_items_owner_read on public.order_items
  for select to authenticated using (public.is_tenant_owner(tenant_id));

-- -----------------------------------------------------------------------------
-- Public RPCs
-- -----------------------------------------------------------------------------

-- Resolves a QR token for a given tenant slug. Returns no rows if invalid.
create or replace function public.resolve_table(p_slug text, p_qr_token text)
returns table (table_id uuid, table_number integer)
language sql
stable
security definer
set search_path = ''
as $$
  select tb.id, tb.table_number
  from public.tables tb
  join public.tenants t on t.id = tb.tenant_id
  where t.slug = p_slug and tb.qr_token = p_qr_token;
$$;

-- Creates an order. Prices come from the DB, never from the client.
-- p_items: [{ "product_id": uuid, "quantity": int, "notes": text|null }, ...]
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
  v_tenant    public.tenants%rowtype;
  v_table_id  uuid;
  v_order_id  uuid;
  v_item      jsonb;
  v_product   public.products%rowtype;
  v_qty       integer;
  v_subtotal  numeric(10,2) := 0;
  v_fee       numeric(10,2) := 0;
begin
  select * into v_tenant from public.tenants where slug = p_slug;
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
    where tb.tenant_id = v_tenant.id and tb.qr_token = p_table_token;
    if v_table_id is null then
      raise exception 'TABLE_NOT_FOUND';
    end if;
  else
    if coalesce(btrim(p_customer_name), '') = '' or coalesce(btrim(p_customer_phone), '') = '' then
      raise exception 'CUSTOMER_REQUIRED';
    end if;
    if p_order_type = 'delivery' and coalesce(btrim(p_delivery_address), '') = '' then
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
    v_tenant.id, p_order_type, v_table_id, p_customer_name, p_customer_phone,
    case when p_order_type = 'delivery' then p_delivery_address end,
    case when p_order_type = 'delivery' then p_delivery_reference end,
    p_notes
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

    insert into public.order_items (
      order_id, tenant_id, product_id, product_name, unit_price, quantity, line_total, notes
    ) values (
      v_order_id, v_tenant.id, v_product.id, v_product.name, v_product.price,
      v_qty, v_product.price * v_qty, left(v_item ->> 'notes', 300)
    );

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------

revoke all on function public.is_tenant_owner(uuid) from public;
revoke all on function public.resolve_table(text, text) from public;
revoke all on function public.place_order(text, text, jsonb, text, text, text, text, text, text) from public;

grant execute on function public.is_tenant_owner(uuid) to anon, authenticated;
grant execute on function public.resolve_table(text, text) to anon, authenticated;
grant execute on function public.place_order(text, text, jsonb, text, text, text, text, text, text) to anon, authenticated;
