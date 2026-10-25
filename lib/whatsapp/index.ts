import { formatCurrency } from "@/lib/utils/currency";
import type { OrderType } from "@/types/domain";

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
  orderNotes?: string | null;
  items: WhatsAppOrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "🛵 A Domicilio",
  pickup: "🛍️ Para Retirar en Local",
  dine_in: "🍽️ Pedido en Mesa",
};

export function buildWhatsAppOrderMessage(
  params: BuildWhatsAppMessageParams
): string {
  const lines: string[] = [
    `🍔 *NUEVO PEDIDO - ${params.restaurantName.toUpperCase()}*`,
  ];

  if (params.orderId) {
    lines.push(`🧾 Pedido: #${params.orderId.slice(0, 8).toUpperCase()}`);
  }

  lines.push("-------------------------------");

  if (params.orderType === "dine_in" && params.tableNumber) {
    lines.push(`Tipo: ${ORDER_TYPE_LABELS.dine_in} (Mesa #${params.tableNumber})`);
  } else {
    lines.push(`Tipo: ${ORDER_TYPE_LABELS[params.orderType]}`);
  }

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
    lines.push(`📝 *Nota general:* ${params.orderNotes.trim()}`);
  }

  lines.push("-------------------------------");
  lines.push(`Subtotal: ${formatCurrency(params.subtotal)}`);

  if (params.orderType === "delivery") {
    lines.push(
      `Costo de envío: ${
        params.deliveryFee > 0
          ? formatCurrency(params.deliveryFee)
          : "Por confirmar / $0,00"
      }`
    );
  }

  lines.push(`*TOTAL: ${formatCurrency(params.total)}*`);
  lines.push("-------------------------------");
  lines.push("Método de pago: Por confirmar");

  return lines.join("\n");
}

export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encodedText}`;
}
