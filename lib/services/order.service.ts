import type { SupabaseClient } from "@supabase/supabase-js";
import { roundMoney } from "@/lib/utils/currency";
import type { ValidatedPlaceOrderInput } from "@/lib/validators/order";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  type WhatsAppOrderLine,
} from "@/lib/whatsapp";
import type { Database } from "@/types/database";
import type {
  OrderCalculationResult,
  OrderType,
  PlaceOrderResult,
} from "@/types/domain";

export function calculateOrderTotals(
  items: ReadonlyArray<{ unitPrice: number; quantity: number }>,
  orderType: OrderType,
  tenantDeliveryFee: number
): OrderCalculationResult {
  const rawSubtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );
  const subtotal = roundMoney(rawSubtotal);
  const deliveryFee =
    orderType === "delivery" ? roundMoney(Math.max(0, tenantDeliveryFee)) : 0;
  const total = roundMoney(subtotal + deliveryFee);

  return {
    subtotal,
    deliveryFee,
    total,
  };
}

export async function placePublicOrder(
  supabase: SupabaseClient<Database>,
  input: ValidatedPlaceOrderInput
): Promise<PlaceOrderResult> {
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", input.slug)
    .maybeSingle();

  if (tenantError || !tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  let tableNumber: number | null = null;
  if (input.orderType === "dine_in" && input.tableToken) {
    const { data: tableRows } = await supabase.rpc("resolve_table", {
      p_slug: input.slug,
      p_qr_token: input.tableToken,
    });
    if (!tableRows || tableRows.length === 0) {
      throw new Error("TABLE_NOT_FOUND");
    }
    tableNumber = tableRows[0].table_number;
  }

  const productIds = Array.from(new Set(input.items.map((i) => i.product_id)));
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, is_available")
    .eq("tenant_id", tenant.id)
    .in("id", productIds);

  if (productsError || !products) {
    throw new Error("PRODUCT_LOOKUP_FAILED");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const whatsappLines: WhatsAppOrderLine[] = input.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product || !product.is_available) {
      throw new Error("PRODUCT_UNAVAILABLE");
    }
    const unitPrice = Number(product.price);
    const lineTotal = roundMoney(unitPrice * item.quantity);
    return {
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      notes: item.notes ?? null,
    };
  });

  const { data: orderId, error: rpcError } = await supabase.rpc("place_order", {
    p_slug: input.slug,
    p_order_type: input.orderType,
    p_items: input.items,
    p_customer_name: input.customerName ?? undefined,
    p_customer_phone: input.customerPhone ?? undefined,
    p_delivery_address: input.deliveryAddress ?? undefined,
    p_delivery_reference: input.deliveryReference ?? undefined,
    p_notes: input.notes ?? undefined,
    p_table_token: input.tableToken ?? undefined,
  });

  if (rpcError || !orderId) {
    throw new Error(rpcError?.message || "ORDER_CREATION_FAILED");
  }

  const totals = calculateOrderTotals(
    whatsappLines,
    input.orderType,
    Number(tenant.delivery_fee)
  );

  const whatsappMessage = buildWhatsAppOrderMessage({
    restaurantName: tenant.name,
    orderId,
    orderType: input.orderType,
    tableNumber,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    deliveryReference: input.deliveryReference,
    orderNotes: input.notes,
    items: whatsappLines,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
  });

  const whatsappUrl = buildWhatsAppUrl(tenant.phone, whatsappMessage);

  return {
    orderId,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    whatsappUrl,
    whatsappMessage,
  };
}
