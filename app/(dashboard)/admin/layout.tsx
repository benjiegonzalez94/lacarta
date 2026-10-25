import { Suspense, type ReactNode } from "react";
import { claimPilotTenantAction } from "@/app/(dashboard)/admin/actions";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { getTenantForOwner } from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";

interface AdminLayoutProps {
  children: ReactNode;
}

async function AdminGuard({ children }: AdminLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminLoginForm />;
  }

  const tenant = await getTenantForOwner(supabase, user.id);

  if (!tenant) {
    async function handleClaim() {
      "use server";
      await claimPilotTenantAction();
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] px-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-6 text-center shadow-xl">
          <h1 className="text-lg font-black text-zinc-50">
            Vincular Restaurante a tu Cuenta
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            Has iniciado sesión como{" "}
            <strong className="text-zinc-200">{user.email}</strong>, pero aún no
            tienes un restaurante asignado como propietario (`owner_id`).
          </p>
          <form action={handleClaim} className="mt-5">
            <button
              id="claim-pilot-tenant-btn"
              type="submit"
              className="w-full rounded-xl bg-[#E5A93C] px-4 py-3 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
            >
              Vincular restaurante piloto (Cowiings) a mi cuenta
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F11] text-zinc-50">
      <AdminNav tenant={tenant} userEmail={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] text-sm text-zinc-400">
          Verificando acceso al panel...
        </div>
      }
    >
      <AdminGuard>{children}</AdminGuard>
    </Suspense>
  );
}
