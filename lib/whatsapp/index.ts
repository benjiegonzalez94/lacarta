import { formatCurrency } from "@/lib/utils/currency";
import type { OrderType, PaymentMethod } from "@/types/domain";

export interface WhatsAppOrderLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
}

export interface BuildWhatsAppMessageParams {
  restaurantName: string;
  orderId?: string;
  orderType: OrderType;
  tableNumber?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  paymentMethod?: PaymentMethod;
  orderNotes?: string | null;
  items: WhatsAppOrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "🛵 Entrega a Domicilio",
  pickup: "🛍️ Retirar en el Local",
  dine_in: "🍽️ Pedido en Mesa",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "💵 Efectivo",
  transfer: "🏦 Transferencia Bancaria",
  card_soon: "💳 Tarjeta Nacional",
};

export function buildGoogleMapsPinUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function buildWhatsAppOrderMessage(
  params: BuildWhatsAppMessageParams
): string {
  const paymentMethod: PaymentMethod = params.paymentMethod ?? "cash";

  const lines: string[] = [
    `🍔 *NUEVO PEDIDO - ${params.restaurantName.toUpperCase()}*`,
  ];

  if (params.orderId) {
    lines.push(`🧾 Pedido: #${params.orderId.slice(0, 8).toUpperCase()}`);
  }

  lines.push("-------------------------------");

  if (params.orderType === "dine_in" && params.tableNumber) {
    lines.push(
      `Modalidad: ${ORDER_TYPE_LABELS.dine_in} (*Mesa #${params.tableNumber}*)`
    );
  } else {
    lines.push(`Modalidad: ${ORDER_TYPE_LABELS[params.orderType]}`);
  }

  lines.push(`Método de pago: *${PAYMENT_METHOD_LABELS[paymentMethod]}*`);

  if (params.customerName) {
    lines.push(`Cliente: ${params.customerName}`);
  }
  if (params.customerPhone) {
    lines.push(`Teléfono: ${params.customerPhone}`);
  }
  if (params.orderType === "delivery") {
    lines.push(`Dirección: ${params.deliveryAddress || "Por confirmar"}`);
    if (params.deliveryReference) {
      lines.push(`Referencia: ${params.deliveryReference}`);
    }
    if (
      typeof params.deliveryLat === "number" &&
      typeof params.deliveryLng === "number"
    ) {
      lines.push(
        `📍 *Ubicación exacta (Mapa):* ${buildGoogleMapsPinUrl(
          params.deliveryLat,
          params.deliveryLng
        )}`
      );
    }
  }

  lines.push("-------------------------------");
  lines.push("*DETALLE DEL PEDIDO:*");

  for (const item of params.items) {
    lines.push(
      `• ${item.quantity}x ${item.productName} — ${formatCurrency(item.lineTotal)}`
    );
    if (item.notes && item.notes.trim().length > 0) {
      lines.push(`   ↳ _${item.notes.trim()}_`);
    }
  }

  if (params.orderNotes && params.orderNotes.trim().length > 0) {
    lines.push("");
    lines.push(`📝 *Nota adicional:* ${params.orderNotes.trim()}`);
  }

  lines.push("-------------------------------");
  lines.push(`Subtotal productos: ${formatCurrency(params.subtotal)}`);

  if (params.orderType === "delivery") {
    lines.push(
      `Envío base / referencial: ${
        params.deliveryFee > 0
          ? `${formatCurrency(params.deliveryFee)} (sujeto a ubicación)`
          : "Por cotizar según ubicación"
      }`
    );
  }

  lines.push(`*TOTAL ESTIMADO: ${formatCurrency(params.total)}*`);
  lines.push("-------------------------------");

  if (params.orderType === "delivery") {
    if (paymentMethod === "transfer") {
      lines.push(
        "💬 _Hola, te envío mi pedido y mi ubicación. Por favor confírmame el costo de envío, el total final y tus datos bancarios para realizar la transferencia._"
      );
    } else {
      lines.push(
        "💬 _Hola, te envío mi pedido y mi ubicación. Por favor confírmame el costo de envío y el total final a pagar en efectivo._"
      );
    }
  } else if (paymentMethod === "transfer") {
    lines.push(
      "💬 _Hola, por favor confírmame mi pedido y tus datos bancarios para realizar la transferencia._"
    );
  }

  return lines.join("\n");
}

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("09") && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encodedText}`;
}

export function buildSellerConfirmationWhatsAppUrl(params: {
  customerPhone: string;
  customerName?: string | null;
  restaurantName: string;
  orderId: string;
  orderType: string;
  paymentMethod?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  bankDetails?: string | null;
}): string {
  const shortId = params.orderId.slice(0, 8).toUpperCase();
  const lines: string[] = [
    `👋 Hola${params.customerName ? ` *${params.customerName}*` : ""}, te escribimos de *${params.restaurantName.toUpperCase()}*.`,
    `Hemos recibido tu pedido *#${shortId}*.`,
    "",
    `• Subtotal productos: ${formatCurrency(params.subtotal)}`,
  ];

  if (params.orderType === "delivery") {
    lines.push(
      `• Envío a tu ubicación: ${formatCurrency(params.deliveryFee)} _(o ajusta aquí el valor cotizado)_`
    );
  }

  lines.push(`💰 *TOTAL FINAL A PAGAR: ${formatCurrency(params.total)}*`);

  if (params.paymentMethod === "transfer" && params.bankDetails) {
    lines.push("");
    lines.push("🏦 *DATOS BANCARIOS PARA TRANSFERENCIA:*");
    lines.push(params.bankDetails);
    lines.push("");
    lines.push("Envíanos el comprobante por este medio para despachar tu orden. ¡Gracias!");
  } else {
    lines.push("");
    lines.push("¡Tu pedido ya está en preparación! 🍔🔥");
  }

  return buildWhatsAppUrl(params.customerPhone, lines.join("\n"));
}
