"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Camera,
  ChefHat,
  Flame,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  QrCode,
  Search,
  Store,
  User,
  Utensils,
} from "lucide-react";
import { CustomerProfileDrawer } from "@/components/menu/CustomerProfileDrawer";
import { OrderLiveTrackerModal } from "@/components/menu/OrderLiveTrackerModal";
import {
  TableQrScannerModal,
  type QuickTableItem,
} from "@/components/menu/TableQrScannerModal";
import { Badge } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";

export interface DirectoryTenantItem {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  phone: string;
  address: string | null;
  deliveryFee: number;
  primaryColor: string;
  logoUrl: string | null;
  isOpen: boolean;
  statusLabel: string;
  scheduleNotice: string;
}

export interface HomeDinerHubClientProps {
  tenants: DirectoryTenantItem[];
  quickTables: QuickTableItem[];
  initialScanOpen?: boolean;
}

export function HomeDinerHubClient({
  tenants,
  quickTables,
  initialScanOpen = false,
}: HomeDinerHubClientProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(initialScanOpen);
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
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#0F0F11] text-zinc-50">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[28rem] -translate-x-1/2 rounded-full bg-[#E11D48]/15 blur-3xl" />

      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 pt-9 pb-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="md" />
          <div>
            <span className="text-lg font-black uppercase tracking-tight text-zinc-50">
              LaCarta
            </span>
            <p className="text-[11px] text-zinc-400">
              Pide en Camino o desde tu Mesa sin Esperas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="home-customer-profile-btn"
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#E11D48] hover:text-[#FB7185]"
          >
            <User className="h-4 w-4 text-[#E11D48]" />
            <span>Mi Cuenta / Pedidos</span>
          </button>

          <Link
            id="nav-admin-link"
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#E11D48] hover:text-[#FB7185]"
          >
            <LayoutDashboard className="h-4 w-4 text-[#E11D48]" />
            <span>Soy Vendedor</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-[#E11D48]/35 bg-gradient-to-br from-[#271018] via-[#18181B] to-[#131316] p-5 shadow-xl sm:p-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <Badge variant="primary">
                <Utensils className="h-3 w-3" />
                <span>Sal a Comer sin Esperar • Pre-Orden y Mesa QR</span>
              </Badge>
              <h1 className="text-2xl font-black tracking-tight text-zinc-50 sm:text-4xl">
                ¿Vas a salir a comer?{" "}
                <span className="text-[#FB7185]">
                  Pide mientras vas en camino o desde tu mesa y olvídate de
                  esperar
                </span>
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-zinc-300 sm:text-sm">
                Busca tu local favorito antes de llegar, elige si es{" "}
                <strong>Para Servir</strong> o <strong>Para Llevar</strong>,
                indica tu número de mesa y sigue en vivo cuando tu comida esté{" "}
                <strong>Recibida, En Preparación o Lista para Retirar</strong>.
              </p>
            </div>

            <button
              id="open-qr-scanner-hero-btn"
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-[#E11D48] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#E11D48]/30 transition-all hover:bg-[#BE123C] active:scale-95 sm:w-auto"
            >
              <Camera className="h-5 w-5" />
              <span>Estoy en Mesa (QR)</span>
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-100 sm:text-lg">
                Busca el Local donde vas a Comer
              </h2>
              <p className="text-xs text-zinc-400">
                Adelanta tu pedido en camino o selecciona tu número de mesa al
                llegar
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-500" />
              <input
                id="search-restaurants-input"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar restaurante (ej. Cowiings)..."
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2 pr-3 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredTenants.map((t) => (
              <article
                key={t.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-800 bg-[#18181B] p-5 transition-colors hover:border-zinc-700 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E11D48]/40 bg-gradient-to-br from-[#291219] to-[#121215]">
                    {t.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.logoUrl}
                        alt={t.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Flame
                        className="h-8 w-8"
                        style={{ color: t.primaryColor }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black uppercase text-zinc-50">
                        {t.name}
                      </h3>
                      <Badge variant={t.isOpen ? "success" : "secondary"}>
                        {t.statusLabel}
                      </Badge>
                    </div>
                    <p
                      className="text-xs font-bold"
                      style={{ color: t.primaryColor }}
                    >
                      {t.slogan}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {t.scheduleNotice}
                    </p>
                    {t.address ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                        <MapPin className="h-3 w-3 text-[#E11D48]" />
                        <span>{t.address}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:w-64">
                  <Link
                    id={`open-tenant-menu-${t.slug}`}
                    href={`/${t.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-4 py-3 text-xs font-black text-white shadow-sm shadow-[#E11D48]/25 transition-colors hover:bg-[#BE123C]"
                  >
                    <Utensils className="h-4 w-4" />
                    <span>Pedir (Para Servir o Llevar)</span>
                  </Link>

                  <button
                    id={`scan-table-for-${t.slug}`}
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#202024] px-4 py-2.5 text-xs font-bold text-zinc-100 transition-colors hover:border-[#E11D48] hover:text-[#FB7185]"
                  >
                    <QrCode className="h-4 w-4 text-[#E11D48]" />
                    <span>Ya estoy en una Mesa</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <ChefHat className="h-5 w-5 text-[#E11D48]" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              1. Pide en Camino o en Mesa
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Adelanta tu orden mientras vas llegando con tu pareja o amigos, o
              elige tu número de mesa cuando ya estés sentado.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <BellRing className="h-5 w-5 text-emerald-400" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              2. Estado del Pedido en Vivo
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Mira en tu celular si tu pedido fue{" "}
              <strong>Recibido, Está en Preparación o ¡Listo!</strong> para
              acercarte a la barra o recibirlo en tu mesa.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <Store className="h-5 w-5 text-[#E11D48]" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              3. Despacho Ágil sin Meseros
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              El negocio controla la fila de pedidos, verifica transferencias
              con comprobante y avisa en 1 toque cuando el plato está listo.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-zinc-900 px-4 py-5 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <span>
            LaCarta • Pide en Camino o en Mesa sin Esperas • Retiro y Atención
            en Local
          </span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-semibold text-zinc-400 hover:text-[#FB7185]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Perfil de Vendedor</span>
          </Link>
        </div>
      </footer>

      <TableQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        quickTables={quickTables}
      />

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
