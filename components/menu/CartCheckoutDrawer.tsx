"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Hash,
  IdCard,
  ImageUp,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { CartItemRow } from "@/components/menu/CartItemRow";
import {
  readStoredCustomerProfile,
  saveCustomerProfileToStorage,
} from "@/components/menu/CustomerProfileDrawer";
import { calculateOrderTotals } from "@/lib/services/order.service";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import type {
  ArrivalMode,
  CartItem,
  OrderItemPayload,
  OrderType,
  PaymentMethod,
  PlaceOrderResult,
  ResolvedTable,
  TenantRow,
} from "@/types/domain";

export interface CartCheckoutDrawerProps {
  tenant: TenantRow;
  cart: CartItem[];
  resolvedTable?: ResolvedTable | null;
  onClose: () => void;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onOrderCreated: (orderId: string) => void;
}

function formatCartItemNotes(item: CartItem): string | null {
  const parts: string[] = [];
  if (item.selectedModifiers && item.selectedModifiers.length > 0) {
    parts.push(item.selectedModifiers.map((m) => m.optionName).join(", "));
  } else {
    if (item.selectedSauces && item.selectedSauces.length > 0) {
      parts.push(`Salsas: ${item.selectedSauces.join(", ")}`);
    }
    if (item.selectedOption) {
      parts.push(`Opción: ${item.selectedOption}`);
    }
  }
  if (item.customNotes) {
    parts.push(item.customNotes);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

export function CartCheckoutDrawer({
  tenant,
  cart,
  resolvedTable,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}: CartCheckoutDrawerProps) {
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [manualTableInput, setManualTableInput] = useState<string>(
    resolvedTable ? String(resolvedTable.tableNumber) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [cashCommitment, setCashCommitment] = useState(false);

  const [customerName, setCustomerName] = useState(
    () => readStoredCustomerProfile().name
  );
  const [customerCedula, setCustomerCedula] = useState(
    () => readStoredCustomerProfile().cedula
  );
  const [customerPhone, setCustomerPhone] = useState(
    () => readStoredCustomerProfile().phone
  );
  const [customerAvatarUrl] = useState(
    () => readStoredCustomerProfile().avatarUrl
  );
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const parsedTableNum =
    manualTableInput.trim().length > 0
      ? Number.parseInt(manualTableInput.trim(), 10)
      : null;
  const validTableNum =
    parsedTableNum && !Number.isNaN(parsedTableNum) && parsedTableNum >= 1
      ? parsedTableNum
      : null;

  const effectiveArrivalMode: ArrivalMode =
    orderType === "dine_in" && validTableNum ? "at_table" : "on_the_way";

  const totals = calculateOrderTotals(cart);

  async function handleUploadReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${tenant.slug}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadError) {
        const { data: pub } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(filePath);
        if (pub?.publicUrl) {
          setPaymentProofUrl(pub.publicUrl);
          setUploadingProof(false);
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 480;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            setPaymentProofUrl(dataUrl.slice(0, 1990));
          }
          setUploadingProof(false);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMsg("No se pudo adjuntar la imagen. Intenta con otra captura.");
      setUploadingProof(false);
    }
  }

  async function handleSubmitOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;

    if (
      paymentMethod === "cash" &&
      effectiveArrivalMode === "on_the_way" &&
      !cashCommitment
    ) {
      setErrorMsg(
        "Por favor confirma la casilla de compromiso de asistir al local a retirar tu pedido."
      );
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const itemsPayload: OrderItemPayload[] = cart.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      notes: formatCartItemNotes(item),
      option_ids: item.selectedModifiers?.map((m) => m.optionId) ?? [],
    }));

    try {
      const response = await fetch(`/api/v1/tenants/${tenant.slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          arrivalMode: effectiveArrivalMode,
          paymentMethod,
          paymentProofUrl:
            paymentMethod === "transfer" ? paymentProofUrl.trim() || null : null,
          items: itemsPayload,
          customerName: customerName.trim() || null,
          customerCedula: customerCedula.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerAvatarUrl: customerAvatarUrl || null,
          notes: orderNotes.trim() || null,
          tableNumber: orderType === "dine_in" ? validTableNum : null,
        }),
      });

      const body = (await response.json()) as {
        data?: PlaceOrderResult;
        message?: string;
      };

      if (!response.ok || !body.data) {
        setErrorMsg(
          body.message ?? "Revisa los datos obligatorios e inténtalo de nuevo."
        );
        setIsSubmitting(false);
        return;
      }

      const existingProfile = readStoredCustomerProfile();
      const updatedOrders = [
        {
          orderId: body.data.orderId,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          total: body.data.total,
          createdAt: new Date().toISOString(),
        },
        ...existingProfile.savedOrders.filter(
          (o) => o.orderId !== body.data?.orderId
        ),
      ].slice(0, 15);

      saveCustomerProfileToStorage({
        name: customerName.trim() || existingProfile.name,
        cedula: customerCedula.trim() || existingProfile.cedula,
        phone: customerPhone.trim() || existingProfile.phone,
        avatarUrl: existingProfile.avatarUrl,
        savedOrders: updatedOrders,
      });

      onClearCart();
      onClose();
      onOrderCreated(body.data.orderId);
    } catch {
      setErrorMsg("Error de red al registrar el pedido. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-[#18181B] pt-[env(safe-area-inset-top)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 pt-6 pb-4 sm:pt-4">
          <h2
            id="checkout-drawer-title"
            className="text-base font-black uppercase text-zinc-50"
          >
            Confirmar Pedido
          </h2>
          <button
            id="close-checkout-drawer-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-semibold text-zinc-300">
              Tu carrito está vacío
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitOrder}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.cartItemId}
                    item={item}
                    onUpdateQty={onUpdateQty}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>

              {/* 1. Dine-in vs Takeaway */}
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Modalidad en el Local
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="order-type-dinein-btn"
                    type="button"
                    onClick={() => setOrderType("dine_in")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black transition-all ${
                      orderType === "dine_in"
                        ? "border-[#E11D48] bg-[#E11D48] text-white"
                        : "border-zinc-800 bg-[#202024] text-zinc-300"
                    }`}
                  >
                    <Utensils className="h-4 w-4" />
                    <span>Para Servir</span>
                  </button>
                  <button
                    id="order-type-pickup-btn"
                    type="button"
                    onClick={() => setOrderType("pickup")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black transition-all ${
                      orderType === "pickup"
                        ? "border-[#E11D48] bg-[#E11D48] text-white"
                        : "border-zinc-800 bg-[#202024] text-zinc-300"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Para Llevar</span>
                  </button>
                </div>

                {orderType === "dine_in" ? (
                  <div className="mt-2.5 rounded-2xl border border-zinc-800 bg-[#141418] p-3">
                    <label
                      htmlFor="manual-table-number-input"
                      className="mb-1 flex items-center gap-1.5 text-xs font-bold text-zinc-200"
                    >
                      <Hash className="h-3.5 w-3.5 text-[#E11D48]" />
                      <span>
                        Número de Mesa (si ya estás en el local)
                      </span>
                    </label>
                    <input
                      id="manual-table-number-input"
                      type="number"
                      min="1"
                      max="500"
                      inputMode="numeric"
                      value={manualTableInput}
                      onChange={(e) => setManualTableInput(e.target.value)}
                      placeholder="Digita tu mesa (ej. 4) o déjalo vacío si vas en camino"
                      className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                ) : null}
              </div>

              {/* 2. Payment Method */}
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Método de Pago
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="payment-method-transfer-btn"
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                      paymentMethod === "transfer"
                        ? "border-[#E11D48] bg-[#E11D48]/15 text-[#FB7185]"
                        : "border-zinc-800 bg-[#202024] text-zinc-300"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Transferencia</span>
                  </button>

                  <button
                    id="payment-method-cash-btn"
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                      paymentMethod === "cash"
                        ? "border-[#E11D48] bg-[#E11D48]/15 text-[#FB7185]"
                        : "border-zinc-800 bg-[#202024] text-zinc-300"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    id="payment-method-card-soon-btn"
                    type="button"
                    disabled
                    className="flex cursor-not-allowed flex-col items-center justify-center gap-1 rounded-xl border border-zinc-800/70 bg-[#141417] p-2 text-[11px] font-semibold text-zinc-500 opacity-70"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Tarjeta</span>
                  </button>
                </div>

                {paymentMethod === "transfer" ? (
                  <div className="mt-2.5 space-y-2.5 rounded-2xl border border-zinc-800 bg-[#141418] p-3 text-xs text-zinc-300">
                    <div>
                      <p className="font-bold text-[#FB7185]">
                        Datos Bancarios • {tenant.name}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[11px] text-zinc-300">
                        {tenant.bank_details ||
                          "Realiza la transferencia por el total y adjunta el comprobante."}
                      </p>
                    </div>

                    <input
                      ref={proofInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadReceipt}
                      className="hidden"
                    />
                    <button
                      id="upload-transfer-proof-btn"
                      type="button"
                      disabled={uploadingProof}
                      onClick={() => proofInputRef.current?.click()}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                        paymentProofUrl
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                          : "border-dashed border-[#E11D48]/60 bg-[#202024] text-zinc-100 hover:border-[#E11D48]"
                      }`}
                    >
                      {uploadingProof ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Adjuntando...</span>
                        </>
                      ) : paymentProofUrl ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Comprobante adjuntado</span>
                        </>
                      ) : (
                        <>
                          <ImageUp className="h-4 w-4 text-[#E11D48]" />
                          <span>Adjuntar Comprobante *</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Compromiso de Retiro en Efectivo</span>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-200/90">
                      {effectiveArrivalMode === "on_the_way"
                        ? "Pre-orden en camino en efectivo habilitada hasta $15.00 en cuentas nuevas. No retirar un pedido bloquea futuros pagos en efectivo."
                        : `Pagarás en efectivo en el local (Mesa #${validTableNum}).`}
                    </p>
                    {effectiveArrivalMode === "on_the_way" ? (
                      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl bg-black/25 p-2 text-[11px] font-semibold text-zinc-100">
                        <input
                          id="cash-commitment-checkbox"
                          type="checkbox"
                          checked={cashCommitment}
                          onChange={(e) => setCashCommitment(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-[#E11D48]"
                        />
                        <span>
                          Confirmo que iré al local a retirar y pagar mi pedido.
                        </span>
                      </label>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 3. Customer Identity */}
              <div className="space-y-2.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Tus Datos
                </span>
                <input
                  id="checkout-customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre y Apellido *"
                  className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      id="checkout-customer-cedula"
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      required
                      value={customerCedula}
                      onChange={(e) => setCustomerCedula(e.target.value)}
                      placeholder="Cédula *"
                      className="w-full rounded-xl border border-zinc-800 bg-[#202024] py-2 pr-3 pl-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>

                  <input
                    id="checkout-customer-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Celular *"
                    className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                  />
                </div>

                <input
                  id="checkout-order-notes"
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Nota opcional (ej. llego en 10 min, sin cebolla)"
                  className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>

              {errorMsg ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
                >
                  {errorMsg}
                </div>
              ) : null}
            </div>

            <div className="border-t border-zinc-800 bg-[#131316] px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-base font-black text-zinc-50">
                <span>Total</span>
                <span className="text-[#FB7185]">
                  {formatCurrency(totals.total)}
                </span>
              </div>

              <button
                id="submit-invenue-order-btn"
                type="submit"
                disabled={isSubmitting || uploadingProof}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#E11D48]/30 transition-colors hover:bg-[#BE123C] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Confirmar Pedido ({formatCurrency(totals.total)})
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
