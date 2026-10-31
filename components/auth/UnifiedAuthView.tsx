"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  LocateFixed,
  Lock,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import {
  registerAccountAction,
  resolveSignedInRoleAction,
} from "@/app/auth-actions";
import {
  readStoredCustomerProfile,
  saveCustomerProfileToStorage,
} from "@/components/menu/CustomerProfileDrawer";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import {
  ECUADOR_CITIES,
  resolveNearestEcuadorCity,
  getDeviceGpsCoordinates,
} from "@/lib/utils/location";

export interface UnifiedAuthViewProps {
  defaultAccountType?: "customer" | "seller";
  forceSellerRedirect?: boolean;
}

export function UnifiedAuthView({
  defaultAccountType = "customer",
  forceSellerRedirect = false,
}: UnifiedAuthViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<"customer" | "seller">(
    defaultAccountType
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Quito");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");

  const [detectingGps, setDetectingGps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDetectLocation() {
    setDetectingGps(true);
    setErrorMsg(null);
    try {
      const coords = await getDeviceGpsCoordinates();
      const nearest = resolveNearestEcuadorCity(coords.latitude, coords.longitude);
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setCity(nearest.name);
    } catch {
      setErrorMsg("No se pudo leer el GPS automáticamente. Elige tu ciudad en la lista.");
    } finally {
      setDetectingGps(false);
    }
  }

  async function finalizeSignInRedirect() {
    const resolved = await resolveSignedInRoleAction();
    if (resolved.profile) {
      const existing = readStoredCustomerProfile();
      saveCustomerProfileToStorage({
        ...existing,
        name: resolved.profile.fullName || existing.name,
        cedula: resolved.profile.cedula || existing.cedula,
        phone: resolved.profile.phone || existing.phone,
        avatarUrl: resolved.profile.avatarUrl || existing.avatarUrl,
        city: resolved.profile.city || existing.city || "Quito",
        latitude: resolved.profile.latitude ?? existing.latitude ?? null,
        longitude: resolved.profile.longitude ?? existing.longitude ?? null,
      });
    }

    if (resolved.role === "seller" || resolved.role === "admin" || forceSellerRedirect) {
      router.push("/admin");
      router.refresh();
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg("Correo o contraseña incorrectos.");
          return;
        }
        await finalizeSignInRedirect();
        return;
      }

      // Registration flow
      const regResult = await registerAccountAction({
        accountType,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        cedula: cedula.trim(),
        phone: phone.trim(),
        city,
        latitude,
        longitude,
        restaurantName: restaurantName.trim(),
        branchName: branchName.trim() || undefined,
        restaurantAddress: restaurantAddress.trim(),
      });

      if (!regResult.ok) {
        setErrorMsg(regResult.error ?? "No se pudo completar el registro.");
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setErrorMsg(signInErr.message);
        return;
      }

      const existing = readStoredCustomerProfile();
      saveCustomerProfileToStorage({
        ...existing,
        name: fullName.trim(),
        cedula: cedula.trim(),
        phone: phone.trim(),
        city,
        latitude,
        longitude,
      });

      if (regResult.role === "seller") {
        router.push("/admin");
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] px-4 py-8 text-zinc-50">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-6 shadow-2xl">
        {/* Brand Header */}
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-3 text-xl font-black tracking-tight text-zinc-50">
            Bienvenido a <span className="text-[#E11D48]">LaCarta</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Acceso unificado para Clientes y Vendedores en todo el país
          </p>
        </div>

        {/* Mode Switcher: Sign In vs Sign Up */}
        <div className="mb-5 grid grid-cols-2 rounded-xl border border-zinc-800 bg-[#121215] p-1">
          <button
            id="unified-auth-signin-tab"
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
            className={`rounded-lg py-2.5 text-xs font-bold transition-colors ${
              mode === "signin"
                ? "bg-[#E11D48] text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            id="unified-auth-signup-tab"
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            className={`rounded-lg py-2.5 text-xs font-bold transition-colors ${
              mode === "signup"
                ? "bg-[#E11D48] text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Account Type Selector on Sign Up */}
        {mode === "signup" ? (
          <div className="mb-4 space-y-2.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Elige tu tipo de cuenta
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="signup-type-customer-btn"
                type="button"
                onClick={() => setAccountType("customer")}
                className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                  accountType === "customer"
                    ? "border-[#E11D48] bg-[#E11D48]/15 text-zinc-50"
                    : "border-zinc-800 bg-[#141418] text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <User className="h-4 w-4 text-[#FB7185]" />
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Gratis
                  </span>
                </div>
                <p className="mt-2 text-xs font-black">Soy Cliente</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  Pide sin esperas en tus locales favoritos
                </p>
              </button>

              <button
                id="signup-type-seller-btn"
                type="button"
                onClick={() => setAccountType("seller")}
                className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                  accountType === "seller"
                    ? "border-[#E11D48] bg-[#E11D48]/15 text-zinc-50"
                    : "border-zinc-800 bg-[#141418] text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Store className="h-4 w-4 text-[#FB7185]" />
                  <span className="rounded-full bg-[#E11D48]/20 px-2 py-0.5 text-[10px] font-bold text-[#FB7185]">
                    $15/mes
                  </span>
                </div>
                <p className="mt-2 text-xs font-black">Soy Vendedor</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  Publica tu local y recibe pedidos en vivo
                </p>
              </button>
            </div>

            {accountType === "seller" ? (
              <div className="rounded-xl border border-[#E11D48]/35 bg-[#E11D48]/10 p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#FB7185]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Plan SaaS Vendedor • $15.00 USD / mes</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-300">
                  Incluye menú digital ilimitado, comandas en tiempo real,
                  visibilidad en tu ciudad y primer mes activo al registrarte.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  {accountType === "seller"
                    ? "Nombre del Propietario"
                    : "Nombre y Apellido"}
                </label>
                <input
                  id="auth-fullname-input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>

              {accountType === "customer" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Cédula de Identidad
                  </label>
                  <input
                    id="auth-cedula-input"
                    type="text"
                    required
                    inputMode="numeric"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej. 1712345678"
                    className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Nombre de tu Local / Restaurante
                    </label>
                    <input
                      id="auth-restaurant-name-input"
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="Ej. Asados El Rincón"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Distintivo de Sucursal / Sector (Opcional)
                    </label>
                    <input
                      id="auth-branch-name-input"
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="Ej. Matriz Norte, Sucursal Iñaquito, CC El Jardín"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Dirección del Local
                    </label>
                    <input
                      id="auth-restaurant-address-input"
                      type="text"
                      required
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      placeholder="Ej. Av. Principal N34 y Calle B"
                      className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    WhatsApp / Celular
                  </label>
                  <input
                    id="auth-phone-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0991234567"
                    className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span>Ciudad</span>
                    <button
                      id="auth-detect-gps-btn"
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingGps}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FB7185] hover:underline"
                    >
                      {detectingGps ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <LocateFixed className="h-3 w-3" />
                      )}
                      <span>Usar GPS</span>
                    </button>
                  </label>
                  <select
                    id="auth-city-select"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
                  >
                    {ECUADOR_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {latitude !== null && longitude !== null ? (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    Ubicación GPS detectada en {city} ({latitude}, {longitude})
                  </span>
                </p>
              ) : null}
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Correo electrónico
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Contraseña
            </label>
            <input
              id="auth-password-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          {errorMsg ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              {errorMsg}
            </div>
          ) : null}

          <button
            id="unified-auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#E11D48]/25 transition-colors hover:bg-[#BE123C] disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>
              {mode === "signin"
                ? "Ingresar a LaCarta"
                : accountType === "seller"
                  ? "Registrar Local y Activar Cuenta"
                  : "Crear mi Cuenta de Cliente"}
            </span>
          </button>
        </form>

        {/* Quick Demo Access for instant testing */}
        {mode === "signin" ? (
          <div className="mt-5 border-t border-zinc-800/80 pt-4">
            <p className="mb-2 text-center text-[11px] font-semibold text-zinc-500">
              Acceso rápido de demostración
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="demo-login-customer-btn"
                type="button"
                onClick={() => {
                  setEmail("cliente@lacarta.ec");
                  setPassword("Cliente2026!");
                  setErrorMsg(null);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-[11px] font-bold text-zinc-300 hover:border-[#E11D48]"
              >
                <User className="h-3.5 w-3.5 text-[#FB7185]" />
                <span>Demo Cliente</span>
              </button>
              <button
                id="demo-login-seller-btn"
                type="button"
                onClick={() => {
                  setEmail("admin@cowiings.com");
                  setPassword("Cowiings2026!");
                  setErrorMsg(null);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-[11px] font-bold text-zinc-300 hover:border-[#E11D48]"
              >
                <Store className="h-3.5 w-3.5 text-[#FB7185]" />
                <span>Demo Vendedor</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
