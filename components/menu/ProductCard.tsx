"use client";

import { Flame, Plus, Sparkles, Utensils } from "lucide-react";
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
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
        meta.isPromo
          ? "border-[#E5A93C]/50 bg-gradient-to-br from-[#231B12] to-[#18181B]"
          : "border-zinc-800/90 bg-[#18181B] hover:border-zinc-700"
      }`}
    >
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-zinc-900">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-600">
              <Utensils className="h-10 w-10" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-black/40" />

          <div className="absolute top-2.5 right-2.5 left-2.5 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.tag ? (
                <Badge
                  variant={meta.isPromo ? "secondary" : "primary"}
                  className="backdrop-blur-md bg-black/60"
                >
                  {meta.isPromo ? <Sparkles className="h-3 w-3" /> : null}
                  {meta.tag}
                </Badge>
              ) : null}

              {meta.maxSauces ? (
                <Badge
                  variant="muted"
                  className="backdrop-blur-md bg-black/65"
                >
                  <Flame className="h-3 w-3 text-[#E5A93C]" />
                  Hasta {meta.maxSauces}{" "}
                  {meta.maxSauces === 1 ? "salsa" : "salsas"}
                </Badge>
              ) : null}
            </div>

            {quantityInCart > 0 ? (
              <span className="inline-flex h-6 items-center rounded-full bg-[#E5A93C] px-2.5 text-xs font-black text-zinc-950 shadow-md">
                {quantityInCart} en pedido
              </span>
            ) : null}
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {meta.flavors && meta.flavors.length > 0 ? (
              <Badge variant="muted">Elige sabor</Badge>
            ) : null}

            {meta.options && meta.options.length > 0 ? (
              <Badge variant="muted">Elige opción</Badge>
            ) : null}
          </div>

          <h3 className="text-base font-bold text-zinc-100 transition-colors group-hover:text-[#E5A93C]">
            {product.name}
          </h3>

          {product.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-4 mt-4 mb-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
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
