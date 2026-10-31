import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAllTenants, getTenantForOwner } from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/types/domain";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // 1. Role Security Check: Customers are strictly forbidden from accessing /admin
  if (profile?.role === "customer") {
    async function handleSignOut() {
      "use server";
      const client = await createClient();
      await client.auth.signOut();
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#18181B] p-6 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-black text-zinc-50">
            Acceso Restringido
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            Tu cuenta está registrada como <strong className="text-zinc-200">Cliente</strong> ({user.email}).
            El panel administrativo está reservado para propietarios de locales y el equipo de administración de LaCarta.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="rounded-xl bg-[#E11D48] px-4 py-2.5 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              Ir al Menú y Restaurantes
            </Link>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. Platform Superadmin Check & Multi-Tenant Resolution
  const isSuperAdmin = profile?.role === "admin";
  let tenant: TenantRow | null = null;
  let allTenants: TenantRow[] = [];

  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get("active_admin_tenant_id")?.value;

  if (isSuperAdmin) {
    allTenants = await getAllTenants(supabase);
    tenant =
      (activeTenantId
        ? allTenants.find((t) => t.id === activeTenantId)
        : null) ??
      allTenants[0] ??
      null;
  } else {
    tenant = await getTenantForOwner(supabase, user.id);
  }

  // 3. Seller has no tenant registered yet
  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] px-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-6 text-center shadow-xl">
          <h1 className="text-lg font-black text-zinc-50">
            Restaurante no configurado
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            Has iniciado sesión con tu cuenta de vendedor (
            <strong className="text-zinc-200">{user.email}</strong>), pero aún no has registrado los datos de tu local.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-block w-full rounded-xl bg-[#E11D48] px-4 py-3 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              Completar Registro en LaCarta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F11] text-zinc-50">
      <AdminNav
        tenant={tenant}
        userEmail={user.email ?? ""}
        isSuperAdmin={isSuperAdmin}
        allTenants={allTenants}
      />
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
