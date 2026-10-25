"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { CartItem } from "@/types/domain";

export interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onRemove: (cartItemId: string) => void;
}

export function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: CartItemRowProps) {
  const details: string[] = [];
  if (item.selectedModifiers && item.selectedModifiers.length > 0) {
    const names = item.selectedModifiers.map((m) =>
      m.priceDelta > 0
        ? `${m.optionName} (+${formatCurrency(m.priceDelta)})`
        : m.optionName
    );
    details.push(names.join(", "));
  } else {
    if (item.selectedSauces && item.selectedSauces.length > 0) {
      details.push(`Salsas: ${item.selectedSauces.join(", ")}`);
    }
    if (item.selectedOption) {
      details.push(`Opción: ${item.selectedOption}`);
    }
  }
  if (item.customNotes) {
    details.push(`Nota: ${item.customNotes}`);
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800/90 bg-[#202024] p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-bold text-zinc-100">
            {item.name}
          </h4>
          <span className="shrink-0 text-sm font-black text-[#E5A93C]">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>

        {details.length > 0 ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {details.join(" • ")}
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            {formatCurrency(item.unitPrice)} c/u
          </span>

          <div className="flex items-center gap-1.5">
            <button
              id={`cart-remove-${item.cartItemId}`}
              type="button"
              onClick={() => onRemove(item.cartItemId)}
              aria-label={`Eliminar ${item.name} del carrito`}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-[#18181B] px-1 py-0.5">
              <button
                id={`cart-dec-${item.cartItemId}`}
                type="button"
                onClick={() => onUpdateQty(item.cartItemId, -1)}
                aria-label={`Disminuir cantidad de ${item.name}`}
                className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-xs font-bold text-zinc-100">
                {item.quantity}
              </span>
              <button
                id={`cart-inc-${item.cartItemId}`}
                type="button"
                onClick={() => onUpdateQty(item.cartItemId, 1)}
                aria-label={`Aumentar cantidad de ${item.name}`}
                className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
