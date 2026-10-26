"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  LayoutDashboard,
  MapPin,
  Search,
  User,
  Utensils,
} from "lucide-react";
import { CustomerProfileDrawer } from "@/components/menu/CustomerProfileDrawer";
import { OrderLiveTrackerModal } from "@/components/menu/OrderLiveTrackerModal";
import { Badge } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";

export interface DirectoryTenantItem {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  phone: string;
  address: string | null;
  primaryColor: string;
  logoUrl: string | null;
  isOpen: boolean;
  statusLabel: string;
  scheduleNotice: string;
}

export interface HomeDinerHubClientProps {
  tenants: DirectoryTenantItem[];
}

export function HomeDinerHubClient({ tenants }: HomeDinerHubClientProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTenants = tenants.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.slogan.toLowerCase().includes(q) ||
      (t.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F11] text-zinc-50">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pt-9 pb-4 sm:py-6">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="md" />
          <div>
            <span className="text-lg font-black uppercase tracking-tight text-zinc-50">
              LaCarta
            </span>
            <p className="text-[11px] text-zinc-400">
              Pide antes de llegar o en tu mesa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="home-customer-profile-btn"
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-bold text-zinc-100 transition-colors hover:border-[#E11D48]"
          >
            <User className="h-4 w-4 text-[#E11D48]" />
            <span>Mi Perfil</span>
          </button>

          <Link
            id="nav-admin-link"
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#E11D48]"
          >
            <LayoutDashboard className="h-4 w-4 text-[#E11D48]" />
            <span>Vendedor</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-500" />
          <input
            id="search-restaurants-input"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar local para ir a comer..."
            className="w-full rounded-2xl border border-zinc-800 bg-[#18181B] py-2.5 pr-4 pl-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
          />
        </div>

        <div className="space-y-3.5">
          {filteredTenants.map((t) => (
            <article
              key={t.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#18181B] p-4 transition-colors hover:border-zinc-700 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E11D48]/40 bg-[#201217]">
                  {t.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.logoUrl}
                      alt={t.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Flame
                      className="h-7 w-7"
                      style={{ color: t.primaryColor }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black uppercase text-zinc-50">
                      {t.name}
                    </h2>
                    <Badge variant={t.isOpen ? "success" : "secondary"}>
                      {t.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">{t.scheduleNotice}</p>
                  {t.address ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                      <MapPin className="h-3 w-3 text-[#E11D48]" />
                      <span>{t.address}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <Link
                id={`open-tenant-menu-${t.slug}`}
                href={`/${t.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-2.5 text-xs font-black text-white shadow-sm shadow-[#E11D48]/25 transition-colors hover:bg-[#BE123C]"
              >
                <Utensils className="h-4 w-4" />
                <span>Ver Menú y Pedir</span>
              </Link>
            </article>
          ))}
        </div>
      </main>

      <CustomerProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenOrderTracker={(ordId) => setTrackingOrderId(ordId)}
      />

      {trackingOrderId ? (
        <OrderLiveTrackerModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      ) : null}
    </div>
  );
}
