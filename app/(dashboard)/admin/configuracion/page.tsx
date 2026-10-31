import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CreditCard, Sparkles } from "lucide-react";
import { SellerSettingsForm } from "@/components/admin/SellerSettingsForm";
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

  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get("active_admin_tenant_id")?.value;
  const tenant = await getTenantForOwner(supabase, user.id, activeTenantId);
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
          Perfil de tu Sucursal y Métodos de Cobro
        </h1>
        <p className="text-xs text-zinc-400">
          Configura el distintivo de tu sucursal, ciudad, ubicación GPS, y las
          formas de pago que aceptas (efectivo, transferencia y tarjeta).
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
              Próxima fecha de corte:{" "}
              <strong className="text-zinc-200">{renewalDate}</strong>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Cuenta al día</span>
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
        <SellerSettingsForm tenant={tenant} />
      </section>
    </div>
  );
}
