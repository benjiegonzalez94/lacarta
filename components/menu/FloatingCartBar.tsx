"use client";

import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export interface FloatingCartBarProps {
  totalItems: number;
  subtotal: number;
  onOpenCart: () => void;
}

export function FloatingCartBar({
  totalItems,
  subtotal,
  onOpenCart,
}: FloatingCartBarProps) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <div className="fixed right-0 bottom-0 left-0 z-30 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/90 to-transparent px-4 pt-3 pb-4">
      <div className="mx-auto max-w-3xl">
        <button
          id="open-floating-cart-btn"
          type="button"
          onClick={onOpenCart}
          className="flex w-full items-center justify-between rounded-2xl bg-[#E5A93C] px-5 py-3.5 text-zinc-950 shadow-xl shadow-black/60 transition-all hover:bg-[#CA8A04] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-xs font-black text-[#E5A93C]">
              {totalItems}
            </span>
            <div className="text-left">
              <p className="text-sm font-black tracking-tight">
                Ver mi pedido
              </p>
              <p className="text-[11px] font-semibold text-zinc-900/80">
                Confirmar y enviar por WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-black">
              {formatCurrency(subtotal)}
            </span>
            <ShoppingBag className="h-5 w-5" />
          </div>
        </button>
      </div>
    </div>
  );
}
