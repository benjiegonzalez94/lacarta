import { Suspense } from "react";
import { Palette, Plus, QrCode } from "lucide-react";
import {
  createTableAction,
  updateTenantSettingsAction,
} from "@/app/(dashboard)/admin/actions";
import { AdminTableQrCard } from "@/components/admin/AdminTableQrCard";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";

async function AdminConfigContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const tenant = await getTenantForOwner(supabase, user.id);
  if (!tenant) return null;

  const data = await getAdminDashboardData(supabase, tenant);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-zinc-100">
              Perfil del Vendedor, Datos Bancarios y Marca
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Configura tu nombre comercial, WhatsApp receptor (E.164), datos
              bancarios para transferencias, tarifa base de envío y colores.
            </p>
          </div>
          <Palette className="h-6 w-6 text-[#E5A93C]" />
        </div>

        <form action={updateTenantSettingsAction} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-name-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Nombre del Restaurante
              </label>
              <input
                id="tenant-name-input"
                name="name"
                type="text"
                required
                defaultValue={tenant.name}
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-slogan-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Eslogan / Subtítulo comercial
              </label>
              <input
                id="tenant-slogan-input"
                name="slogan"
                type="text"
                defaultValue={tenant.slogan ?? ""}
                placeholder="Ej: Arte en Sabor"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-phone-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                WhatsApp receptor (Formato E.164)
              </label>
              <input
                id="tenant-phone-input"
                name="phone"
                type="text"
                required
                defaultValue={tenant.phone}
                placeholder="+593986482003"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-delivery-fee-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Envío base / referencial (USD)
              </label>
              <input
                id="tenant-delivery-fee-input"
                name="deliveryFee"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={Number(tenant.delivery_fee)}
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tenant-address-input"
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Dirección del Local (para Retiros y Referencia)
            </label>
            <input
              id="tenant-address-input"
              name="address"
              type="text"
              defaultValue={tenant.address ?? ""}
              placeholder="Ej: Av. Principal y Calle Secundaria, frente al parque"
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="tenant-bank-details-input"
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Datos Bancarios para Pagos por Transferencia
            </label>
            <textarea
              id="tenant-bank-details-input"
              name="bankDetails"
              rows={3}
              defaultValue={tenant.bank_details ?? ""}
              placeholder="Ej: Banco Pichincha - Cuenta Ahorros #2200112233 - Titular: Juan Pérez - CI: 0912345678"
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-xs leading-relaxed text-zinc-100"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Se mostrará al cliente cuando elija Transferencia y se incluirá en
              tu botón de respuesta rápida por WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-primary-color-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Color Primario (Hexadecimal)
              </label>
              <input
                id="tenant-primary-color-input"
                name="primaryColor"
                type="text"
                required
                pattern="^#[0-9A-Fa-f]{6}$"
                defaultValue={tenant.primary_color || "#E5A93C"}
                placeholder="#E5A93C"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 font-mono text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-secondary-color-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Color Secundario (Hexadecimal)
              </label>
              <input
                id="tenant-secondary-color-input"
                name="secondaryColor"
                type="text"
                required
                pattern="^#[0-9A-Fa-f]{6}$"
                defaultValue={tenant.secondary_color || "#CA8A04"}
                placeholder="#CA8A04"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 font-mono text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-logo-url-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                URL del Logo (opcional)
              </label>
              <input
                id="tenant-logo-url-input"
                name="logoUrl"
                type="url"
                defaultValue={tenant.logo_url ?? ""}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-banner-url-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                URL del Banner (opcional)
              </label>
              <input
                id="tenant-banner-url-input"
                name="bannerUrl"
                type="url"
                defaultValue={tenant.banner_url ?? ""}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <button
            id="save-tenant-settings-btn"
            type="submit"
            className="w-full rounded-xl bg-[#E5A93C] px-4 py-3 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
          >
            Guardar Perfil y Datos Bancarios
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-zinc-100">
              Tableros QR para Mesas Físicas
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Genera e imprime el código QR de cada mesa para que tus clientes
              lo escaneen con LaCarta al sentarse y pidan directo a cocina.
            </p>
          </div>
          <QrCode className="h-6 w-6 text-[#E5A93C]" />
        </div>

        <form
          action={createTableAction}
          className="mt-4 flex items-end gap-2 border-b border-zinc-800 pb-4"
        >
          <div className="flex-1">
            <label
              htmlFor="new-table-number-input"
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Número de mesa física
            </label>
            <input
              id="new-table-number-input"
              name="tableNumber"
              type="number"
              min="1"
              required
              defaultValue={data.tables.length + 1}
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <button
            id="create-table-qr-btn"
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5A93C] px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
          >
            <Plus className="h-4 w-4" />
            <span>Generar Mesa QR</span>
          </button>
        </form>

        <div className="mt-4 space-y-2.5">
          {data.tables.map((table) => (
            <AdminTableQrCard
              key={table.id}
              tenantSlug={tenant.slug}
              tenantName={tenant.name}
              table={table}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-400">Cargando configuración...</div>
      }
    >
      <AdminConfigContent />
    </Suspense>
  );
}
