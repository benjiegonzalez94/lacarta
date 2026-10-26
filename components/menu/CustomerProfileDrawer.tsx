"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  History,
  IdCard,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { updateCustomerProfileServerAction } from "@/app/auth-actions";
import { CustomerSavedCardsManager } from "@/components/menu/CustomerSavedCardsManager";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import {
  ECUADOR_CITIES,
  resolveNearestEcuadorCity,
} from "@/lib/utils/location";
import type { CustomerProfile } from "@/types/domain";

const PROFILE_STORAGE_KEY = "lacarta_customer_profile_v1";

export function readStoredCustomerProfile(): CustomerProfile {
  if (typeof window === "undefined") {
    return {
      name: "",
      cedula: "",
      phone: "",
      avatarUrl: "",
      city: "Quito",
      latitude: null,
      longitude: null,
      savedOrders: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return {
        name: "",
        cedula: "",
        phone: "",
        avatarUrl: "",
        city: "Quito",
        latitude: null,
        longitude: null,
        savedOrders: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<CustomerProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      cedula: typeof parsed.cedula === "string" ? parsed.cedula : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      city:
        typeof parsed.city === "string" && parsed.city ? parsed.city : "Quito",
      latitude: typeof parsed.latitude === "number" ? parsed.latitude : null,
      longitude: typeof parsed.longitude === "number" ? parsed.longitude : null,
      savedOrders: Array.isArray(parsed.savedOrders) ? parsed.savedOrders : [],
    };
  } catch {
    return {
      name: "",
      cedula: "",
      phone: "",
      avatarUrl: "",
      city: "Quito",
      latitude: null,
      longitude: null,
      savedOrders: [],
    };
  }
}

export function saveCustomerProfileToStorage(profile: CustomerProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

export interface CustomerProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderTracker: (orderId: string) => void;
  onProfileUpdated?: (profile: CustomerProfile) => void;
}

export function CustomerProfileDrawer({
  isOpen,
  onClose,
  onOpenOrderTracker,
  onProfileUpdated,
}: CustomerProfileDrawerProps) {
  const router = useRouter();
  const [name, setName] = useState(() => readStoredCustomerProfile().name);
  const [cedula, setCedula] = useState(
    () => readStoredCustomerProfile().cedula
  );
  const [phone, setPhone] = useState(() => readStoredCustomerProfile().phone);
  const [avatarUrl, setAvatarUrl] = useState(
    () => readStoredCustomerProfile().avatarUrl
  );
  const [city, setCity] = useState(
    () => readStoredCustomerProfile().city || "Quito"
  );
  const [latitude, setLatitude] = useState<number | null>(
    () => readStoredCustomerProfile().latitude ?? null
  );
  const [longitude, setLongitude] = useState<number | null>(
    () => readStoredCustomerProfile().longitude ?? null
  );
  const [savedOrders] = useState<CustomerProfile["savedOrders"]>(
    () => readStoredCustomerProfile().savedOrders
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [trustInfo, setTrustInfo] = useState<{
    completed: number;
    noShows: number;
    cashAllowed: boolean;
    maxCashRemote: number;
    tier: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const stored = readStoredCustomerProfile();
    if (stored.phone.trim().length >= 7) {
      const supabase = createClient();
      void supabase
        .rpc("get_customer_trust_profile", {
          p_phone: stored.phone.trim(),
        })
        .then(({ data }) => {
          if (data && typeof data === "object" && !Array.isArray(data)) {
            const payload = data as Record<string, unknown>;
            setTrustInfo({
              completed: Number(payload.completed_count ?? 0),
              noShows: Number(payload.no_show_count ?? 0),
              cashAllowed: Boolean(payload.cash_allowed ?? true),
              maxCashRemote: Number(payload.max_cash_remote ?? 20),
              tier: String(payload.trust_tier ?? "new"),
            });
          }
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `customers/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (!error) {
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        setAvatarUrl(data.publicUrl);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleDetectCityGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nearest = resolveNearestEcuadorCity(lat, lng);
        setLatitude(lat);
        setLongitude(lng);
        setCity(nearest.name);
        setDetectingGps(false);
      },
      () => {
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSaveProfile() {
    const current = readStoredCustomerProfile();
    const updated: CustomerProfile = {
      ...current,
      name: name.trim(),
      cedula: cedula.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl.trim(),
      city,
      latitude,
      longitude,
    };
    saveCustomerProfileToStorage(updated);
    onProfileUpdated?.(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    void updateCustomerProfileServerAction({
      fullName: updated.name,
      cedula: updated.cedula,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      city: updated.city,
      latitude: updated.latitude ?? null,
      longitude: updated.longitude ?? null,
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-profile-drawer-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#18181B] text-zinc-50 shadow-2xl sm:rounded-3xl">
        {/* Minimalist Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2
            id="customer-profile-drawer-title"
            className="text-base font-black text-zinc-50"
          >
            Mi Perfil Personal
          </h2>
          <button
            id="close-customer-profile-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar mi perfil"
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Avatar + Identity Form */}
          <div className="space-y-3.5 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
            {/* Avatar Photo Upload */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#E11D48] bg-zinc-900">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    <User className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void handleAvatarChange(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  id="upload-customer-avatar-btn"
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-100 hover:border-[#E11D48]"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FB7185]" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-[#FB7185]" />
                  )}
                  <span>
                    {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-name-input"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Nombre y Apellido
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="profile-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Andrés Pérez"
                  className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-cedula-input"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Cédula de Identidad
              </label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="profile-cedula-input"
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej. 1712345678"
                  className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-phone-input"
                  className="mb-1 block text-xs font-semibold text-zinc-400"
                >
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0991234567"
                    className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-city-select"
                  className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-400"
                >
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#FB7185]" />
                    <span>Ciudad</span>
                  </span>
                  <button
                    id="profile-detect-city-gps-btn"
                    type="button"
                    onClick={handleDetectCityGps}
                    disabled={detectingGps}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FB7185] hover:underline"
                  >
                    {detectingGps ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <LocateFixed className="h-3 w-3" />
                    )}
                    <span>GPS</span>
                  </button>
                </label>
                <select
                  id="profile-city-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                >
                  {ECUADOR_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              id="save-customer-profile-btn"
              type="button"
              onClick={() => void handleSaveProfile()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-4 py-2.5 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Perfil Guardado</span>
                </>
              ) : (
                <span>Guardar mi perfil</span>
              )}
            </button>
          </div>

          {/* Saved Cards Section */}
          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <CreditCard className="h-3.5 w-3.5 text-[#FB7185]" />
              <span>Mis Tarjetas Guardadas</span>
            </div>
            <CustomerSavedCardsManager />
          </div>

          {/* Minimalist Trust Badge */}
          {trustInfo ? (
            <div
              className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-xs ${
                trustInfo.cashAllowed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/35 bg-red-500/10 text-red-200"
              }`}
            >
              {trustInfo.cashAllowed ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>
                {trustInfo.cashAllowed
                  ? `Pago en efectivo habilitado • ${trustInfo.completed} retiros cumplidos.`
                  : "Efectivo restringido por inasistencia previa. Usa Transferencia."}
              </span>
            </div>
          ) : null}

          {/* Recent Orders */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <History className="h-3.5 w-3.5 text-[#FB7185]" />
              <span>Mis Pedidos Recientes</span>
            </div>

            {savedOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                Aún no tienes pedidos registrados.
              </div>
            ) : (
              <div className="space-y-2">
                {savedOrders.slice(0, 6).map((ord) => (
                  <button
                    key={ord.orderId}
                    id={`open-recent-order-${ord.orderId}`}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOrderTracker(ord.orderId);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-left hover:border-[#E11D48]"
                  >
                    <div>
                      <p className="text-xs font-black text-zinc-100">
                        {ord.tenantName}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        #{ord.orderId.slice(0, 8).toUpperCase()} •{" "}
                        {new Date(ord.createdAt).toLocaleDateString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-zinc-100">
                        {formatCurrency(ord.total)}
                      </p>
                      <span className="text-[10px] font-bold text-[#FB7185]">
                        Ver estado →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              id="customer-signout-btn"
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-red-500/50 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
