"use client";

import { Flame, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { EnrichedProduct } from "@/types/domain";

export interface ProductCardProps {
  product: EnrichedProduct;
  quantityInCart: number;
  onSelectProduct: (product: EnrichedProduct) => void;
}

export function ProductCard({
  product,
  quantityInCart,
  onSelectProduct,
}: ProductCardProps) {
  const { meta } = product;
  const requiresCustomization =
    Boolean(meta.maxSauces && meta.maxSauces > 0) ||
    Boolean(meta.options && meta.options.length > 0) ||
    Boolean(meta.flavors && meta.flavors.length > 0);

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
        meta.isPromo
          ? "border-[#E5A93C]/50 bg-gradient-to-br from-[#231B12] to-[#18181B]"
          : "border-zinc-800/90 bg-[#18181B] hover:border-zinc-700"
      }`}
    >
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {meta.tag ? (
              <Badge variant={meta.isPromo ? "secondary" : "primary"}>
                {meta.isPromo ? <Sparkles className="h-3 w-3" /> : null}
                {meta.tag}
              </Badge>
            ) : null}

            {meta.maxSauces ? (
              <Badge variant="muted">
                <Flame className="h-3 w-3 text-[#E5A93C]" />
                Hasta {meta.maxSauces}{" "}
                {meta.maxSauces === 1 ? "salsa" : "salsas"}
              </Badge>
            ) : null}

            {meta.flavors && meta.flavors.length > 0 ? (
              <Badge variant="muted">Elige sabor</Badge>
            ) : null}

            {meta.options && meta.options.length > 0 ? (
              <Badge variant="muted">Elige opción</Badge>
            ) : null}
          </div>

          {quantityInCart > 0 ? (
            <span className="inline-flex h-6 items-center rounded-full bg-[#E5A93C] px-2.5 text-xs font-bold text-zinc-950">
              {quantityInCart} en tu pedido
            </span>
          ) : null}
        </div>

        <h3 className="text-base font-bold text-zinc-100 group-hover:text-[#E5A93C] transition-colors">
          {product.name}
        </h3>

        {product.description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {product.description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
        <div>
          <span className="text-xs text-zinc-400">Precio</span>
          <p className="text-lg font-black tracking-tight text-[#E5A93C]">
            {formatCurrency(product.price)}
          </p>
        </div>

        <button
          id={`add-product-btn-${product.id}`}
          type="button"
          onClick={() => onSelectProduct(product)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5A93C] px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-sm transition-all hover:bg-[#CA8A04] active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{requiresCustomization ? "Elegir y agregar" : "Agregar"}</span>
        </button>
      </div>
    </article>
  );
}
