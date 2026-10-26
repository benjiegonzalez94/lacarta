-- =============================================================================
-- Migration: Unified Auth Profiles (Customer & Seller), City/GPS Location
--            Discovery & SaaS Monthly Subscription for Sellers
-- =============================================================================

-- 1. Create public.profiles table for both Customers and Sellers
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer' check (role in ('customer', 'seller')),
  full_name   text not null default '',
  cedula      text,
  phone       text,
  avatar_url  text,
  city        text not null default 'Quito',
  latitude    numeric(10, 7),
  longitude   numeric(10, 7),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_city on public.profiles(city);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Add Location (city, latitude, longitude, google_maps_url) & SaaS Monthly Billing fields to public.tenants
alter table public.tenants
  add column if not exists city text not null default 'Quito',
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists google_maps_url text,
  add column if not exists subscription_plan text not null default 'mensual',
  add column if not exists subscription_status text not null default 'active',
  add column if not exists monthly_fee numeric(10, 2) not null default 15.00,
  add column if not exists subscription_ends_at timestamptz not null default (now() + interval '30 days');

create index if not exists idx_tenants_city on public.tenants(city);

-- 3. Populate default location & SaaS data for pilot tenant Cowiings
update public.tenants
set
  city = coalesce(nullif(city, ''), 'Quito'),
  address = coalesce(nullif(address, ''), 'Av. Amazonas y Naciones Unidas, Sector Iñaquito, Quito'),
  latitude = coalesce(latitude, -0.1761500),
  longitude = coalesce(longitude, -78.4846900),
  subscription_plan = 'mensual',
  subscription_status = 'active',
  monthly_fee = 15.00,
  subscription_ends_at = coalesce(subscription_ends_at, now() + interval '30 days')
where slug = 'cowiings';

-- 4. Ensure existing seller user (admin@cowiings.com) has a profile row
insert into public.profiles (id, role, full_name, cedula, phone, city, latitude, longitude)
select
  u.id,
  'seller',
  'Administrador Cowiings',
  '1712345678',
  '0986214954',
  'Quito',
  -0.1761500,
  -78.4846900
from auth.users u
where u.email = 'admin@cowiings.com'
on conflict (id) do update
set role = 'seller',
    city = coalesce(nullif(public.profiles.city, ''), 'Quito');

-- 5. Seed a demo Customer user (cliente@lacarta.ec / Cliente2026!) if not exists
do $$
declare
  v_customer_id uuid;
begin
  select id into v_customer_id
  from auth.users
  where email = 'cliente@lacarta.ec'
  limit 1;

  if v_customer_id is null then
    v_customer_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_customer_id,
      'authenticated',
      'authenticated',
      'cliente@lacarta.ec',
      extensions.crypt('Cliente2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"customer","full_name":"Cliente Demo"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_customer_id,
      jsonb_build_object(
        'sub', v_customer_id::text,
        'email', 'cliente@lacarta.ec',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_customer_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    cedula,
    phone,
    city,
    latitude,
    longitude
  ) values (
    v_customer_id,
    'customer',
    'Cliente Demo',
    '1723456789',
    '0991234567',
    'Quito',
    -0.1806530,
    -78.4678340
  )
  on conflict (id) do update
  set role = 'customer',
      full_name = excluded.full_name,
      cedula = excluded.cedula,
      phone = excluded.phone,
      city = excluded.city;
end;
$$;
