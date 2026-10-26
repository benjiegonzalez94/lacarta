-- =============================================================================
-- Migration: Flexible Payment Methods per Tenant (Cash, Transfer, Card)
-- =============================================================================

alter table public.tenants
  add column if not exists cash_payments_enabled boolean not null default true,
  add column if not exists transfer_payments_enabled boolean not null default true;

update public.tenants
set
  cash_payments_enabled = coalesce(cash_payments_enabled, true),
  transfer_payments_enabled = coalesce(transfer_payments_enabled, true)
where cash_payments_enabled is null or transfer_payments_enabled is null;
