import { redirect } from "next/navigation";
import { CreditCard, Save, Sparkles, Store } from "lucide-react";
import { updateTenantSettingsAction } from "@/app/(dashboard)/admin/actions";
import { SellerLocationFields } from "@/components/admin/SellerLocationFields";
import { getTenantForOwner } from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const tenant = await getTenantForOwner(supabase, user.id);
  if (!tenant) {
    redirect("/admin");
  }

  const renewalDate = tenant.subscription_ends_at
    ? new Date(tenant.subscription_ends_at).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Activo";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-50">
          Perfil de tu Local y Suscripción
        </h1>
        <p className="text-xs text-zinc-400">
          Edita el logo, datos básicos, ciudad, dirección GPS y cuentas
          bancarias de tu negocio.
        </p>
      </div>

      {/* SaaS Monthly Subscription Banner */}
      <section className="rounded-2xl border border-[#E11D48]/35 bg-gradient-to-r from-[#271018] via-[#18181B] to-[#18181B] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FB7185]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Suscripción Mensual LaCarta SaaS</span>
            </div>
            <p className="mt-1 text-sm font-black text-zinc-100">
              Plan Vendedor Activo •{" "}
              {formatCurrency(Number(tenant.monthly_fee ?? 15))} / mes
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Próxima fecha de corte: <strong className="text-zinc-200">{renewalDate}</strong>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Cuenta al día</span>
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
        <form action={updateTenantSettingsAction} className="space-y-4">
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
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-[#121215] p-4 sm:flex-row sm:items-center">
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
            <div className="flex-1 space-y-2">
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
              <input
                type="hidden"
                name="logoUrl"
                value={tenant.logo_url ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cfg-name"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Nombre del Local
              </label>
              <input
                id="cfg-name"
                name="name"
                type="text"
                required
                defaultValue={tenant.name}
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              />
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
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="cfg-phone"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                WhatsApp del Local
              </label>
              <input
                id="cfg-phone"
                name="phone"
                type="text"
                required
                defaultValue={tenant.phone}
                placeholder="+593986214954"
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              />
            </div>
          </div>

          {/* Location, City & GPS "Cómo llegar" */}
          <SellerLocationFields
            tenantName={tenant.name}
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

          <div>
            <label
              htmlFor="cfg-bank-details"
              className="mb-1 block text-xs font-semibold text-zinc-400"
            >
              Datos Bancarios para Pagos por Transferencia
            </label>
            <textarea
              id="cfg-bank-details"
              name="bankDetails"
              rows={3}
              defaultValue={tenant.bank_details ?? ""}
              placeholder="Ej: Banco Pichincha • Cta Ahorros: 2201234567 • Nombre: Cowiings • RUC/CI: 1712345678001"
              className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <button
            id="save-settings-btn"
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-3 text-xs font-black text-white hover:bg-[#BE123C]"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Perfil del Local</span>
          </button>
        </form>
      </section>
    </div>
  );
}
