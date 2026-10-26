"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Flame,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  QrCode,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import {
  TableQrScannerModal,
  type QuickTableItem,
} from "@/components/menu/TableQrScannerModal";
import { Badge } from "@/components/ui/Badge";

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

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#0F0F11] text-zinc-50">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[28rem] -translate-x-1/2 rounded-full bg-[#E5A93C]/12 blur-3xl" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-9 pb-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5A93C] text-zinc-950 shadow-md shadow-[#E5A93C]/20">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-black uppercase tracking-tight text-zinc-50">
              LaCarta
            </span>
            <p className="text-[11px] text-zinc-400">
              Pide en Mesa con QR o a Domicilio
            </p>
          </div>
        </div>

        <Link
          id="nav-admin-link"
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3.5 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#E5A93C] hover:text-[#E5A93C]"
        >
          <LayoutDashboard className="h-4 w-4 text-[#E5A93C]" />
          <span>Soy Vendedor</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-[#E5A93C]/35 bg-gradient-to-br from-[#231A10] via-[#18181B] to-[#131316] p-5 shadow-xl sm:p-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <Badge variant="primary">
                <QrCode className="h-3 w-3" />
                <span>Atención en Mesa sin Filas • Multi-Restaurante</span>
              </Badge>
              <h1 className="text-2xl font-black tracking-tight text-zinc-50 sm:text-4xl">
                ¿Llegaste a un restaurante?{" "}
                <span className="text-[#E5A93C]">
                  Siéntate, escanea tu mesa y pide al instante
                </span>
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-zinc-300 sm:text-sm">
                Evita hacer filas para pedir o esperar al mesero. Escanea el
                código QR del tablero en tu mesa para enlazar tu app y enviar tu
                orden directo a cocina, o pide desde casa a domicilio.
              </p>
            </div>

            <button
              id="open-qr-scanner-hero-btn"
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-[#E5A93C] px-6 py-4 text-sm font-black text-zinc-950 shadow-lg shadow-[#E5A93C]/25 transition-all hover:bg-[#CA8A04] active:scale-95 sm:w-auto"
            >
              <Camera className="h-5 w-5" />
              <span>Escanear QR de Mesa</span>
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-100 sm:text-lg">
                Restaurantes Disponibles en LaCarta
              </h2>
              <p className="text-xs text-zinc-400">
                Pide a domicilio con ubicación GPS, para retirar en el local o
                enlazando tu mesa
              </p>
            </div>
            <Badge variant="muted">{tenants.length} locales</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tenants.map((t) => (
              <article
                key={t.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-800 bg-[#18181B] p-5 transition-colors hover:border-zinc-700 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5A93C]/40 bg-gradient-to-br from-[#271C15] to-[#121215]">
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
                        <MapPin className="h-3 w-3 text-[#E5A93C]" />
                        <span>{t.address}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:w-64">
                  <Link
                    id={`open-tenant-menu-${t.slug}`}
                    href={`/${t.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-3 text-xs font-black text-zinc-950 transition-colors hover:bg-[#CA8A04]"
                  >
                    <Truck className="h-4 w-4" />
                    <span>Ver Menú (Domicilio / Retiro)</span>
                  </Link>

                  <button
                    id={`scan-table-for-${t.slug}`}
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#202024] px-4 py-2.5 text-xs font-bold text-zinc-100 transition-colors hover:border-[#E5A93C] hover:text-[#E5A93C]"
                  >
                    <QrCode className="h-4 w-4 text-[#E5A93C]" />
                    <span>Estoy en una Mesa (QR)</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <Utensils className="h-5 w-5 text-[#E5A93C]" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              1. En el Restaurante (Mesa QR)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Llegas al local, te sientas en cualquier mesa, escaneas el QR del
              tablero y tu pedido entra directo a preparación.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <MapPin className="h-5 w-5 text-emerald-400" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              2. Desde Casa con GPS y Mapa
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Abre el link del restaurante, detecta tu ubicación en el mapa,
              elige Efectivo o Transferencia y envía por WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-4">
            <Store className="h-5 w-5 text-[#E5A93C]" />
            <h3 className="mt-2 text-xs font-bold uppercase text-zinc-100">
              3. Perfil para Vendedores
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Copia tu link para redes sociales, imprime los tableros QR de tus
              mesas, cotiza envíos y responde con tus datos bancarios.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-zinc-900 px-4 py-5 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <span>LaCarta • Menús Digitales, Domicilio GPS y Mesas QR</span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-semibold text-zinc-400 hover:text-[#E5A93C]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Administrar mi negocio</span>
          </Link>
        </div>
      </footer>

      <TableQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        quickTables={quickTables}
      />
    </div>
  );
}
