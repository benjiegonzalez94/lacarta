import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { buildDirectionsUrl } from "@/lib/utils/location";
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
}: RestaurantHeaderProps) {
  const directionsHref = buildDirectionsUrl({
    name: tenant.name,
    address: tenant.address,
    city: tenant.city,
    latitude: tenant.latitude !== null ? Number(tenant.latitude) : null,
    longitude: tenant.longitude !== null ? Number(tenant.longitude) : null,
    googleMapsUrl: tenant.google_maps_url,
  });

  return (
    <header className="relative overflow-hidden border-b border-zinc-800/80 bg-[#121215] pt-7 sm:pt-0">
      <div className="relative mx-auto max-w-3xl px-4 pt-3 pb-4 sm:pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            id="back-to-lacarta-hub-link"
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-[#E11D48]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Locales</span>
          </Link>

          <a
            id="header-directions-gps-btn"
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E11D48]/40 bg-[#E11D48]/15 px-3 py-1.5 text-xs font-bold text-[#FB7185] transition-colors hover:bg-[#E11D48]/25"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Cómo llegar</span>
          </a>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E11D48]/40 bg-[#18181B]">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BrandLogo size="lg" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-tight text-zinc-50 sm:text-2xl">
                {tenant.name}
              </h1>
              {tenant.branch_name ? (
                <span className="rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-0.5 text-xs font-bold text-zinc-300">
                  {tenant.branch_name}
                </span>
              ) : null}
              <Badge variant={schedule.isOpen ? "success" : "secondary"}>
                {schedule.statusLabel}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              {branding.slogan} •{" "}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#E11D48]" />
                {schedule.notice}
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FB7185]" />
              <span className="font-semibold">{tenant.city || "Quito"}</span>
              {tenant.address ? (
                <span className="text-zinc-400">• {tenant.address}</span>
              ) : null}
            </p>
          </div>
        </div>

        {!schedule.isOpen ? (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          >
            <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Fuera de horario ({schedule.notice}).</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
