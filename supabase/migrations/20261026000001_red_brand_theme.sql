-- Update default brand palette from yellow (#E5A93C) to crimson red (#E11D48)
ALTER TABLE public.tenants
  ALTER COLUMN primary_color SET DEFAULT '#E11D48',
  ALTER COLUMN secondary_color SET DEFAULT '#BE123C';

UPDATE public.tenants
SET primary_color = '#E11D48',
    secondary_color = '#BE123C'
WHERE primary_color = '#E5A93C' OR slug = 'cowiings';
