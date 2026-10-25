import { z } from "zod";

export const SlugSchema = z
  .string()
  .trim()
  .min(2, "El identificador del restaurante es inválido.")
  .max(60, "El identificador del restaurante es demasiado largo.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido.");

export const QrTokenSchema = z
  .string()
  .trim()
  .min(3, "Código QR inválido.")
  .max(120, "Código QR inválido.");

export const OrderItemInputSchema = z.object({
  product_id: z.string().uuid("ID de producto inválido."),
  quantity: z
    .number()
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad mínima es 1.")
    .max(50, "La cantidad máxima por ítem es 50."),
  notes: z
    .string()
    .trim()
    .max(300, "Las notas del producto no pueden superar 300 caracteres.")
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  option_ids: z
    .array(z.string().uuid("ID de opción inválido."))
    .max(20, "Máximo 20 opciones por ítem.")
    .optional(),
});

export const PlaceOrderSchema = z
  .object({
    slug: SlugSchema,
    orderType: z.enum(["delivery", "pickup", "dine_in"]),
    items: z
      .array(OrderItemInputSchema)
      .min(1, "Tu carrito está vacío.")
      .max(50, "Máximo 50 ítems por pedido."),
    customerName: z
      .string()
      .trim()
      .max(120, "El nombre es demasiado largo.")
      .nullable()
      .optional(),
    customerPhone: z
      .string()
      .trim()
      .max(30, "El teléfono es demasiado largo.")
      .nullable()
      .optional(),
    deliveryAddress: z
      .string()
      .trim()
      .max(300, "La dirección es demasiado larga.")
      .nullable()
      .optional(),
    deliveryReference: z
      .string()
      .trim()
      .max(300, "La referencia es demasiado larga.")
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Las notas del pedido son demasiado largas.")
      .nullable()
      .optional(),
    tableToken: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "dine_in") {
      if (!data.tableToken || data.tableToken.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tableToken"],
          message: "Se requiere el código de mesa para pedidos en local.",
        });
      }
      return;
    }

    if (!data.customerName || data.customerName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["customerName"],
        message: "Ingresa tu nombre para el pedido.",
      });
    }

    const phone = data.customerPhone?.trim() ?? "";
    if (!/^\+?[0-9\s()-]{7,20}$/.test(phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["customerPhone"],
        message: "Ingresa un número de teléfono válido (mínimo 7 dígitos).",
      });
    }

    if (
      data.orderType === "delivery" &&
      (!data.deliveryAddress || data.deliveryAddress.trim().length < 4)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Ingresa la dirección de entrega para tu pedido a domicilio.",
      });
    }
  });

export type ValidatedPlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
