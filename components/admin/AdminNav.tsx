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
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import type { TenantRow } from "@/types/domain";

export interface AdminNavProps {
  tenant: TenantRow;
  userEmail: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Pedidos", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Menú y Extras", icon: Package },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/configuracion", label: "Mi Perfil", icon: User },
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
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
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
                    ? "bg-[#E11D48] text-white shadow-sm shadow-[#E11D48]/30"
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
