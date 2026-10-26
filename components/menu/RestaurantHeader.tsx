import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Flame,
  MapPin,
  Phone,
  QrCode,
  Sparkles,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import type {
  ResolvedTable,
  ScheduleStatus,
  TenantBranding,
  TenantRow,
} from "@/types/domain";

export interface RestaurantHeaderProps {
  tenant: TenantRow;
  branding: TenantBranding;
  schedule: ScheduleStatus;
  resolvedTable?: ResolvedTable | null;
}

export function RestaurantHeader({
  tenant,
  branding,
  schedule,
  resolvedTable,
}: RestaurantHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-[#1C1410] via-[#131215] to-[#0F0F11] pt-7 sm:pt-0">
      {branding.bannerUrl ? (
        <div className="pointer-events-none absolute inset-0 opacity-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-[#0F0F11]" />
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: branding.primaryColor }}
      />

      <div className="relative mx-auto max-w-3xl px-4 pt-3 pb-5 sm:pt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            id="back-to-lacarta-hub-link"
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B]/90 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-[#E5A93C] hover:text-[#E5A93C]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>LaCarta • Locales y Escáner QR</span>
          </Link>

          {!resolvedTable ? (
            <Link
              id="header-scan-table-qr-link"
              href="/?scan=1"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5A93C]/40 bg-[#E5A93C]/10 px-3 py-1.5 text-xs font-bold text-[#E5A93C] hover:bg-[#E5A93C]/20"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>¿Estás en una mesa? Escanear QR</span>
            </Link>
          ) : null}
        </div>

        {resolvedTable ? (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E5A93C]/40 bg-[#E5A93C]/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E5A93C] text-zinc-950">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#E5A93C]">
                  Mesa Enlazada • Atención Directa sin Filas
                </p>
                <p className="text-sm font-semibold text-zinc-100">
                  Estás pidiendo desde la Mesa #{resolvedTable.tableNumber}
                </p>
              </div>
            </div>
            <Badge variant="primary">Mesa #{resolvedTable.tableNumber}</Badge>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5A93C]/40 bg-gradient-to-br from-[#271C15] to-[#18181B] shadow-lg shadow-black/50">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Flame
                  className="h-8 w-8"
                  style={{ color: branding.primaryColor }}
                />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
                  {tenant.name}
                </h1>
                <Badge variant={schedule.isOpen ? "success" : "secondary"}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      schedule.isOpen ? "bg-emerald-400" : "bg-[#FF8A65]"
                    }`}
                  />
                  {schedule.statusLabel}
                </Badge>
              </div>
              <p
                className="mt-0.5 text-sm font-medium"
                style={{ color: branding.primaryColor }}
              >
                {branding.slogan}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/90 bg-[#18181B]/90 px-3 py-2 text-xs text-zinc-300">
            <Clock
              className="h-4 w-4 shrink-0"
              style={{ color: branding.primaryColor }}
            />
            <div>
              <span className="font-semibold text-zinc-100">Horario:</span>{" "}
              <span>{schedule.notice}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/90 bg-[#18181B]/90 px-3 py-2 text-xs text-zinc-300">
            <Truck
              className="h-4 w-4 shrink-0"
              style={{ color: branding.primaryColor }}
            />
            <div>
              <span className="font-semibold text-zinc-100">
                Domicilio y Retiro:
              </span>{" "}
              <span>
                {tenant.delivery_fee > 0
                  ? `Envío base ${formatCurrency(tenant.delivery_fee)} (según ubicación)`
                  : "Cotización de envío por ubicación en WhatsApp"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles
              className="h-3.5 w-3.5"
              style={{ color: branding.primaryColor }}
            />
            Efectivo o Transferencia • Ubicación GPS automática
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-300">
            <Phone className="h-3.5 w-3.5 text-emerald-400" />
            WhatsApp: {tenant.phone}
          </span>
        </div>

        {!schedule.isOpen ? (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          >
            <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Actualmente estamos fuera de horario de atención ({schedule.notice}
              ). Puedes explorar la carta y armar tu pedido.
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
