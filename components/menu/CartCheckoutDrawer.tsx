"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  QrCode,
  Store,
  Truck,
  X,
} from "lucide-react";
import { CartItemRow } from "@/components/menu/CartItemRow";
import { calculateOrderTotals } from "@/lib/services/order.service";
import { formatCurrency } from "@/lib/utils/currency";
import type {
  CartItem,
  OrderItemPayload,
  OrderType,
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
}: CartCheckoutDrawerProps) {
  const [orderType, setOrderType] = useState<OrderType>(
    resolvedTable ? "dine_in" : "delivery"
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PlaceOrderResult | null>(
    null
  );

  const effectiveOrderType: OrderType = resolvedTable ? "dine_in" : orderType;
  const totals = calculateOrderTotals(
    cart,
    effectiveOrderType,
    tenant.delivery_fee
  );

  async function handleSubmitOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;

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
          orderType: effectiveOrderType,
          items: itemsPayload,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          deliveryAddress:
            effectiveOrderType === "delivery"
              ? deliveryAddress.trim() || null
              : null,
          deliveryReference:
            effectiveOrderType === "delivery"
              ? deliveryReference.trim() || null
              : null,
          notes: orderNotes.trim() || null,
          tableToken: resolvedTable?.qrToken ?? null,
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

      setCreatedOrder(body.data);
      onClearCart();
      window.open(body.data.whatsappUrl, "_blank", "noopener,noreferrer");
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
      <div className="flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-[#18181B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2
            id="checkout-drawer-title"
            className="text-lg font-black text-zinc-50"
          >
            {createdOrder ? "¡Pedido Registrado!" : "Tu Pedido"}
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

        {createdOrder ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Orden #{createdOrder.orderId.slice(0, 8).toUpperCase()}
              </p>
              <h3 className="mt-1 text-xl font-black text-zinc-50">
                Pedido listo para enviar
              </h3>
              <p className="mt-2 text-xs text-zinc-400">
                Tu orden quedó registrada en {tenant.name} por un total de{" "}
                <strong className="text-zinc-200">
                  {formatCurrency(createdOrder.total)}
                </strong>
                . Si WhatsApp no se abrió automáticamente, pulsa el botón de
                abajo:
              </p>
            </div>

            <a
              id="open-whatsapp-confirmation-link"
              href={createdOrder.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-5 py-3.5 text-sm font-black text-zinc-950 transition-colors hover:bg-[#16A34A]"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Enviar Pedido por WhatsApp</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-semibold text-zinc-300">
              Tu carrito está vacío
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Agrega tus platos o bebidas favoritas del menú.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitOrder}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.cartItemId}
                    item={item}
                    onUpdateQty={onUpdateQty}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>

              {resolvedTable ? (
                <div className="rounded-2xl border border-[#E5A93C]/40 bg-[#E5A93C]/10 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E5A93C]">
                    <QrCode className="h-4 w-4" />
                    <span>
                      Modalidad: Pedido en Mesa #{resolvedTable.tableNumber}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300">
                    Tu pedido será preparado para tu mesa sin necesidad de
                    dirección de envío.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Tipo de entrega
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="order-type-delivery-btn"
                      type="button"
                      onClick={() => setOrderType("delivery")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        orderType === "delivery"
                          ? "border-[#E5A93C] bg-[#E5A93C]/15 text-[#E5A93C]"
                          : "border-zinc-800 bg-[#202024] text-zinc-300"
                      }`}
                    >
                      <Truck className="h-4 w-4" />
                      <span>A Domicilio</span>
                    </button>
                    <button
                      id="order-type-pickup-btn"
                      type="button"
                      onClick={() => setOrderType("pickup")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        orderType === "pickup"
                          ? "border-[#E5A93C] bg-[#E5A93C]/15 text-[#E5A93C]"
                          : "border-zinc-800 bg-[#202024] text-zinc-300"
                      }`}
                    >
                      <Store className="h-4 w-4" />
                      <span>Retiro en Local</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="checkout-customer-name"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Tu nombre {resolvedTable ? "(opcional)" : "*"}
                  </label>
                  <input
                    id="checkout-customer-name"
                    type="text"
                    required={!resolvedTable}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
                  />
                </div>

                {!resolvedTable ? (
                  <div>
                    <label
                      htmlFor="checkout-customer-phone"
                      className="mb-1 block text-xs font-semibold text-zinc-300"
                    >
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      id="checkout-customer-phone"
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej: 0991234567"
                      className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
                    />
                  </div>
                ) : null}

                {effectiveOrderType === "delivery" ? (
                  <>
                    <div>
                      <label
                        htmlFor="checkout-delivery-address"
                        className="mb-1 block text-xs font-semibold text-zinc-300"
                      >
                        Dirección de entrega *
                      </label>
                      <input
                        id="checkout-delivery-address"
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Barrio, calle principal y secundaria"
                        className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-delivery-ref"
                        className="mb-1 block text-xs font-semibold text-zinc-300"
                      >
                        Referencia de ubicación
                      </label>
                      <input
                        id="checkout-delivery-ref"
                        type="text"
                        value={deliveryReference}
                        onChange={(e) => setDeliveryReference(e.target.value)}
                        placeholder="Casa color crema junto a la farmacia..."
                        className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
                      />
                    </div>
                  </>
                ) : null}

                <div>
                  <label
                    htmlFor="checkout-order-notes"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Observaciones del pedido (opcional)
                  </label>
                  <input
                    id="checkout-order-notes"
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Ej: Pago con transferencia / efectivo..."
                    className="w-full rounded-xl border border-zinc-800 bg-[#202024] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#E5A93C] focus:outline-none"
                  />
                </div>
              </div>

              {errorMsg ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300"
                >
                  {errorMsg}
                </div>
              ) : null}
            </div>

            <div className="border-t border-zinc-800 bg-[#131316] px-5 py-4">
              <div className="mb-3 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {effectiveOrderType === "delivery" ? (
                  <div className="flex justify-between text-zinc-400">
                    <span>Costo de envío</span>
                    <span>
                      {totals.deliveryFee > 0
                        ? formatCurrency(totals.deliveryFee)
                        : "Por confirmar"}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 text-base font-black text-zinc-50">
                  <span>Total a pagar</span>
                  <span className="text-[#E5A93C]">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>

              <button
                id="submit-whatsapp-order-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-5 py-3.5 text-sm font-black text-zinc-950 shadow-lg transition-colors hover:bg-[#16A34A] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registrando pedido...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" />
                    <span>
                      {resolvedTable
                        ? `Pedir a Mesa #${resolvedTable.tableNumber} y Enviar a WhatsApp`
                        : "Confirmar y Enviar por WhatsApp"}
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
