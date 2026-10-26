"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  deleteCustomerCardAction,
  getCustomerCardsAction,
  saveCustomerCardAction,
} from "@/app/card-actions";
import type { CustomerCardRow } from "@/types/domain";

export interface CustomerSavedCardsManagerProps {
  selectedCardId?: string | null;
  onSelectCard?: (card: CustomerCardRow | null) => void;
  compact?: boolean;
}

export function CustomerSavedCardsManager({
  selectedCardId,
  onSelectCard,
  compact = false,
}: CustomerSavedCardsManagerProps) {
  const [cards, setCards] = useState<CustomerCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New card inputs
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2028");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    let mounted = true;
    void getCustomerCardsAction().then((res) => {
      if (mounted) {
        setCards(res);
        setLoading(false);
        if (res.length > 0 && onSelectCard && !selectedCardId) {
          const defaultCard = res.find((c) => c.is_default) ?? res[0];
          onSelectCard(defaultCard);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [onSelectCard, selectedCardId]);

  function detectBrand(num: string): "Visa" | "Mastercard" | "Diners" | "Amex" {
    const clean = num.replace(/\D/g, "");
    if (/^4/.test(clean)) return "Visa";
    if (/^5[1-5]/.test(clean)) return "Mastercard";
    if (/^3[47]/.test(clean)) return "Amex";
    if (/^3(?:0[0-5]|[68])/.test(clean)) return "Diners";
    return "Visa";
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSavingCard(true);

    const brand = detectBrand(cardNumber);
    const res = await saveCustomerCardAction({
      cardBrand: brand,
      cardNumber,
      holderName,
      expMonth: Number.parseInt(expMonth, 10),
      expYear: Number.parseInt(expYear, 10),
      isDefault: cards.length === 0,
    });

    setSavingCard(false);
    if (!res.ok || !res.card) {
      setErrorMsg(res.error ?? "No se pudo registrar la tarjeta.");
      return;
    }

    const updated = [res.card, ...cards];
    setCards(updated);
    onSelectCard?.(res.card);
    setShowAddForm(false);
    setCardNumber("");
    setHolderName("");
    setCvv("");
  }

  async function handleDeleteCard(cardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(cardId);
    await deleteCustomerCardAction(cardId);
    const filtered = cards.filter((c) => c.id !== cardId);
    setCards(filtered);
    setDeletingId(null);
    if (selectedCardId === cardId) {
      onSelectCard?.(filtered[0] ?? null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E11D48]" />
        <span>Cargando tarjetas guardadas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.length > 0 ? (
        <div className="space-y-2">
          {cards.map((card) => {
            const isSelected = selectedCardId === card.id;
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectCard?.(card)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectCard?.(card);
                  }
                }}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? "border-[#E11D48] bg-[#E11D48]/15"
                    : "border-zinc-800 bg-[#121215] hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-zinc-900 font-mono text-[10px] font-black text-white">
                    {card.card_brand}
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-100">
                      •••• •••• •••• {card.last4}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {card.holder_name} • Vence {card.exp_month}/{String(card.exp_year).slice(-2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E11D48] text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : null}

                  {!compact ? (
                    <button
                      type="button"
                      aria-label="Eliminar tarjeta"
                      disabled={deletingId === card.id}
                      onClick={(e) => void handleDeleteCard(card.id, e)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    >
                      {deletingId === card.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 p-3.5 text-center text-xs text-zinc-400">
          No tienes tarjetas guardadas en tu perfil.
        </div>
      )}

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-[#FB7185]" />
          <span>Agregar tarjeta de débito o crédito</span>
        </button>
      ) : (
        <form
          onSubmit={handleAddCard}
          className="space-y-3 rounded-2xl border border-zinc-700 bg-[#141418] p-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-200">
              Registrar Nueva Tarjeta
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-zinc-400">
              Número de Tarjeta
            </label>
            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4111 2222 3333 4242"
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-zinc-400">
              Nombre en la Tarjeta
            </label>
            <input
              type="text"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="JUAN PEREZ"
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs uppercase text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-zinc-400">
                Mes
              </label>
              <select
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-2 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-zinc-400">
                Año
              </label>
              <select
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-2 py-2 text-xs text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => String(2025 + i)).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-zinc-400">
                CVV
              </label>
              <input
                type="password"
                required
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
              />
            </div>
          </div>

          {errorMsg ? (
            <p className="text-[11px] font-semibold text-red-400">{errorMsg}</p>
          ) : null}

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Datos encriptados bajo estándar seguro PCI-DSS</span>
          </div>

          <button
            type="submit"
            disabled={savingCard}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E11D48] px-3 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
          >
            {savingCard ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            <span>Guardar Tarjeta en mi Perfil</span>
          </button>
        </form>
      )}
    </div>
  );
}
