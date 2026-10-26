"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
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
  { href: "/admin/productos", label: "Productos y Carta", icon: Package },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/configuracion", label: "Perfil, Pagos y QR", icon: Settings },
];

export function AdminNav({ tenant, userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [copiedMenuLink, setCopiedMenuLink] = useState(false);

  const publicMenuUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${tenant.slug}`
      : `https://lacartaec.vercel.app/${tenant.slug}`;

  async function handleCopyMenuLink() {
    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setCopiedMenuLink(true);
      setTimeout(() => setCopiedMenuLink(false), 2500);
    } catch {
      // Ignore clipboard permission errors
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-800 bg-[#141417] pt-8 sm:pt-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5A93C] text-zinc-950">
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-black uppercase tracking-tight text-zinc-50">
                  {tenant.name}
                </span>
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                  /{tenant.slug}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">
                Vendedor: {userEmail}
              </p>
            </div>
          </div>

          <button
            id="admin-signout-mobile-btn"
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#18181B] px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-red-500/15 hover:text-red-300 sm:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="copy-seller-menu-link-btn"
            type="button"
            onClick={handleCopyMenuLink}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E5A93C] px-3 py-2 text-xs font-black text-zinc-950 transition-colors hover:bg-[#CA8A04] sm:flex-initial"
          >
            {copiedMenuLink ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>¡Link copiado para clientes!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar Link de Mi Menú</span>
              </>
            )}
          </button>

          <Link
            href={`/${tenant.slug}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-[#E5A93C] hover:text-[#E5A93C]"
          >
            <span>Ver Carta</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            id="admin-signout-btn"
            type="button"
            onClick={handleSignOut}
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-red-500/15 hover:text-red-300 sm:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3">
        <nav
          aria-label="Secciones del panel de administración"
          className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:justify-start sm:px-3.5 ${
                  isActive
                    ? "bg-[#E5A93C] text-zinc-950 shadow-sm"
                    : "border border-zinc-800/80 bg-[#18181B] text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
