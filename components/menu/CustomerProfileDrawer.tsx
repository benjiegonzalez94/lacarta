"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  History,
  IdCard,
  Loader2,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import type { CustomerProfile } from "@/types/domain";

const PROFILE_STORAGE_KEY = "lacarta_customer_profile_v1";

export function readStoredCustomerProfile(): CustomerProfile {
  if (typeof window === "undefined") {
    return { name: "", cedula: "", phone: "", avatarUrl: "", savedOrders: [] };
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return {
        name: "",
        cedula: "",
        phone: "",
        avatarUrl: "",
        savedOrders: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<CustomerProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      cedula: typeof parsed.cedula === "string" ? parsed.cedula : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      savedOrders: Array.isArray(parsed.savedOrders) ? parsed.savedOrders : [],
    };
  } catch {
    return { name: "", cedula: "", phone: "", avatarUrl: "", savedOrders: [] };
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
  const [name, setName] = useState(() => readStoredCustomerProfile().name);
  const [cedula, setCedula] = useState(
    () => readStoredCustomerProfile().cedula
  );
  const [phone, setPhone] = useState(() => readStoredCustomerProfile().phone);
  const [avatarUrl, setAvatarUrl] = useState(
    () => readStoredCustomerProfile().avatarUrl
  );
  const [savedOrders] = useState<CustomerProfile["savedOrders"]>(
    () => readStoredCustomerProfile().savedOrders
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
        .rpc("get_customer_trust_profile", { p_phone: stored.phone.trim() })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const row = data[0];
            setTrustInfo({
              completed: row.completed_orders,
              noShows: row.no_show_orders,
              cashAllowed: row.cash_allowed,
              maxCashRemote: Number(row.max_cash_remote),
              tier: row.trust_tier,
            });
          }
        });
    }
  }, [isOpen, phone]);

  if (!isOpen) return null;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (!error) {
        const { data: pub } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        if (pub?.publicUrl) {
          setAvatarUrl(pub.publicUrl);
          setUploadingAvatar(false);
          return;
        }
      }

      // Fallback compact data URL
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
            setAvatarUrl(canvas.toDataURL("image/jpeg", 0.7).slice(0, 1990));
          }
          setUploadingAvatar(false);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAvatar(false);
    }
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const updated: CustomerProfile = {
      name: name.trim(),
      cedula: cedula.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl.trim(),
      savedOrders,
    };
    saveCustomerProfileToStorage(updated);
    onProfileUpdated?.(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-profile-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-[#18181B] pt-[env(safe-area-inset-top)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 pt-6 pb-4 sm:pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E11D48] text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="customer-profile-title"
                className="text-base font-black uppercase text-zinc-50"
              >
                Mi Perfil de Cliente
              </h2>
              <p className="text-[11px] text-zinc-400">
                Información básica y estado de tus pedidos
              </p>
            </div>
          </div>

          <button
            id="close-customer-profile-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar mi perfil"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <form
            onSubmit={handleSaveProfile}
            className="space-y-3.5 rounded-2xl border border-zinc-800 bg-[#141418] p-4"
          >
            {/* Avatar / Profile Photo */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#E11D48] bg-[#202024]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={name || "Foto de perfil"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-zinc-400" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  id="upload-customer-avatar-btn"
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs font-bold text-zinc-100 hover:border-[#E11D48]"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E11D48]" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-[#E11D48]" />
                  )}
                  <span>
                    {uploadingAvatar
                      ? "Subiendo..."
                      : "Cambiar foto de perfil"}
                  </span>
                </button>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Visible al realizar tus pedidos en el local
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-customer-name"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Nombre y Apellido *
              </label>
              <input
                id="profile-customer-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Benjamín González"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-customer-cedula"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Cédula de Identidad *
              </label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-zinc-500" />
                <input
                  id="profile-customer-cedula"
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  required
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 0912345678"
                  className="w-full rounded-xl border border-zinc-800 bg-[#202024] py-2 pr-3 pl-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-customer-phone"
                className="mb-1 block text-xs font-semibold text-zinc-400"
              >
                Celular / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-zinc-500" />
                <input
                  id="profile-customer-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0991234567"
                  className="w-full rounded-xl border border-zinc-800 bg-[#202024] py-2 pr-3 pl-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>
            </div>

            <button
              id="save-customer-profile-btn"
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E11D48] px-4 py-2.5 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Perfil guardado!</span>
                </>
              ) : (
                <span>Guardar mi Perfil</span>
              )}
            </button>
          </form>

          {/* Trust & Anti-No-Show Status */}
          <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-4">
            <div className="flex items-center gap-2">
              {trustInfo?.cashAllowed === false ? (
                <ShieldAlert className="h-4 w-4 text-red-400" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              )}
              <h3 className="text-xs font-bold text-zinc-200">
                Estado para Pagos en Efectivo
              </h3>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              {trustInfo ? (
                trustInfo.cashAllowed ? (
                  <>
                    Habilitado ({trustInfo.completed} pedidos cumplidos). Tope
                    en camino en efectivo:{" "}
                    <strong className="text-zinc-200">
                      {formatCurrency(trustInfo.maxCashRemote)}
                    </strong>
                    .
                  </>
                ) : (
                  <span className="text-red-300">
                    Por inasistencia previa en efectivo, tu cuenta solo permite
                    pedidos por Transferencia Bancaria.
                  </span>
                )
              ) : (
                "Tu cédula y celular respaldan tus reservas en efectivo en el local."
              )}
            </p>
          </div>

          {/* Future Saved Card */}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-[#141418] px-4 py-3 opacity-80">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <CreditCard className="h-4 w-4 text-[#FB7185]" />
              <span>Tarjeta guardada en perfil</span>
            </div>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
              Próximamente
            </span>
          </div>

          {/* Saved Orders History */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <History className="h-4 w-4 text-[#E11D48]" />
              <span>Mis Pedidos</span>
            </div>

            {savedOrders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-4 text-center text-xs text-zinc-500">
                Aún no tienes pedidos registrados.
              </div>
            ) : (
              <div className="space-y-2">
                {savedOrders.map((ord) => (
                  <button
                    key={ord.orderId}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOrderTracker(ord.orderId);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-[#141418] p-3 text-left transition-colors hover:border-[#E11D48]"
                  >
                    <div>
                      <p className="text-xs font-black uppercase text-zinc-100">
                        {ord.tenantName} • #
                        {ord.orderId.slice(0, 6).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Ver estado en tiempo real
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#FB7185]">
                      {formatCurrency(ord.total)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
