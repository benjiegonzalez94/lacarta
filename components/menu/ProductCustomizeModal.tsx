"use client";

import { useState } from "react";
import { Check, Flame, Minus, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { EnrichedProduct, SauceOption } from "@/types/domain";

export interface ProductCustomizeModalProps {
  product: EnrichedProduct;
  sauces: SauceOption[];
  onClose: () => void;
  onConfirmAdd: (params: {
    product: EnrichedProduct;
    quantity: number;
    selectedSauces: string[];
    selectedOption: string | null;
    customNotes: string;
  }) => void;
}

export function ProductCustomizeModal({
  product,
  sauces,
  onClose,
  onConfirmAdd,
}: ProductCustomizeModalProps) {
  const maxSauces = product.meta.maxSauces ?? 0;
  const choiceList =
    product.meta.options ?? product.meta.flavors ?? ([] as string[]);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(
    choiceList.length > 0 ? choiceList[0] : null
  );
  const [customNotes, setCustomNotes] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleSauce(sauceName: string) {
    setErrorMessage(null);
    setSelectedSauces((prev) => {
      if (prev.includes(sauceName)) {
        return prev.filter((item) => item !== sauceName);
      }
      if (maxSauces > 0 && prev.length >= maxSauces) {
        return prev;
      }
      return [...prev, sauceName];
    });
  }

  function handleConfirm() {
    if (maxSauces > 0 && selectedSauces.length === 0) {
      setErrorMessage("Por favor selecciona al menos 1 salsa para tus alitas.");
      return;
    }
    if (choiceList.length > 0 && !selectedOption) {
      setErrorMessage("Por favor selecciona una opción o sabor.");
      return;
    }

    onConfirmAdd({
      product,
      quantity,
      selectedSauces,
      selectedOption,
      customNotes: customNotes.trim(),
    });
  }

  const lineTotal = product.price * quantity;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#18181B] shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
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
          {maxSauces > 0 ? (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Elige tus salsas
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Puedes seleccionar de 1 hasta {maxSauces}{" "}
                    {maxSauces === 1 ? "salsa" : "salsas"}
                  </p>
                </div>
                <Badge
                  variant={selectedSauces.length > 0 ? "primary" : "muted"}
                >
                  {selectedSauces.length}/{maxSauces} elegidas
                </Badge>
              </div>

              <div className="space-y-2">
                {sauces.map((sauce) => {
                  const isSelected = selectedSauces.includes(sauce.name);
                  const isDisabled =
                    !isSelected && selectedSauces.length >= maxSauces;

                  return (
                    <button
                      key={sauce.id}
                      id={`sauce-option-${sauce.id}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleSauce(sauce.name)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        isSelected
                          ? "border-[#E5A93C] bg-[#E5A93C]/12 text-zinc-50"
                          : isDisabled
                            ? "cursor-not-allowed border-zinc-800/50 bg-zinc-900/40 opacity-50"
                            : "border-zinc-800 bg-[#202024] text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <span>{sauce.name}</span>
                          {sauce.spicyIcon ? (
                            <span aria-label="Picante">{sauce.spicyIcon}</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {sauce.description}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          isSelected
                            ? "border-[#E5A93C] bg-[#E5A93C] text-zinc-950"
                            : "border-zinc-600"
                        }`}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {choiceList.length > 0 ? (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-100">
                  {product.meta.flavors
                    ? "Selecciona el sabor"
                    : "Selecciona una opción"}
                </h3>
                <Badge variant="primary">Obligatorio</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {choiceList.map((choice) => {
                  const isSelected = selectedOption === choice;
                  return (
                    <button
                      key={choice}
                      id={`choice-option-${choice.toLowerCase().replace(/\s+/g, "-")}`}
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSelectedOption(choice);
                      }}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-[#E5A93C] bg-[#E5A93C]/15 text-[#E5A93C]"
                          : "border-zinc-800 bg-[#202024] text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span>{choice}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

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
              className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className=" flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
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
            className="flex flex-1 items-center justify-between rounded-xl bg-[#E5A93C] px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-[#CA8A04]"
          >
            <span>Agregar al pedido</span>
            <span>{formatCurrency(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
