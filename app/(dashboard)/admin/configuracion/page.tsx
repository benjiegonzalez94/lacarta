import { Suspense } from "react";
import { Store, Upload } from "lucide-react";
import { updateTenantSettingsAction } from "@/app/(dashboard)/admin/actions";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { getTenantForOwner } from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";

async function AdminConfigContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const tenant = await getTenantForOwner(supabase, user.id);
  if (!tenant) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E11D48]/40 bg-[#201217]">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BrandLogo size="lg" />
              )}
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-zinc-100">
                Mi Perfil de Vendedor
              </h1>
              <p className="mt-0.5 text-xs text-zinc-400">
                Edita el logo de tu negocio, información básica y datos
                bancarios para transferencias.
              </p>
            </div>
          </div>
          <Store className="h-5 w-5 text-[#E11D48]" />
        </div>

        <form action={updateTenantSettingsAction} className="mt-5 space-y-4">
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

          <div className="rounded-xl border border-zinc-800 bg-[#141418] p-3.5">
            <label
              htmlFor="tenant-logo-file-input"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-200"
            >
              <Upload className="h-3.5 w-3.5 text-[#E11D48]" />
              <span>Subir Logo / Foto de Perfil del Local</span>
            </label>
            <input
              id="tenant-logo-file-input"
              name="logoFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-1.5 text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-[#E11D48] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white"
            />
            <input
              name="logoUrl"
              type="url"
              defaultValue={tenant.logo_url ?? ""}
              placeholder="O pega la URL directa del logo (https://...)"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-name-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Nombre del Local *
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
                Eslogan / Especialidad
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
                Teléfono / WhatsApp (Formato +593...) *
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
                htmlFor="tenant-address-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Dirección del Local
              </label>
              <input
                id="tenant-address-input"
                name="address"
                type="text"
                defaultValue={tenant.address ?? ""}
                placeholder="Ej: Av. Principal y Calle Secundaria"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
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
          </div>

          <button
            id="save-tenant-settings-btn"
            type="submit"
            className="w-full rounded-xl bg-[#E11D48] px-4 py-3 text-xs font-black text-white hover:bg-[#BE123C]"
          >
            Guardar Perfil de Vendedor
          </button>
        </form>
      </section>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-400">Cargando perfil...</div>
      }
    >
      <AdminConfigContent />
    </Suspense>
  );
}
