"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  ExternalLink,
  Flame,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TenantRow } from "@/types/domain";

export interface AdminNavProps {
  tenant: TenantRow;
  userEmail: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen y Pedidos", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos y Categorías", icon: Package },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/configuracion", label: "Configuración y Mesas QR", icon: Settings },
];

export function AdminNav({ tenant, userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-800 bg-[#141417]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5A93C] text-zinc-950">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black uppercase tracking-tight text-zinc-50">
                {tenant.name}
              </span>
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                /{tenant.slug}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sesión: {userEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${tenant.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-[#E5A93C] hover:text-[#E5A93C]"
          >
            <span>Ver Menú Público</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            id="admin-signout-btn"
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#E5A93C] text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
