import { Suspense } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
} from "@/app/(dashboard)/admin/actions";
import { AdminModifierGroupsSection } from "@/components/admin/AdminModifierGroupsSection";
import { AdminProductItem } from "@/components/admin/AdminProductItem";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";

async function AdminProductsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const tenant = await getTenantForOwner(supabase, user.id);
  if (!tenant) return null;

  const data = await getAdminDashboardData(supabase, tenant);

  const productGroupIdsMap = new Map<string, string[]>();
  for (const link of data.productModifierLinks) {
    const list = productGroupIdsMap.get(link.product_id) ?? [];
    list.push(link.group_id);
    productGroupIdsMap.set(link.product_id, list);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
            Nueva Categoría
          </h2>
          <form action={createCategoryAction} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="new-category-name"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Nombre de categoría
              </label>
              <input
                id="new-category-name"
                name="name"
                type="text"
                required
                placeholder="Ej: Postres"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="new-category-sort"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Orden de aparición
              </label>
              <input
                id="new-category-sort"
                name="sortOrder"
                type="number"
                defaultValue={data.categories.length}
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <button
              id="create-category-submit-btn"
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E5A93C] px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
            >
              <Plus className="h-4 w-4" />
              <span>Crear Categoría</span>
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
            Nuevo Producto
          </h2>
          <form
            action={createProductAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div>
              <label
                htmlFor="new-product-category"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Categoría
              </label>
              <select
                id="new-product-category"
                name="categoryId"
                required
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              >
                {data.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-product-price"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Precio (USD)
              </label>
              <input
                id="new-product-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="5.00"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="new-product-name"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Nombre del plato / producto
              </label>
              <input
                id="new-product-name"
                name="name"
                type="text"
                required
                placeholder="Ej: 12 Alitas + Porción de Papas"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="new-product-description"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Descripción
              </label>
              <input
                id="new-product-description"
                name="description"
                type="text"
                placeholder="Ingredientes, salsas a elección..."
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-product-image-url"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                URL de imagen (opcional)
              </label>
              <input
                id="new-product-image-url"
                name="imageUrl"
                type="url"
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-product-image-file"
                className="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-300"
              >
                <Upload className="h-3.5 w-3.5 text-[#E5A93C]" />
                <span>O subir foto desde tu dispositivo</span>
              </label>
              <input
                id="new-product-image-file"
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-1.5 text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-[#E5A93C] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-zinc-950"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                id="create-product-submit-btn"
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E5A93C] px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
              >
                <Plus className="h-4 w-4" />
                <span>Guardar Producto en el Menú</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AdminModifierGroupsSection modifierGroups={data.modifierGroups} />

      <div className="space-y-6">
        {data.categories.map((category) => {
          const categoryProducts = data.products.filter(
            (p) => p.category_id === category.id
          );
          return (
            <section
              key={category.id}
              className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5"
            >
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-zinc-100">
                    {category.name}
                  </h3>
                  <Badge variant="muted">
                    {categoryProducts.length} productos
                  </Badge>
                </div>

                {categoryProducts.length === 0 ? (
                  <form action={deleteCategoryAction}>
                    <input
                      type="hidden"
                      name="categoryId"
                      value={category.id}
                    />
                    <button
                      id={`delete-category-${category.id}`}
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar categoría vacía</span>
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="divide-y divide-zinc-800/70">
                {categoryProducts.map((product) => (
                  <AdminProductItem
                    key={product.id}
                    product={product}
                    categories={data.categories}
                    modifierGroups={data.modifierGroups}
                    assignedGroupIds={productGroupIdsMap.get(product.id) ?? []}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-400">Cargando catálogo...</div>
      }
    >
      <AdminProductsContent />
    </Suspense>
  );
}
