-- Migration: 20261031000001_roles_security_and_superadmin.sql
-- Description: Implement strictly verified RBAC (customer, seller, admin),
--              prevent privilege escalation via DB triggers, and seed platform superadmin.

-- 1. Update constraint on public.profiles.role to include 'admin'
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'seller', 'admin'));

-- 2. Define is_admin using JWT and fallback
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from public.profiles p
      where p.id = p_user_id
        and p.role = 'admin'
    )
  );
$$;

-- 3. Update is_tenant_owner to grant access to tenant owners AND platform superadmins
create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and (
        t.owner_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  );
$$;

-- 4. Trigger to prevent privilege escalation / role tampering from unprivileged clients
create or replace function public.prevent_profile_role_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (NEW.role is distinct from OLD.role) then
    -- Allow only service_role (internal backend Server Actions) or existing platform superadmins
    if (auth.jwt() ->> 'role') = 'service_role' or public.is_admin(auth.uid()) then
      return NEW;
    end if;
    raise exception 'Violación de seguridad: No tienes permisos para modificar el rol de usuario.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_profile_role_tampering on public.profiles;
create trigger trg_prevent_profile_role_tampering
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_tampering();

-- 5. Update profiles RLS policies: users can read own profile, superadmins can read all profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 6. Update tenants RLS: superadmins can update all tenants
drop policy if exists "tenants_owner_update" on public.tenants;
create policy "tenants_owner_update"
  on public.tenants
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin(auth.uid())
  )
  with check (
    owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- 7. Seed platform Superadmin account (admin@lacarta.ec / AdminLaCarta2026!) if not exists
do $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id from auth.users where email = 'admin@lacarta.ec';

  if v_admin_id is null then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@lacarta.ec',
      crypt('AdminLaCarta2026!', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","full_name":"Super Administrador LaCarta"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_admin_id::text,
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@lacarta.ec', 'email_verified', true, 'phone_verified', false),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = crypt('AdminLaCarta2026!', gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = '{"role":"admin","full_name":"Super Administrador LaCarta"}'::jsonb,
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = ''
    where id = v_admin_id;
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    cedula,
    phone,
    city,
    latitude,
    longitude,
    created_at,
    updated_at
  ) values (
    v_admin_id,
    'admin',
    'Super Administrador LaCarta',
    '1710034065',
    '0999999999',
    'Manta',
    -0.967653,
    -80.70891,
    now(),
    now()
  )
  on conflict (id) do update
  set role = 'admin',
      full_name = 'Super Administrador LaCarta',
      city = 'Manta',
      updated_at = now();
end $$;
