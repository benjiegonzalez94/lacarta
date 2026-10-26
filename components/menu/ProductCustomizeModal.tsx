"use client";

import { useState } from "react";
import { Check, Flame, Minus, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, roundMoney } from "@/lib/utils/currency";
import type {
  EnrichedProduct,
  ModifierGroupWithOptions,
  ModifierOptionRow,
  SelectedModifierChoice,
} from "@/types/domain";

export interface ProductCustomizeModalProps {
  product: EnrichedProduct;
  onClose: () => void;
  onConfirmAdd: (params: {
    product: EnrichedProduct;
    quantity: number;
    selectedModifiers: SelectedModifierChoice[];
    customNotes: string;
  }) => void;
}

export function ProductCustomizeModal({
  product,
  onClose,
  onConfirmAdd,
}: ProductCustomizeModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectionsByGroup, setSelectionsByGroup] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    for (const grp of product.modifierGroups) {
      if (grp.min_select === 1 && grp.max_select === 1 && grp.options[0]) {
        initial[grp.id] = [grp.options[0].id];
      } else {
        initial[grp.id] = [];
      }
    }
    return initial;
  });
  const [customNotes, setCustomNotes] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleOption(
    group: ModifierGroupWithOptions,
    option: ModifierOptionRow
  ) {
    setErrorMessage(null);
    setSelectionsByGroup((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(option.id);

      // Single-choice group (radio behavior)
      if (group.max_select === 1) {
        if (isSelected && group.min_select === 0) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [option.id] };
      }

      // Multi-choice group (checkbox behavior up to max_select)
      if (isSelected) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== option.id),
        };
      }
      if (current.length >= group.max_select) {
        return prev;
      }
      return {
        ...prev,
        [group.id]: [...current, option.id],
      };
    });
  }

  function buildSelectedModifiers(): SelectedModifierChoice[] {
    const result: SelectedModifierChoice[] = [];
    for (const grp of product.modifierGroups) {
      const selectedIds = selectionsByGroup[grp.id] ?? [];
      for (const opt of grp.options) {
        if (selectedIds.includes(opt.id)) {
          result.push({
            optionId: opt.id,
            groupId: grp.id,
            groupName: grp.name,
            optionName: opt.name,
            priceDelta: Number(opt.price_delta),
          });
        }
      }
    }
    return result;
  }

  function handleConfirm() {
    for (const grp of product.modifierGroups) {
      const selectedCount = (selectionsByGroup[grp.id] ?? []).length;
      if (selectedCount < grp.min_select) {
        setErrorMessage(
          `Selecciona al menos ${grp.min_select} opción en "${grp.name}".`
        );
        return;
      }
    }

    onConfirmAdd({
      product,
      quantity,
      selectedModifiers: buildSelectedModifiers(),
      customNotes: customNotes.trim(),
    });
  }

  const currentModifiers = buildSelectedModifiers();
  const extraPricePerUnit = currentModifiers.reduce(
    (sum, m) => sum + m.priceDelta,
    0
  );
  const unitPrice = roundMoney(product.price + extraPricePerUnit);
  const lineTotal = roundMoney(unitPrice * quantity);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#18181B] shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-14 w-14 shrink-0 rounded-xl border border-zinc-700 object-cover"
              />
            ) : null}
            <div>
              <h2
                id="customize-modal-title"
                className="text-lg font-bold text-zinc-50"
              >
                {product.name}
              </h2>
              {product.description ? (
                <p className="mt-1 text-xs text-zinc-400">
                  {product.description}
                </p>
              ) : null}
            </div>
          </div>
          <button
            id="close-customize-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de personalización"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {product.modifierGroups.map((group) => {
            const selectedIds = selectionsByGroup[group.id] ?? [];
            const isRequired = group.min_select > 0;
            const subtitle =
              group.min_select === 1 && group.max_select === 1
                ? "Selecciona 1 opción"
                : group.min_select > 0
                  ? `Elige de ${group.min_select} a ${group.max_select} opciones`
                  : `Opcional (hasta ${group.max_select})`;

            return (
              <div key={group.id}>
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">
                      {group.name}
                    </h3>
                    <p className="text-xs text-zinc-400">{subtitle}</p>
                  </div>
                  <Badge
                    variant={
                      selectedIds.length >= group.min_select && isRequired
                        ? "primary"
                        : "muted"
                    }
                  >
                    {group.max_select > 1
                      ? `${selectedIds.length}/${group.max_select}`
                      : isRequired
                        ? "Obligatorio"
                        : "Opcional"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.options.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    const isDisabled =
                      group.max_select > 1 &&
                      !isSelected &&
                      selectedIds.length >= group.max_select;
                    const delta = Number(option.price_delta);

                    return (
                      <button
                        key={option.id}
                        id={`mod-option-${option.id}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleOption(group, option)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          isSelected
                            ? "border-[#E11D48] bg-[#E11D48]/12 text-zinc-50"
                            : isDisabled
                              ? "cursor-not-allowed border-zinc-800/50 bg-zinc-900/40 opacity-50"
                              : "border-zinc-800 bg-[#202024] text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span>{option.name}</span>
                          {delta > 0 ? (
                            <span className="rounded-md bg-[#E11D48]/20 px-1.5 py-0.5 text-xs font-bold text-[#E11D48]">
                              +{formatCurrency(delta)}
                            </span>
                          ) : null}
                        </div>

                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            isSelected
                              ? "border-[#E11D48] bg-[#E11D48] text-white"
                              : "border-zinc-600"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <label
              htmlFor="product-custom-notes"
              className="mb-1.5 block text-xs font-semibold text-zinc-300"
            >
              Notas adicionales (opcional)
            </label>
            <input
              id="product-custom-notes"
              type="text"
              maxLength={150}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ej: Salsa aparte, sin cebolla, bien doradas..."
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
            >
              <Flame className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-[#131316] px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#18181B] p-1">
            <button
              id="customize-qty-decrease-btn"
              type="button"
              aria-label="Disminuir cantidad"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-zinc-100">
              {quantity}
            </span>
            <button
              id="customize-qty-increase-btn"
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            id="confirm-customize-add-btn"
            type="button"
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-between rounded-xl bg-[#E11D48] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#BE123C]"
          >
            <span>Agregar al pedido</span>
            <span>{formatCurrency(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
