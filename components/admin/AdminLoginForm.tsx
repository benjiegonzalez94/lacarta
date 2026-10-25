"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        if (data.session) {
          router.refresh();
        } else {
          setInfoMsg(
            "Cuenta creada. Si tienes confirmación por correo activa en Supabase, revisa tu bandeja de entrada o inicia sesión."
          );
          setMode("signin");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5A93C]/40 bg-[#E5A93C]/10 text-[#E5A93C]">
            <Flame className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-zinc-50">
            LaCarta • Panel Admin
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Administra tu menú digital, precios, mesas QR y pedidos en tiempo
            real
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-zinc-800 bg-[#131316] p-1">
          <button
            id="auth-mode-signin-btn"
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-colors ${
              mode === "signin"
                ? "bg-[#E5A93C] text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            id="auth-mode-signup-btn"
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-colors ${
              mode === "signup"
                ? "bg-[#E5A93C] text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Crear Cuenta Dueño
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email-input"
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Correo electrónico
            </label>
            <input
              id="admin-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dueno@cowiings.com"
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password-input"
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Contraseña
            </label>
            <input
              id="admin-password-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
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

          {infoMsg ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
            >
              {infoMsg}
            </div>
          ) : null}

          <button
            id="admin-auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-[#CA8A04] disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>
              {mode === "signin" ? "Entrar al Panel" : "Registrar Cuenta"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
