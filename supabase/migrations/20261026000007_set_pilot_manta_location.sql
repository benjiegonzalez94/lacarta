-- Migration: 20261026000007_set_pilot_manta_location.sql
-- Set pilot tenant (Cowiings) and pilot accounts to Manta, Manabí, Ecuador

UPDATE public.tenants
SET
  city = 'Manta',
  branch_name = 'Sucursal Manta',
  address = 'Av. Flavio Reyes y Calle 20, Manta, Manabí',
  latitude = -0.967653,
  longitude = -80.70891
WHERE slug = 'cowiings';

UPDATE public.profiles
SET
  city = 'Manta',
  latitude = -0.967653,
  longitude = -80.70891
WHERE role = 'seller' OR role = 'customer';
