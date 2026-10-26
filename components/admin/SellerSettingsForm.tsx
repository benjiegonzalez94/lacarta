"use client";

import { useState } from "react";
import {
  Banknote,
  CreditCard,
  Landmark,
  Save,
  ShieldCheck,
  Store,
} from "lucide-react";
import { updateTenantSettingsAction } from "@/app/(dashboard)/admin/actions";
import { SellerLocationFields } from "@/components/admin/SellerLocationFields";
import type { TenantRow } from "@/types/domain";

export interface SellerSettingsFormProps {
  tenant: TenantRow;
}

export function SellerSettingsForm({ tenant }: SellerSettingsFormProps) {
  const [cashEnabled, setCashEnabled] = useState(
    tenant.cash_payments_enabled ?? true
  );
  const [transferEnabled, setTransferEnabled] = useState(
    tenant.transfer_payments_enabled ?? true
  );
  const [cardEnabled, setCardEnabled] = useState(
    tenant.card_payments_enabled ?? false
  );

  return (
    <form action={updateTenantSettingsAction} className="space-y-5">
      <input type="hidden" name="deliveryFee" value="0" />
      <input
        type="hidden"
        name="primaryColor"
        value={tenant.primary_color || "#E11D48"}
      />
      <input
        type="hidden"
        name="secondaryColor"
        value={tenant.secondary_color || "#BE123C"}
      />
      <input
        type="hidden"
        name="bannerUrl"
        value={tenant.banner_url ?? ""}
      />

      {/* Logo / Avatar Section */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#121215] p-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#E11D48] bg-zinc-900">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Store className="h-7 w-7 text-[#E11D48]" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="cfg-logo-file"
            className="block text-xs font-bold text-zinc-200"
          >
            Logo del Local / Foto de Perfil
          </label>
          <input
            id="cfg-logo-file"
            name="logoFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="w-full rounded-xl border border-zinc-700 bg-[#18181B] px-3 py-2 text-xs text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-[#E11D48] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          <input type="hidden" name="logoUrl" value={tenant.logo_url ?? ""} />
        </div>
      </div>

      {/* Brand & Branch Identity */}
      <div className="space-y-3.5 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-300">
          Identidad de la Marca y Sucursal
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cfg-name"
              className="mb-1 block text-xs font-semibold text-zinc-400"
            >
              Nombre de la Marca / Restaurante
            </label>
            <input
              id="cfg-name"
              name="name"
              type="text"
              required
              defaultValue={tenant.name}
              placeholder="Ej. Cowiings"
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-branch-name"
              className="mb-1 block text-xs font-semibold text-zinc-400"
            >
              Distintivo de Sucursal / Sector
            </label>
            <input
              id="cfg-branch-name"
              name="branchName"
              type="text"
              required
              defaultValue={tenant.branch_name || "Matriz Principal"}
              placeholder="Ej. Sucursal Iñaquito, Matriz Norte"
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Permite a los clientes identificar esta sucursal exacta en tu ciudad.
            </p>
          </div>

          <div>
            <label
              htmlFor="cfg-slogan"
              className="mb-1 block text-xs font-semibold text-zinc-400"
            >
              Eslogan corto
            </label>
            <input
              id="cfg-slogan"
              name="slogan"
              type="text"
              defaultValue={tenant.slogan ?? "Arte en Sabor"}
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-phone"
              className="mb-1 block text-xs font-semibold text-zinc-400"
            >
              WhatsApp de esta Sucursal
            </label>
            <input
              id="cfg-phone"
              name="phone"
              type="text"
              required
              defaultValue={tenant.phone}
              placeholder="+593986214954"
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Location, City & GPS "Cómo llegar" */}
      <SellerLocationFields
        tenantName={`${tenant.name} (${tenant.branch_name || "Matriz"})`}
        initialCity={tenant.city || "Quito"}
        initialAddress={tenant.address ?? ""}
        initialLatitude={
          tenant.latitude !== null ? Number(tenant.latitude) : null
        }
        initialLongitude={
          tenant.longitude !== null ? Number(tenant.longitude) : null
        }
        initialGoogleMapsUrl={tenant.google_maps_url ?? ""}
      />

      {/* Payment Methods Configuration */}
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200">
            Formas de Pago Habilitadas en esta Sucursal
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Elige los métodos que permites a tus clientes para pagar en tu local.
          </p>
        </div>

        <div className="space-y-3">
          {/* Method 1: Cash at counter */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-[#18181B] p-3 hover:border-zinc-700">
            <input
              id="cfg-cash-enabled"
              type="checkbox"
              name="cashPaymentsEnabled"
              checked={cashEnabled}
              onChange={(e) => setCashEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-[#E11D48]"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                <Banknote className="h-4 w-4 text-emerald-400" />
                <span>Efectivo en Barra al Retirar</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                El cliente hace su pedido y paga en efectivo al acercarse a la barra a retirar su comida.
              </p>
            </div>
          </label>

          {/* Method 2: Bank Transfer */}
          <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="cfg-transfer-enabled"
                type="checkbox"
                name="transferPaymentsEnabled"
                checked={transferEnabled}
                onChange={(e) => setTransferEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-[#E11D48]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                  <Landmark className="h-4 w-4 text-[#FB7185]" />
                  <span>Transferencia Bancaria con Comprobante</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  El cliente transfiere el valor exacto del pedido y adjunta el comprobante antes de confirmarlo.
                </p>
              </div>
            </label>

            {transferEnabled ? (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <label
                  htmlFor="cfg-bank-details"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Datos Bancarios para Transferencias de esta Sucursal
                </label>
                <textarea
                  id="cfg-bank-details"
                  name="bankDetails"
                  rows={3}
                  required={transferEnabled}
                  defaultValue={tenant.bank_details ?? ""}
                  placeholder="Ej: Banco Pichincha • Cuenta de Ahorros: 2201234567 • Titular: Cowiings Ecuador • RUC: 1712345678001 • Correo: pagos@cowiings.com"
                  className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  El cliente verá estos datos en la pantalla de pago junto con el total exacto.
                </p>
              </div>
            ) : null}
          </div>

          {/* Method 3: Direct In-App Card */}
          <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="cfg-card-enabled"
                type="checkbox"
                name="cardPaymentsEnabled"
                checked={cardEnabled}
                onChange={(e) => setCardEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-[#E11D48]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                  <span>Pago Directo con Tarjeta en la App (Opcional)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Tus clientes pagan al instante con sus tarjetas guardadas en LaCarta. El dinero se acredita a tu cuenta comercial.
                </p>
              </div>
            </label>

            {cardEnabled ? (
              <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5 text-xs text-violet-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4 text-violet-300" />
                    <span>Configuración de Pasarela y Liquidación Directa</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    Los cobros con tarjeta se procesan tokenizados. Ingresa tu ID de comercio o cuenta para dispersión automática.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="cfg-card-gateway"
                      className="mb-1 block text-[11px] font-semibold text-zinc-400"
                    >
                      Pasarela de Pago
                    </label>
                    <select
                      id="cfg-card-gateway"
                      name="cardGateway"
                      defaultValue={tenant.card_gateway || "payphone"}
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                    >
                      <option value="payphone">PayPhone Business (Ecuador)</option>
                      <option value="kushki">Kushki Pagos (Ecuador)</option>
                      <option value="datafast">Datafast / Dataweb</option>
                      <option value="nuvei">Nuvei / Paymentez</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-card-merchant-id"
                      className="mb-1 block text-[11px] font-semibold text-zinc-400"
                    >
                      ID de Comercio / App Token
                    </label>
                    <input
                      id="cfg-card-merchant-id"
                      name="cardMerchantId"
                      type="text"
                      defaultValue={tenant.card_merchant_id ?? ""}
                      placeholder="Ej. PP-EC-994821"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="cfg-settlement-bank"
                      className="mb-1 block text-[11px] font-semibold text-zinc-400"
                    >
                      Banco para Liquidación
                    </label>
                    <input
                      id="cfg-settlement-bank"
                      name="settlementBankName"
                      type="text"
                      defaultValue={tenant.settlement_bank_name ?? ""}
                      placeholder="Banco Pichincha / Guayaquil"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-settlement-type"
                      className="mb-1 block text-[11px] font-semibold text-zinc-400"
                    >
                      Tipo de Cuenta
                    </label>
                    <select
                      id="cfg-settlement-type"
                      name="settlementAccountType"
                      defaultValue={tenant.settlement_account_type || "Ahorros"}
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-settlement-account"
                      className="mb-1 block text-[11px] font-semibold text-zinc-400"
                    >
                      Número de Cuenta
                    </label>
                    <input
                      id="cfg-settlement-account"
                      name="settlementAccountNumber"
                      type="text"
                      defaultValue={tenant.settlement_account_number ?? ""}
                      placeholder="2201234567"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        id="save-settings-btn"
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[#E11D48]/25 hover:bg-[#BE123C]"
      >
        <Save className="h-4 w-4" />
        <span>Guardar Perfil y Formas de Pago</span>
      </button>
    </form>
  );
}
