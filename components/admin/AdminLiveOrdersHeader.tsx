"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Radio, RefreshCw, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface AdminLiveOrdersHeaderProps {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

export function AdminLiveOrdersHeader({
  tenantId,
  tenantSlug,
  tenantName,
}: AdminLiveOrdersHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const menuLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${tenantSlug}`
      : `https://lacartaec.vercel.app/${tenantSlug}`;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders-live-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, tenantId]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(menuLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  }

  function handleShareWhatsApp() {
    const text = `🍔 ¡Hola! Haz tu pedido a domicilio o retiro en el menú digital de *${tenantName}*: ${menuLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5A93C]/35 bg-gradient-to-r from-[#211910] via-[#18181B] to-[#18181B] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E5A93C]">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>Tu Link Personalizado para Clientes y Redes Sociales</span>
          </div>
          <p className="mt-1 text-xs text-zinc-300">
            Compártelo en WhatsApp, Instagram o Facebook para recibir pedidos a
            domicilio (con ubicación GPS) o retiro en local:
          </p>
          <p className="mt-1.5 inline-block rounded-lg border border-zinc-700 bg-[#121215] px-3 py-1 font-mono text-xs font-bold text-[#E5A93C]">
            {menuLink}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="dashboard-copy-menu-link-btn"
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5A93C] px-3.5 py-2.5 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <button
            id="dashboard-share-menu-wa-btn"
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
          >
            <Share2 className="h-4 w-4" />
            <span>Compartir por WhatsApp</span>
          </button>

          <button
            id="dashboard-refresh-orders-btn"
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              router.refresh();
              setTimeout(() => setIsRefreshing(false), 600);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:border-[#E5A93C]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Actualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
