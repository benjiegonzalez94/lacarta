-- =============================================================================
-- LaCarta — Seed: pilot tenant "Cowiings"
-- =============================================================================
-- Requires supabase/schema.sql to be applied first.
-- Source: menu photos in referencias/ (names, prices and descriptions are
-- transcribed literally from the printed menu).
-- Idempotent: if the slug already exists, nothing is inserted.
--
-- PENDING CONFIRMATION WITH THE RESTAURANT:
--   * delivery_fee: not printed on the menu -> seeded as 0.00.
--   * phone: menu shows 0986482003; stored in E.164 assuming Ecuador (+593).
--   * Tables (mesas): number of tables unknown -> none seeded.
--   * owner_id: assign after creating the owner's auth user (see bottom).
-- =============================================================================

do $$
declare
  v_tenant      uuid;
  c_promos      uuid;
  c_alitas      uuid;
  c_especiales  uuid;
  c_burgers     uuid;
  c_salchipapas uuid;
  c_adicionales uuid;
  c_bebidas     uuid;
  c_colas       uuid;
  v_sauces      constant text := '(BBQ, Mostaza y miel, Queso parmesano, Carolina 🔥, Buffalo 🔥🔥)';
begin
  if exists (select 1 from public.tenants where slug = 'cowiings') then
    raise notice 'Tenant "cowiings" already exists; seed skipped.';
    return;
  end if;

  insert into public.tenants (slug, name, phone, logo_url, delivery_fee)
  values ('cowiings', 'Cowiings', '+593986482003', null, 0.00)
  returning id into v_tenant;

  -- Categories -----------------------------------------------------------------
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Promociones', 0)  returning id into c_promos;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Alitas', 1)       returning id into c_alitas;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Especiales', 2)   returning id into c_especiales;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Hamburguesas', 3) returning id into c_burgers;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Salchipapas', 4)  returning id into c_salchipapas;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Adicionales', 5)  returning id into c_adicionales;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Bebidas', 6)      returning id into c_bebidas;
  insert into public.categories (tenant_id, name, sort_order) values (v_tenant, 'Colas', 7)        returning id into c_colas;

  -- Products -------------------------------------------------------------------
  insert into public.products (tenant_id, category_id, name, description, price, is_available, sort_order) values
    -- Promociones ("Promo de hoy" flyer: daily promo, disabled by default)
    (v_tenant, c_promos, 'Promo de Hoy: 10 Alitas', '10 alitas por $5. ¡2 sabores a elegir!', 5.00, false, 1),

    -- Alitas (all include a portion of fries)
    (v_tenant, c_alitas, '6 Alitas + Porción de Papas',  '2 salsas a elección ' || v_sauces, 5.00,  true, 1),
    (v_tenant, c_alitas, '12 Alitas + Porción de Papas', '3 salsas a elección ' || v_sauces, 9.00,  true, 2),
    (v_tenant, c_alitas, '18 Alitas + Porción de Papas', '4 salsas a elección ' || v_sauces, 13.00, true, 3),
    (v_tenant, c_alitas, '24 Alitas + Porción de Papas', '5 salsas a elección ' || v_sauces, 17.00, true, 4),
    (v_tenant, c_alitas, '30 Alitas + Porción de Papas', '5 salsas a elección ' || v_sauces, 22.00, true, 5),

    -- Especiales
    (v_tenant, c_especiales, 'Papipollo',          'Presa de pollo, porción de papas, salsa cheddar y queso rallado.', 3.00, true, 1),
    (v_tenant, c_especiales, 'Cowiings Premium',   'Chorizo paisa, panceta ahumada, pico de gallo, crema de queso de la casa y papas.', 5.00, true, 2),
    (v_tenant, c_especiales, 'Explosión Cowiings', 'Chorizo paisa, carne picada, huevo, salsa cheddar, queso rallado y papas.', 4.00, true, 3),

    -- Hamburguesas
    (v_tenant, c_burgers, 'Hamburguesa Clásica', 'Carne de res, tomate, lechuga y salsa mil islas.', 1.50, true, 1),
    (v_tenant, c_burgers, 'Hamburguesa Tipo 1',  'Carne de res, tomate, lechuga, salsa mil islas, queso cheddar y huevo.', 2.00, true, 2),
    (v_tenant, c_burgers, 'Hamburguesa Tipo 2',  'Carne de res, tomate, lechuga, salsa mil islas, queso cheddar, huevo y porción de papas.', 2.50, true, 3),

    -- Salchipapas
    (v_tenant, c_salchipapas, 'Salchipapa Tipo 1', 'Papas con salchichas plumrose, salsa cheddar y queso rallado.', 2.00, true, 1),
    (v_tenant, c_salchipapas, 'Salchipapa Tipo 2', 'Papas con salchichas plumrose, huevo frito, salsa cheddar y queso rallado.', 2.50, true, 2),
    (v_tenant, c_salchipapas, 'Salchipapa Kids',   '5 deditos de pollo, porción de papas, salsa cheddar y queso rallado.', 2.75, true, 3),

    -- Adicionales
    (v_tenant, c_adicionales, 'Salsa Cheddar / Ranch / Queso Crema', null, 0.50, true, 1),
    (v_tenant, c_adicionales, 'Huevo',                null, 0.50, true, 2),
    (v_tenant, c_adicionales, 'Salchichas',           null, 0.75, true, 3),
    (v_tenant, c_adicionales, 'Carne de Hamburguesa', null, 0.75, true, 4),
    (v_tenant, c_adicionales, 'Porción de Papas con Salsa Cheddar y Queso Rallado', null, 1.50, true, 5),

    -- Bebidas (Batidos, Frozen, Jugos)
    (v_tenant, c_bebidas, 'Batido de Oreo',      null, 2.00, true, 1),
    (v_tenant, c_bebidas, 'Batido de Frutilla',  null, 2.00, true, 2),
    (v_tenant, c_bebidas, 'Batido de Mora',      null, 2.00, true, 3),
    (v_tenant, c_bebidas, 'Batido de Aguacate',  null, 2.00, true, 4),
    (v_tenant, c_bebidas, 'Batido de Durazno',   null, 2.00, true, 5),
    (v_tenant, c_bebidas, 'Frozen de Maracuyá',  null, 1.75, true, 6),
    (v_tenant, c_bebidas, 'Frozen de Mora',      null, 1.75, true, 7),
    (v_tenant, c_bebidas, 'Fuze Tea de Vidrio',  null, 0.50, true, 8),

    -- Colas (flavor is chosen via order item notes)
    (v_tenant, c_colas, 'Personal de Vidrio',   'Coca-Cola, Sprite, Fanta, Inca, Fiora.', 0.50, true, 1),
    (v_tenant, c_colas, 'Personal de Plástico', 'Coca-Cola, Sprite, Fanta, Inca.',        0.50, true, 2),
    (v_tenant, c_colas, 'Litro de Vidrio',      'Coca-Cola, Sprite, Fanta, Inca, Fiora.', 1.25, true, 3),
    (v_tenant, c_colas, 'Litro de Plástico',    'Coca-Cola, Sprite, Inca, Fanta.',        1.50, true, 4);

  raise notice 'Tenant "cowiings" seeded with id %', v_tenant;
end;
$$;

-- -----------------------------------------------------------------------------
-- After creating the owner's account in Supabase Auth, link it:
--
--   update public.tenants
--   set owner_id = (select id from auth.users where email = 'OWNER_EMAIL')
--   where slug = 'cowiings';
-- -----------------------------------------------------------------------------
