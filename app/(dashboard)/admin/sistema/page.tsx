import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { SuperadminDashboardClient } from "@/components/admin/superadmin/SuperadminDashboardClient";
import { getSuperadminDashboardData } from "@/lib/services/superadmin.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Superadmin & Soporte — LaCarta Dev Team",
  description:
    "Control global de la plataforma, métricas SaaS, gestión de suscripciones de vendedores y herramientas de soporte al cliente.",
};

async function SuperadminPageContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#18181B] p-6 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-black text-zinc-50">
            Acceso Exclusivo de Superadmin
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            Esta sección está reservada para el equipo de desarrollo y soporte
            de la plataforma LaCarta.
          </p>
          <div className="mt-5">
            <Link
              href="/admin"
              className="inline-block w-full rounded-xl bg-[#E11D48] px-4 py-2.5 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              Volver a Pedidos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = await getSuperadminDashboardData(supabase);

  return <SuperadminDashboardClient initialData={data} />;
}

export default function SuperadminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-xs font-bold text-zinc-500">
          Cargando métricas y datos del sistema...
        </div>
      }
    >
      <SuperadminPageContent />
    </Suspense>
  );
}

