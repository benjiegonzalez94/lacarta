import { NextResponse } from "next/server";
import { placePublicOrder } from "@/lib/services/order.service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { PlaceOrderSchema, SlugSchema } from "@/lib/validators/order";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const parsedSlug = SlugSchema.safeParse(rawSlug);

  if (!parsedSlug.success) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const payload =
    typeof body === "object" && body !== null
      ? { ...body, slug: parsedSlug.data }
      : { slug: parsedSlug.data };

  const validation = PlaceOrderSchema.safeParse(payload);
  if (!validation.success) {
    const firstIssue =
      validation.error.issues[0]?.message ?? "Datos del pedido inválidos.";
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: firstIssue,
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createPublicServerClient();
    const result = await placePublicOrder(supabase, validation.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "ORDER_CREATION_FAILED";
    const status =
      message === "TENANT_NOT_FOUND" || message === "TABLE_NOT_FOUND"
        ? 404
        : 400;

    let friendlyMessage =
      "No se pudo procesar tu pedido. Verifica los datos e intenta nuevamente.";

    if (message.includes("PRODUCT_UNAVAILABLE")) {
      friendlyMessage =
        "Uno de los productos seleccionados ya no está disponible.";
    } else if (message.includes("TABLE_NOT_FOUND")) {
      friendlyMessage = "La mesa seleccionada no es válida.";
    } else if (message.includes("CASH_RESTRICTED_NO_SHOW")) {
      friendlyMessage =
        "Por seguridad del local (registro previo de pedido no retirado), tu cuenta solo puede realizar pedidos mediante Transferencia Bancaria adjuntando comprobante.";
    } else if (message.includes("CASH_LIMIT_EXCEEDED_ON_THE_WAY")) {
      friendlyMessage =
        "Para pedidos en camino mayores a $15.00 en cuentas nuevas, por favor elige Transferencia Bancaria adjuntando comprobante, o marca 'Ya estoy en una mesa del local'.";
    }

    return NextResponse.json(
      {
        error: message,
        message: friendlyMessage,
      },
      { status }
    );
  }
}
