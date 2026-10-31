"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { updateCustomerProfileServerAction } from "@/app/auth-actions";
import {
  CustomerProfileDrawer,
  readStoredCustomerProfile,
  saveCustomerProfileToStorage,
} from "@/components/menu/CustomerProfileDrawer";
import { OrderLiveTrackerModal } from "@/components/menu/OrderLiveTrackerModal";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  buildDirectionsUrl,
  calculateDistanceKm,
  ECUADOR_CITIES,
  resolveNearestEcuadorCity,
  getDeviceGpsCoordinates,
} from "@/lib/utils/location";

export interface DirectoryTenantItem {
  id: string;
  slug: string;
  name: string;
  branchName?: string | null;
  slogan: string;
  phone: string;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  primaryColor: string;
  logoUrl: string | null;
  isOpen: boolean;
  statusLabel: string;
  scheduleNotice: string;
}

export interface HomeDinerHubClientProps {
  tenants: DirectoryTenantItem[];
  isSeller?: boolean;
  isSuperAdmin?: boolean;
  serverProfile?: {
    name: string;
    cedula: string;
    phone: string;
    avatarUrl: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export function HomeDinerHubClient({
  tenants,
  isSeller = false,
  isSuperAdmin = false,
  serverProfile = null,
}: HomeDinerHubClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [trackerOrderId, setTrackerOrderId] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  const [customerName, setCustomerName] = useState(
    () => serverProfile?.name || readStoredCustomerProfile().name
  );
  const [customerAvatar, setCustomerAvatar] = useState(
    () => serverProfile?.avatarUrl || readStoredCustomerProfile().avatarUrl
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    () => serverProfile?.city || readStoredCustomerProfile().city || "Todas"
  );
  const [userLat, setUserLat] = useState<number | null>(
    () => serverProfile?.latitude ?? readStoredCustomerProfile().latitude ?? null
  );
  const [userLng, setUserLng] = useState<number | null>(
    () =>
      serverProfile?.longitude ?? readStoredCustomerProfile().longitude ?? null
  );
  const [recentOrder] = useState<{
    orderId: string;
    tenantName: string;
  } | null>(() => {
    const first = readStoredCustomerProfile().savedOrders[0];
    return first
      ? { orderId: first.orderId, tenantName: first.tenantName }
      : null;
  });

  async function handleDetectUserLocation() {
    setDetectingGps(true);
    try {
      const coords = await getDeviceGpsCoordinates();
      const nearest = resolveNearestEcuadorCity(coords.latitude, coords.longitude);
      setUserLat(coords.latitude);
      setUserLng(coords.longitude);
      setSelectedCity(nearest.name);

      const current = readStoredCustomerProfile();
      saveCustomerProfileToStorage({
        ...current,
        city: nearest.name,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      void updateCustomerProfileServerAction({
        fullName: current.name || customerName,
        cedula: current.cedula,
        phone: current.phone,
        avatarUrl: current.avatarUrl || customerAvatar,
        city: nearest.name,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (err) {
      console.warn("Could not determine GPS location:", err);
    } finally {
      setDetectingGps(false);
    }
  }

  const enrichedAndFilteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const withDistance = tenants.map((t) => {
      const distanceKm =
        userLat !== null &&
        userLng !== null &&
        t.latitude !== null &&
        t.longitude !== null
          ? calculateDistanceKm(userLat, userLng, t.latitude, t.longitude)
          : null;
      return { ...t, distanceKm };
    });

    const filtered = withDistance.filter((t) => {
      const matchesCity =
        selectedCity === "Todas" ||
        t.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slogan.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        (t.address && t.address.toLowerCase().includes(q));
      return matchesCity && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return 0;
    });
  }, [tenants, searchQuery, selectedCity, userLat, userLng]);

  return (
    <main className="flex min-h-screen flex-col bg-[#0F0F11] text-zinc-50">
      {/* Minimalist Top Bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#0F0F11]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <p className="text-sm font-black tracking-tight text-zinc-50">
                LaCarta
              </p>
              <p className="text-[10px] text-zinc-400">Locales en tu ciudad</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="home-open-profile-btn"
              type="button"
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#18181B] px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48]"
            >
              {customerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customerAvatar}
                  alt="Perfil"
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-[#FB7185]" />
              )}
              <span>
                {customerName ? customerName.split(" ")[0] : "Mi Perfil"}
              </span>
            </button>

            {isSuperAdmin ? (
              <Link
                id="home-superadmin-portal-link"
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-xs font-bold text-violet-300 transition-colors hover:border-violet-400 hover:text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                <span>Panel Dev</span>
              </Link>
            ) : isSeller ? (
              <Link
                id="home-seller-portal-link"
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-[#E11D48] hover:text-zinc-100"
              >
                <Store className="h-3.5 w-3.5 text-[#E11D48]" />
                <span>Mi Local</span>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        {/* City & GPS Proximity Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-[#18181B] p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#E11D48]" />
            <span className="text-xs font-bold text-zinc-300">Ciudad:</span>
            <select
              id="home-city-filter-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-[#121215] px-2.5 py-1.5 text-xs font-black text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            >
              <option value="Todas">Todas las ciudades</option>
              {ECUADOR_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            id="home-detect-gps-city-btn"
            type="button"
            onClick={handleDetectUserLocation}
            disabled={detectingGps}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E11D48]/40 bg-[#E11D48]/15 px-3 py-1.5 text-xs font-bold text-[#FB7185] hover:bg-[#E11D48]/25"
          >
            {detectingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            <span>Detectar mi ciudad</span>
          </button>
        </div>

        {/* Active Order Banner */}
        {recentOrder ? (
          <button
            id="home-active-order-banner-btn"
            type="button"
            onClick={() => setTrackerOrderId(recentOrder.orderId)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#E11D48]/40 bg-[#E11D48]/10 px-4 py-3 text-left transition-colors hover:bg-[#E11D48]/15"
          >
            <div className="flex items-center gap-3">
              <Clock3 className="h-4 w-4 text-[#FB7185]" />
              <div>
                <p className="text-xs font-black text-zinc-100">
                  Pedido activo en {recentOrder.tenantName}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Toca para ver el estado y tu código de retiro en barra
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-[#E11D48] px-2.5 py-1 text-[11px] font-black text-white">
              Ver Estado
            </span>
          </button>
        ) : null}

        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="home-search-tenants-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar local o comida..."
            className="w-full rounded-2xl border border-zinc-800 bg-[#18181B] py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
          />
        </div>

        {/* Restaurant List */}
        {enrichedAndFilteredTenants.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
            <p className="text-xs text-zinc-400">
              No se encontraron locales en{" "}
              <strong className="text-zinc-200">{selectedCity}</strong> con esa
              búsqueda.
            </p>
            {selectedCity !== "Todas" ? (
              <button
                id="home-reset-city-filter-btn"
                type="button"
                onClick={() => setSelectedCity("Todas")}
                className="rounded-xl bg-[#E11D48] px-4 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
              >
                Ver locales en todas las ciudades
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {enrichedAndFilteredTenants.map((tenant) => {
              const directionsHref = buildDirectionsUrl({
                name: tenant.name,
                address: tenant.address,
                city: tenant.city,
                latitude: tenant.latitude,
                longitude: tenant.longitude,
                googleMapsUrl: tenant.googleMapsUrl,
              });

              return (
                <div
                  key={tenant.id}
                  className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4 transition-all hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-black text-white"
                        style={{ backgroundColor: tenant.primaryColor }}
                      >
                        {tenant.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          tenant.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-black text-zinc-50">
                            {tenant.name}
                          </h2>
                          {tenant.branchName ? (
                            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                              {tenant.branchName}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              tenant.isOpen
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {tenant.statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{tenant.slogan}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                            <MapPin className="h-3 w-3 text-[#FB7185]" />
                            <span>{tenant.city}</span>
                          </span>
                          {tenant.distanceKm !== null ? (
                            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              A {tenant.distanceKm} km
                            </span>
                          ) : null}
                          {tenant.address ? (
                            <span className="text-zinc-500">
                              • {tenant.address}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Minimalist Action Row: Cómo llegar (GPS) + Ver Menú */}
                  <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-3">
                    <a
                      id={`tenant-directions-btn-${tenant.slug}`}
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#121215] px-3 py-2 text-xs font-bold text-zinc-200 hover:border-[#E11D48] hover:text-white"
                    >
                      <Navigation className="h-3.5 w-3.5 text-[#FB7185]" />
                      <span>Cómo llegar</span>
                    </a>

                    <Link
                      id={`open-tenant-menu-${tenant.slug}`}
                      href={`/${tenant.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-4 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
                    >
                      <span>Ver Menú y Pedir</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomerProfileDrawer
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenOrderTracker={(orderId) => setTrackerOrderId(orderId)}
        onProfileUpdated={(updated) => {
          setCustomerName(updated.name);
          setCustomerAvatar(updated.avatarUrl);
          if (updated.city) {
            setSelectedCity(updated.city);
          }
          if (updated.latitude !== undefined) {
            setUserLat(updated.latitude ?? null);
          }
          if (updated.longitude !== undefined) {
            setUserLng(updated.longitude ?? null);
          }
        }}
      />

      {trackerOrderId ? (
        <OrderLiveTrackerModal
          orderId={trackerOrderId}
          onClose={() => setTrackerOrderId(null)}
        />
      ) : null}
    </main>
  );
}
