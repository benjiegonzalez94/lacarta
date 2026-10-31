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
  PlaceOrderResult,
} from "@/types/domain";

export function calculateOrderTotals(
  items: ReadonlyArray<{ unitPrice: number; quantity: number }>
): OrderCalculationResult {
  const rawSubtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );
  const subtotal = roundMoney(rawSubtotal);
  const deliveryFee = 0;
  const total = roundMoney(subtotal);

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

  if (tenant.subscription_status === "suspended") {
    throw new Error("RESTAURANT_SUSPENDED");
  }

  const productIds = Array.from(new Set(input.items.map((i) => i.product_id)));
  const allOptionIds = Array.from(
    new Set(input.items.flatMap((i) => i.option_ids ?? []))
  );

  const [{ data: products, error: productsError }, { data: modifierOptions }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, is_available")
        .eq("tenant_id", tenant.id)
        .in("id", productIds),
      allOptionIds.length > 0
        ? supabase
            .from("modifier_options")
            .select("id, name, price_delta, is_available")
            .eq("tenant_id", tenant.id)
            .in("id", allOptionIds)
        : Promise.resolve({ data: [] }),
    ]);

  if (productsError || !products) {
    throw new Error("PRODUCT_LOOKUP_FAILED");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const optionMap = new Map((modifierOptions ?? []).map((o) => [o.id, o]));

  const whatsappLines: WhatsAppOrderLine[] = input.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product || !product.is_available) {
      throw new Error("PRODUCT_UNAVAILABLE");
    }

    const optionsDelta = (item.option_ids ?? []).reduce((sum, optId) => {
      const opt = optionMap.get(optId);
      return opt && opt.is_available ? sum + Number(opt.price_delta) : sum;
    }, 0);

    const unitPrice = roundMoney(Number(product.price) + optionsDelta);
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
    p_notes: input.notes ?? undefined,
    p_table_token: undefined,
    p_payment_method: input.paymentMethod ?? "cash",
    p_payment_proof_url: input.paymentProofUrl ?? undefined,
    p_arrival_mode: "at_table",
    p_table_number: undefined,
    p_customer_cedula: input.customerCedula ?? undefined,
    p_customer_avatar_url: input.customerAvatarUrl ?? undefined,
    p_card_brand: input.cardBrand ?? undefined,
    p_card_last4: input.cardLast4 ?? undefined,
    p_payment_reference: input.paymentReference ?? undefined,
  });

  if (rpcError || !orderId) {
    throw new Error(rpcError?.message || "ORDER_CREATION_FAILED");
  }

  const totals = calculateOrderTotals(whatsappLines);

  const whatsappMessage = buildWhatsAppOrderMessage({
    restaurantName: tenant.name,
    orderId,
    orderType: input.orderType,
    tableNumber: null,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    paymentMethod: input.paymentMethod ?? "cash",
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
