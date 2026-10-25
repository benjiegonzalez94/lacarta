import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Plus, QrCode, Trash2 } from "lucide-react";
import {
  createTableAction,
  deleteTableAction,
  updateTenantSettingsAction,
} from "@/app/(dashboard)/admin/actions";
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
        <h1 className="text-base font-black uppercase tracking-wider text-zinc-100">
          Datos del Restaurante y WhatsApp
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Configura el nombre comercial, el número receptor de pedidos en
          formato E.164 y la tarifa de envío a domicilio.
        </p>

        <form action={updateTenantSettingsAction} className="mt-5 space-y-4">
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
              Costo de envío a domicilio (USD)
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

          <button
            id="save-tenant-settings-btn"
            type="submit"
            className="w-full rounded-xl bg-[#E5A93C] px-4 py-3 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
          >
            Guardar Configuración
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-zinc-100">
              Mesas y Códigos QR
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Enlaces únicos para que los clientes pidan desde su mesa
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
              Número de mesa
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
            <span>Agregar Mesa</span>
          </button>
        </form>

        <div className="mt-4 space-y-2.5">
          {data.tables.map((table) => {
            const qrPath = `/${tenant.slug}/mesa/${table.qr_token}`;
            return (
              <div
                key={table.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5"
              >
                <div>
                  <span className="text-sm font-bold text-zinc-100">
                    Mesa #{table.table_number}
                  </span>
                  <p className="font-mono text-xs text-zinc-400">{qrPath}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={qrPath}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-[#E5A93C] hover:border-[#E5A93C]"
                  >
                    <span>Probar QR</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>

                  <form action={deleteTableAction}>
                    <input type="hidden" name="tableId" value={table.id} />
                    <button
                      id={`delete-table-${table.id}`}
                      type="submit"
                      aria-label={`Eliminar Mesa ${table.table_number}`}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
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
