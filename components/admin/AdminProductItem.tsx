"use client";

import { useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  deleteProductAction,
  toggleProductAvailabilityAction,
  updateProductAction,
} from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { CategoryRow, ProductRow } from "@/types/domain";

export interface AdminProductItemProps {
  product: ProductRow;
  categories: CategoryRow[];
}

export function AdminProductItem({
  product,
  categories,
}: AdminProductItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-zinc-100">
                {product.name}
              </span>
              <Badge variant={product.is_available ? "success" : "danger"}>
                {product.is_available ? "Disponible" : "Agotado / Oculto"}
              </Badge>
            </div>
            {product.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                {product.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm font-black text-[#E5A93C]">
            {formatCurrency(Number(product.price))}
          </span>

          <button
            id={`edit-product-toggle-${product.id}`}
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E5A93C] hover:text-[#E5A93C]"
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" />
                <span>Cancelar</span>
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                <span>Editar</span>
              </>
            )}
          </button>

          <form action={toggleProductAvailabilityAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="hidden"
              name="nextAvailable"
              value={product.is_available ? "false" : "true"}
            />
            <button
              id={`toggle-product-${product.id}`}
              type="submit"
              className="rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E5A93C]"
            >
              {product.is_available ? "Pausar" : "Activar"}
            </button>
          </form>

          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <button
              id={`delete-product-${product.id}`}
              type="submit"
              aria-label={`Eliminar ${product.name}`}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {isEditing ? (
        <form
          action={async (formData) => {
            await updateProductAction(formData);
            setIsEditing(false);
          }}
          className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-[#E5A93C]/30 bg-[#141418] p-4 sm:grid-cols-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="isAvailable"
            value={product.is_available ? "true" : "false"}
          />

          <div>
            <label
              htmlFor={`edit-name-${product.id}`}
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Nombre del producto
            </label>
            <input
              id={`edit-name-${product.id}`}
              name="name"
              type="text"
              required
              defaultValue={product.name}
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor={`edit-price-${product.id}`}
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Precio (USD)
              </label>
              <input
                id={`edit-price-${product.id}`}
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={Number(product.price)}
                className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor={`edit-sort-${product.id}`}
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Orden
              </label>
              <input
                id={`edit-sort-${product.id}`}
                name="sortOrder"
                type="number"
                defaultValue={product.sort_order}
                className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`edit-cat-${product.id}`}
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Categoría
            </label>
            <select
              id={`edit-cat-${product.id}`}
              name="categoryId"
              defaultValue={product.category_id}
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`edit-desc-${product.id}`}
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              Descripción
            </label>
            <input
              id={`edit-desc-${product.id}`}
              name="description"
              type="text"
              defaultValue={product.description ?? ""}
              placeholder="Ingredientes, salsas a elección..."
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor={`edit-img-url-${product.id}`}
              className="mb-1 block text-xs font-semibold text-zinc-300"
            >
              URL de imagen (o sube un archivo al lado)
            </label>
            <input
              id={`edit-img-url-${product.id}`}
              name="imageUrl"
              type="url"
              defaultValue={product.image_url ?? ""}
              placeholder="https://..."
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor={`edit-img-file-${product.id}`}
              className="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-300"
            >
              <Upload className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>Subir nueva foto (JPG/PNG/WebP máx. 5 MB)</span>
            </label>
            <input
              id={`edit-img-file-${product.id}`}
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-[#E5A93C] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              id={`cancel-edit-btn-${product.id}`}
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-xl border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              id={`save-edit-btn-${product.id}`}
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5A93C] px-4 py-2 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
