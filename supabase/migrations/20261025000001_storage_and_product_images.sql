-- =============================================================================
-- Migration: 20261025000001_storage_and_product_images.sql
-- Purpose:
--   1. Create Supabase Storage bucket "product-images" with strict RLS policies
--      (public read; only tenant owners can upload/update/delete under their
--      tenant_id folder prefix).
--   2. Harden public.place_order() with input trimming, length bounds, and
--      safe UUID validation.
--   3. Populate initial product images for pilot tenant "cowiings".
-- =============================================================================

-- 1. Storage bucket for product images ----------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB max
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists product_images_owner_insert on storage.objects;
create policy product_images_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists product_images_owner_update on storage.objects;
create policy product_images_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists product_images_owner_delete on storage.objects;
create policy product_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
  );

-- 2. Harden public.place_order() ----------------------------------------------
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
  v_name      text := nullif(left(btrim(coalesce(p_customer_name, '')), 120), '');
  v_phone     text := nullif(left(btrim(coalesce(p_customer_phone, '')), 30), '');
  v_address   text := nullif(left(btrim(coalesce(p_delivery_address, '')), 300), '');
  v_reference text := nullif(left(btrim(coalesce(p_delivery_reference, '')), 300), '');
  v_notes     text := nullif(left(btrim(coalesce(p_notes, '')), 500), '');
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

    insert into public.order_items (
      order_id, tenant_id, product_id, product_name, unit_price, quantity, line_total, notes
    ) values (
      v_order_id, v_tenant.id, v_product.id, v_product.name, v_product.price,
      v_qty, v_product.price * v_qty, nullif(left(btrim(coalesce(v_item ->> 'notes', '')), 300), '')
    );

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- 3. Populate curated product images for pilot tenant "cowiings" --------------
do $$
declare
  v_tenant uuid;
begin
  select id into v_tenant from public.tenants where slug = 'cowiings';
  if v_tenant is null then
    return;
  end if;

  -- Alitas & Promos
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%6 Alitas%' or name ilike '%Promo%');

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%12 Alitas%' or name ilike '%18 Alitas%');

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%24 Alitas%' or name ilike '%30 Alitas%');

  -- Especiales
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Papipollo%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%Cowiings Premium%' or name ilike '%Explosión%');

  -- Hamburguesas
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Hamburguesa Clásica%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Hamburguesa Tipo 1%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Hamburguesa Tipo 2%';

  -- Salchipapas
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Salchipapa%';

  -- Adicionales
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Papas con Salsa%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Salsa Cheddar%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Huevo%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%Salchichas%' or name ilike '%Carne de Hamburguesa%');

  -- Bebidas & Batidos
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and name ilike '%Batido%';

  update public.products
  set image_url = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%Frozen%' or name ilike '%Fuze%');

  -- Colas
  update public.products
  set image_url = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80'
  where tenant_id = v_tenant and image_url is null and (name ilike '%Vidrio%' or name ilike '%Plástico%');
end;
$$;
