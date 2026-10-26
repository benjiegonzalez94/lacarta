"use client";

import { useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Pencil,
  SlidersHorizontal,
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
import type {
  CategoryRow,
  ModifierGroupWithOptions,
  ProductRow,
} from "@/types/domain";

export interface AdminProductItemProps {
  product: ProductRow;
  categories: CategoryRow[];
  modifierGroups: ModifierGroupWithOptions[];
  assignedGroupIds: string[];
}

export function AdminProductItem({
  product,
  categories,
  modifierGroups,
  assignedGroupIds,
}: AdminProductItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [imgError, setImgError] = useState(false);

  const assignedGroups = modifierGroups.filter((group) =>
    assignedGroupIds.includes(group.id)
  );

  return (
    <div className="py-4">
      <div className="flex items-start gap-3.5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900">
          {product.image_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold leading-snug text-zinc-100">
              {product.name}
            </h4>
            <span className="shrink-0 rounded-lg bg-[#E11D48]/15 px-2.5 py-0.5 text-sm font-black text-[#E11D48]">
              {formatCurrency(Number(product.price))}
            </span>
          </div>

          {product.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
              {product.description}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={product.is_available ? "success" : "danger"}>
              {product.is_available ? "Disponible" : "Agotado / Oculto"}
            </Badge>
            {assignedGroups.map((group) => (
              <span
                key={group.id}
                className="inline-flex items-center gap-1 rounded-md border border-[#E11D48]/30 bg-[#E11D48]/10 px-2 py-0.5 text-[11px] font-semibold text-[#E11D48]"
              >
                <SlidersHorizontal className="h-2.5 w-2.5 shrink-0" />
                <span>{group.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800/50 pt-2.5">
        <button
          id={`edit-product-toggle-${product.id}`}
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E11D48] hover:text-[#E11D48]"
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
            className="rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E11D48]"
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
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#202024] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {isEditing ? (
        <form
          action={async (formData) => {
            await updateProductAction(formData);
            setImgError(false);
            setIsEditing(false);
          }}
          className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-[#E11D48]/30 bg-[#141418] p-4 sm:grid-cols-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="isAvailable"
            value={product.is_available ? "true" : "false"}
          />
          <input type="hidden" name="syncModifiers" value="true" />

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
              <Upload className="h-3.5 w-3.5 text-[#E11D48]" />
              <span>Subir nueva foto (JPG/PNG/WebP máx. 5 MB)</span>
            </label>
            <input
              id={`edit-img-file-${product.id}`}
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="w-full rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-[#E11D48] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white"
            />
          </div>

          {modifierGroups.length > 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-[#202024] p-3 sm:col-span-2">
              <p className="mb-2 text-xs font-bold text-zinc-200">
                Grupos de Modificadores / Variantes (Salsas, Sabores, Extras)
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {modifierGroups.map((group) => (
                  <label
                    key={group.id}
                    htmlFor={`mod-group-${product.id}-${group.id}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/70 bg-[#18181B] px-2.5 py-2 text-xs text-zinc-200 hover:border-[#E11D48]"
                  >
                    <input
                      id={`mod-group-${product.id}-${group.id}`}
                      type="checkbox"
                      name="modifierGroupIds"
                      value={group.id}
                      defaultChecked={assignedGroupIds.includes(group.id)}
                      className="h-3.5 w-3.5 rounded accent-[#E11D48]"
                    />
                    <span className="truncate font-medium">{group.name}</span>
                    <span className="ml-auto text-[10px] text-zinc-400">
                      ({group.min_select}-{group.max_select})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

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
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-4 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
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
