import Link from "next/link";
import {
  ArrowRight,
  Flame,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#0F0F11] text-zinc-50">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-[#E5A93C]/12 blur-3xl" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5A93C] text-zinc-950">
            <Flame className="h-5 w-5" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">
            LaCarta
          </span>
        </div>

        <Link
          id="nav-admin-link"
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#18181B] px-3.5 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#E5A93C] hover:text-[#E5A93C]"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Panel Admin</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <Badge variant="primary">
          Plataforma SaaS Multi-Tenant para Restaurantes
        </Badge>

        <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-zinc-50 sm:text-5xl">
          Tu menú digital listo para pedir por{" "}
          <span className="text-[#E5A93C]">WhatsApp</span> y{" "}
          <span className="text-emerald-400">QR en Mesa</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Explora el restaurante piloto <strong className="text-zinc-200">Cowiings</strong> con
          selección de salsas artesanales, carrito persistente por local y
          cálculo de órdenes verificado en servidor.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            id="cta-cowiings-menu-link"
            href="/cowiings"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E5A93C] px-6 py-4 text-sm font-black text-zinc-950 shadow-lg shadow-[#E5A93C]/20 transition-all hover:bg-[#CA8A04]"
          >
            <Flame className="h-5 w-5" />
            <span>Ver Menú de Cowiings</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            id="cta-cowiings-qr-table-link"
            href="/cowiings/mesa/cowiings-mesa-1"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-[#18181B] px-6 py-4 text-sm font-bold text-zinc-100 transition-colors hover:border-[#E5A93C] hover:text-[#E5A93C]"
          >
            <QrCode className="h-5 w-5 text-[#E5A93C]" />
            <span>Probar Pedido desde Mesa #1 (QR)</span>
          </Link>
        </div>

        <div className="mt-14 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-5">
            <Smartphone className="h-6 w-6 text-[#E5A93C]" />
            <h2 className="mt-3 text-sm font-bold text-zinc-100">
              Mobile-First & Multi-Tenant
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Cada restaurante publica su carta en{" "}
              <code className="text-zinc-200">/&#123;slug&#125;</code> con aislamiento
              estricto por <code className="text-zinc-200">tenant_id</code> y RLS.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-5">
            <MessageCircle className="h-6 w-6 text-emerald-400" />
            <h2 className="mt-3 text-sm font-bold text-zinc-100">
              Checkout directo a WhatsApp
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Registra el pedido en base de datos recalculando totales en el
              servidor y genera el mensaje listo para enviar por{" "}
              <code className="text-zinc-200">wa.me</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#18181B] p-5">
            <QrCode className="h-6 w-6 text-[#E5A93C]" />
            <h2 className="mt-3 text-sm font-bold text-zinc-100">
              Pedidos desde Mesa (QR)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Tokens únicos por mesa validados con{" "}
              <code className="text-zinc-200">resolve_table()</code> para ordenar en
              el local sin pedir dirección de entrega.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-5 text-center text-xs text-zinc-500">
        LaCarta • Arquitectura desacoplada con Next.js, Supabase RLS y API v1
      </footer>
    </div>
  );
}
