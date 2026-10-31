"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import type { TenantRow } from "@/types/domain";

export interface AdminNavProps {
  tenant: TenantRow;
  userEmail: string;
  isSuperAdmin?: boolean;
  allTenants?: TenantRow[];
}

const BASE_NAV_ITEMS = [
  { href: "/admin", label: "Pedidos", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Menú y Extras", icon: Package },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/configuracion", label: "Mi Perfil", icon: User },
];

export function AdminNav({
  tenant,
  userEmail,
  isSuperAdmin = false,
  allTenants = [],
}: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [copiedMenuLink, setCopiedMenuLink] = useState(false);

  const navItems = isSuperAdmin
    ? [
        ...BASE_NAV_ITEMS,
        {
          href: "/admin/sistema",
          label: "Sistema & Soporte",
          icon: ShieldCheck,
          isDev: true,
        },
      ]
    : BASE_NAV_ITEMS;

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
      {/* Superadmin Platform Banner */}
      {isSuperAdmin ? (
        <div className="border-b border-violet-500/30 bg-violet-950/40 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-black tracking-wider text-violet-300">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                SUPERADMIN / EQUIPO DEV
              </span>
              <span className="hidden text-zinc-400 sm:inline">
                Control Global de Plataforma ({allTenants.length}{" "}
                {allTenants.length === 1 ? "Restaurante" : "Restaurantes"})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/sistema"
                className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-violet-500"
              >
                <ShieldCheck className="h-3 w-3" />
                <span>Panel Superadmin</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-900/30 px-2.5 py-1 text-[11px] font-bold text-violet-200 hover:bg-violet-900/50"
              >
                <Store className="h-3 w-3" />
                <span>Hub Clientes</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E11D48]/40 bg-[#202024]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <BrandLogo size="md" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-black uppercase tracking-tight text-zinc-50">
                  {tenant.name}
                </span>
                {tenant.branch_name ? (
                  <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                    {tenant.branch_name}
                  </span>
                ) : null}
                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                  /{tenant.slug}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">{userEmail}</p>
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
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E11D48] px-3 py-2 text-xs font-black text-white shadow-sm shadow-[#E11D48]/25 transition-colors hover:bg-[#BE123C] sm:flex-initial"
          >
            {copiedMenuLink ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>¡Link copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar Link del Menú</span>
              </>
            )}
          </button>

          <Link
            href={`/${tenant.slug}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-[#E11D48]"
          >
            <span>Ver Menú</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            id="admin-signout-btn"
            type="button"
            onClick={handleSignOut}
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 sm:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-2 text-xs font-bold text-zinc-400">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isDev = "isDev" in item && item.isDev;

          let activeClass = "bg-[#E11D48] text-white";
          if (isDev) {
            activeClass = "bg-violet-600 text-white shadow-sm shadow-violet-500/30";
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 transition-colors ${
                isActive
                  ? activeClass
                  : isDev
                  ? "border border-violet-500/30 bg-violet-950/30 text-violet-300 hover:bg-violet-900/40 hover:text-violet-100"
                  : "hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
