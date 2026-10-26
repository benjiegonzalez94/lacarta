"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  IdCard,
  ImageUp,
  Landmark,
  Loader2,
  Phone,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { CartItemRow } from "@/components/menu/CartItemRow";
import {
  readStoredCustomerProfile,
  saveCustomerProfileToStorage,
} from "@/components/menu/CustomerProfileDrawer";
import { CustomerSavedCardsManager } from "@/components/menu/CustomerSavedCardsManager";
import { calculateOrderTotals } from "@/lib/services/order.service";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import type {
  CartItem,
  CustomerCardRow,
  OrderItemPayload,
  OrderType,
  PaymentMethod,
  PlaceOrderResult,
  TenantRow,
} from "@/types/domain";

export interface CartCheckoutDrawerProps {
  tenant: TenantRow;
  cart: CartItem[];
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
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}: CartCheckoutDrawerProps) {
  const [orderType, setOrderType] = useState<OrderType>("dine_in");

  // Determine available payment methods from tenant configuration
  const cashAllowed = tenant.cash_payments_enabled ?? true;
  const transferAllowed = tenant.transfer_payments_enabled ?? true;
  const cardAllowed = tenant.card_payments_enabled ?? false;

  const initialPaymentMethod: PaymentMethod = transferAllowed
    ? "transfer"
    : cashAllowed
      ? "cash"
      : cardAllowed
        ? "card"
        : "transfer";

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(initialPaymentMethod);
  const [selectedCard, setSelectedCard] = useState<CustomerCardRow | null>(null);

  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

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
  const totals = calculateOrderTotals(cart);

  function handleCopyBankDetails() {
    if (!tenant.bank_details) return;
    void navigator.clipboard.writeText(tenant.bank_details);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  }

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

    if (paymentMethod === "transfer" && !paymentProofUrl.trim()) {
      setErrorMsg("Por favor realiza la transferencia bancaria y adjunta el comprobante antes de confirmar.");
      return;
    }

    if (paymentMethod === "card" && !selectedCard) {
      setErrorMsg("Por favor selecciona o agrega una tarjeta de crédito o débito para realizar el pago.");
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
      const cardRef =
        paymentMethod === "card"
          ? `PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
          : null;

      const response = await fetch(`/api/v1/tenants/${tenant.slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          paymentMethod,
          paymentProofUrl:
            paymentMethod === "transfer" ? paymentProofUrl.trim() || null : null,
          cardBrand: paymentMethod === "card" ? selectedCard?.card_brand ?? null : null,
          cardLast4: paymentMethod === "card" ? selectedCard?.last4 ?? null : null,
          paymentReference: cardRef,
          items: itemsPayload,
          customerName: customerName.trim() || null,
          customerCedula: customerCedula.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerAvatarUrl: customerAvatarUrl || null,
          notes: orderNotes.trim() || null,
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
        avatarUrl: customerAvatarUrl || existingProfile.avatarUrl,
        savedOrders: updatedOrders,
      });

      onClearCart();
      onClose();
      onOrderCreated(body.data.orderId);
    } catch {
      setErrorMsg("Ocurrió un error al enviar el pedido. Inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#18181B] text-zinc-50 shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 id="cart-drawer-title" className="text-base font-black text-zinc-50">
              Tu Pedido en {tenant.name}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {tenant.branch_name ? `${tenant.branch_name} • ` : ""}Retiro directo en barra
            </p>
          </div>
          <button
            id="close-cart-drawer-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No tienes productos en el carrito.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-[#121215] p-3">
              {cart.map((item) => (
                <CartItemRow
                  key={item.cartItemId}
                  item={item}
                  onUpdateQty={onUpdateQty}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          )}

          {cart.length > 0 ? (
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Order Type: Dine-in vs Takeaway */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-300">
                  ¿Cómo deseas tu pedido? (Retiro en Barra)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="order-type-dine-in-btn"
                    type="button"
                    onClick={() => setOrderType("dine_in")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-black transition-colors ${
                      orderType === "dine_in"
                        ? "border-[#E11D48] bg-[#E11D48]/15 text-white"
                        : "border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Utensils className="h-4 w-4 text-[#FB7185]" />
                    <span>Para Servir (En mesa)</span>
                  </button>

                  <button
                    id="order-type-pickup-btn"
                    type="button"
                    onClick={() => setOrderType("pickup")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-black transition-colors ${
                      orderType === "pickup"
                        ? "border-[#E11D48] bg-[#E11D48]/15 text-white"
                        : "border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 text-[#FB7185]" />
                    <span>Para Llevar</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {orderType === "dine_in"
                    ? "Te acercas a la barra a retirar cuando esté listo y te sientas en la mesa libre que desees."
                    : "Tu pedido saldrá empacado listo para llevar."}
                </p>
              </div>

              {/* Customer Identity */}
              <div className="space-y-2.5 rounded-2xl border border-zinc-800 bg-[#121215] p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Datos de quien retira
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <input
                      id="checkout-customer-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu Nombre"
                      className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <IdCard className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="checkout-customer-cedula"
                        type="text"
                        inputMode="numeric"
                        value={customerCedula}
                        onChange={(e) => setCustomerCedula(e.target.value)}
                        placeholder="Cédula"
                        className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2 pl-8 pr-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="checkout-customer-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="WhatsApp"
                        className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2 pl-8 pr-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-300">
                  Forma de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {transferAllowed ? (
                    <button
                      id="payment-method-transfer-btn"
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center text-xs font-bold transition-colors ${
                        paymentMethod === "transfer"
                          ? "border-[#E11D48] bg-[#E11D48]/15 text-white"
                          : "border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <Landmark className="h-4 w-4 text-[#FB7185]" />
                      <span className="mt-1 text-[11px]">Transferencia</span>
                    </button>
                  ) : null}

                  {cardAllowed ? (
                    <button
                      id="payment-method-card-btn"
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center text-xs font-bold transition-colors ${
                        paymentMethod === "card"
                          ? "border-[#E11D48] bg-[#E11D48]/15 text-white"
                          : "border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-violet-400" />
                      <span className="mt-1 text-[11px]">Tarjeta en App</span>
                    </button>
                  ) : null}

                  {cashAllowed ? (
                    <button
                      id="payment-method-cash-btn"
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center text-xs font-bold transition-colors ${
                        paymentMethod === "cash"
                          ? "border-[#E11D48] bg-[#E11D48]/15 text-white"
                          : "border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <span className="mt-1 text-[11px]">Efectivo en Barra</span>
                    </button>
                  ) : null}
                </div>

                {/* TRANSFER FLOW */}
                {paymentMethod === "transfer" ? (
                  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-300">
                        Total a transferir:
                      </span>
                      <span className="text-base font-black text-[#FB7185]">
                        {formatCurrency(totals.total)}
                      </span>
                    </div>

                    {tenant.bank_details ? (
                      <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3 text-xs">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="font-bold">Datos Bancarios del Local:</span>
                          <button
                            type="button"
                            onClick={handleCopyBankDetails}
                            className="inline-flex items-center gap-1 font-bold text-[#FB7185] hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedBank ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap font-mono text-[11px] text-zinc-200">
                          {tenant.bank_details}
                        </p>
                      </div>
                    ) : null}

                    {/* Receipt Upload */}
                    <div>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void handleUploadReceipt(e)}
                      />
                      {paymentProofUrl ? (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-200">
                              Comprobante adjuntado
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => proofInputRef.current?.click()}
                            className="text-xs font-semibold text-zinc-300 underline"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <button
                          id="checkout-upload-proof-btn"
                          type="button"
                          disabled={uploadingProof}
                          onClick={() => proofInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#E11D48]/60 bg-[#E11D48]/10 px-3 py-3 text-xs font-bold text-[#FB7185] hover:bg-[#E11D48]/15"
                        >
                          {uploadingProof ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImageUp className="h-4 w-4" />
                          )}
                          <span>
                            {uploadingProof
                              ? "Cargando comprobante..."
                              : "Subir foto / captura del comprobante de transferencia"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* CARD FLOW */}
                {paymentMethod === "card" ? (
                  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-300">
                        Total a cobrar:
                      </span>
                      <span className="text-base font-black text-violet-400">
                        {formatCurrency(totals.total)}
                      </span>
                    </div>

                    <CustomerSavedCardsManager
                      compact={true}
                      selectedCardId={selectedCard?.id}
                      onSelectCard={setSelectedCard}
                    />
                  </div>
                ) : null}

                {/* CASH FLOW */}
                {paymentMethod === "cash" ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
                    <div className="flex items-center gap-2 font-bold">
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <span>Pago en Barra</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-300">
                      Pagas el total de{" "}
                      <strong className="text-white">
                        {formatCurrency(totals.total)}
                      </strong>{" "}
                      en efectivo cuando te acerques a retirar tu pedido en la barra.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Order Notes */}
              <div>
                <input
                  id="checkout-notes-input"
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Instrucciones especiales (sin cebolla, salsa extra...)"
                  className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#E11D48] focus:outline-none"
                />
              </div>

              {errorMsg ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"
                >
                  {errorMsg}
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                id="confirm-place-order-btn"
                type="submit"
                disabled={
                  isSubmitting ||
                  uploadingProof ||
                  (paymentMethod === "transfer" && !paymentProofUrl) ||
                  (paymentMethod === "card" && !selectedCard)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#E11D48]/30 hover:bg-[#BE123C] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando pedido a cocina...</span>
                  </>
                ) : paymentMethod === "transfer" && !paymentProofUrl ? (
                  <span>Adjunta el comprobante para confirmar</span>
                ) : paymentMethod === "card" ? (
                  <span>Pagar {formatCurrency(totals.total)} con Tarjeta y Enviar</span>
                ) : (
                  <span>Confirmar Pedido ({formatCurrency(totals.total)})</span>
                )}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
