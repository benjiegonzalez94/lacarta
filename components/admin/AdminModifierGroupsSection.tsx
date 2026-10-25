import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  createModifierGroupAction,
  createModifierOptionAction,
  deleteModifierGroupAction,
  deleteModifierOptionAction,
} from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { ModifierGroupWithOptions } from "@/types/domain";

export interface AdminModifierGroupsSectionProps {
  modifierGroups: ModifierGroupWithOptions[];
}

export function AdminModifierGroupsSection({
  modifierGroups,
}: AdminModifierGroupsSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5A93C]/15 text-[#E5A93C]">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
              Motor de Modificadores, Variantes y Extras
            </h2>
            <p className="text-xs text-zinc-400">
              Crea grupos de opciones (Salsas, Términos de carne, Tamaños,
              Toppings con costo extra) y asígnalos a cualquier producto.
            </p>
          </div>
        </div>
        <Badge variant="primary">{modifierGroups.length} grupos activos</Badge>
      </div>

      <form
        action={createModifierGroupAction}
        className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-800/90 bg-[#202024] p-4 sm:grid-cols-5"
      >
        <div className="sm:col-span-2">
          <label
            htmlFor="new-mod-group-name"
            className="mb-1 block text-xs font-semibold text-zinc-300"
          >
            Nombre del grupo (Ej: Elige tus Salsas, Extras, Tamaño)
          </label>
          <input
            id="new-mod-group-name"
            name="name"
            type="text"
            required
            placeholder="Ej: Extras para tu Hamburguesa"
            className="w-full rounded-xl border border-zinc-700 bg-[#18181B] px-3 py-2 text-xs text-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="new-mod-group-min"
            className="mb-1 block text-xs font-semibold text-zinc-300"
          >
            Mínimo obligatorio
          </label>
          <input
            id="new-mod-group-min"
            name="minSelect"
            type="number"
            min="0"
            max="20"
            defaultValue={0}
            className="w-full rounded-xl border border-zinc-700 bg-[#18181B] px-3 py-2 text-xs text-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="new-mod-group-max"
            className="mb-1 block text-xs font-semibold text-zinc-300"
          >
            Máximo permitido
          </label>
          <input
            id="new-mod-group-max"
            name="maxSelect"
            type="number"
            min="1"
            max="20"
            defaultValue={1}
            className="w-full rounded-xl border border-zinc-700 bg-[#18181B] px-3 py-2 text-xs text-zinc-100"
          />
        </div>

        <div className="flex items-end">
          <button
            id="create-mod-group-btn"
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E5A93C] px-3 py-2 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Crear Grupo</span>
          </button>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {modifierGroups.map((group) => (
          <div
            key={group.id}
            className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#202024]/70 p-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-zinc-100">
                    {group.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Selección: mín. {group.min_select} / máx. {group.max_select}
                  </p>
                </div>

                <form action={deleteModifierGroupAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <button
                    id={`delete-mod-group-${group.id}`}
                    type="submit"
                    aria-label={`Eliminar grupo ${group.name}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {group.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-[#18181B] px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <span>{opt.name}</span>
                    {Number(opt.price_delta) > 0 ? (
                      <span className="font-bold text-[#E5A93C]">
                        +{formatCurrency(Number(opt.price_delta))}
                      </span>
                    ) : null}
                    <form action={deleteModifierOptionAction}>
                      <input type="hidden" name="optionId" value={opt.id} />
                      <button
                        id={`delete-mod-opt-${opt.id}`}
                        type="submit"
                        aria-label={`Eliminar opción ${opt.name}`}
                        className="ml-0.5 text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                ))}
                {group.options.length === 0 ? (
                  <span className="text-xs text-zinc-500">
                    Sin opciones registradas aún.
                  </span>
                ) : null}
              </div>
            </div>

            <form
              action={createModifierOptionAction}
              className="mt-3 flex items-center gap-2 border-t border-zinc-800/80 pt-3"
            >
              <input type="hidden" name="groupId" value={group.id} />
              <input
                id={`new-opt-name-${group.id}`}
                name="name"
                type="text"
                required
                placeholder="Nueva opción (ej: Queso Cheddar)"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <input
                id={`new-opt-price-${group.id}`}
                name="priceDelta"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                placeholder="+USD"
                aria-label="Costo extra en USD"
                className="w-20 rounded-lg border border-zinc-700 bg-[#18181B] px-2 py-1.5 text-xs text-zinc-100"
              />
              <button
                id={`add-opt-btn-${group.id}`}
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-[#E5A93C] hover:bg-zinc-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Opción</span>
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
