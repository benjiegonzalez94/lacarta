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
  .min(3, "Código inválido.")
  .max(120, "Código inválido.");

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
    customerCedula: z
      .string()
      .trim()
      .max(20, "La cédula es demasiado larga.")
      .nullable()
      .optional(),
    customerAvatarUrl: z
      .string()
      .trim()
      .max(2000, "Imagen de perfil demasiado larga.")
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
    tableNumber: z
      .number()
      .int("El número de mesa debe ser entero.")
      .min(1, "El número de mesa debe ser mayor a 0.")
      .max(500, "Número de mesa fuera de rango.")
      .nullable()
      .optional(),
    paymentMethod: z
      .enum(["cash", "transfer", "card_soon"])
      .optional()
      .default("cash"),
    paymentProofUrl: z
      .string()
      .trim()
      .max(2000, "URL de comprobante demasiado larga.")
      .nullable()
      .optional(),
    arrivalMode: z
      .enum(["on_the_way", "at_table"])
      .optional()
      .default("on_the_way"),
  })
  .superRefine((data, ctx) => {
    if (!data.customerName || data.customerName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["customerName"],
        message: "Ingresa tu nombre para identificar tu pedido.",
      });
    }

    const phone = data.customerPhone?.trim() ?? "";
    if (!/^\+?[0-9\s()-]{7,20}$/.test(phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["customerPhone"],
        message: "Ingresa tu número de celular (mínimo 7 dígitos).",
      });
    }

    if (
      data.paymentMethod === "transfer" &&
      (!data.paymentProofUrl || data.paymentProofUrl.trim().length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentProofUrl"],
        message:
          "Adjunta la captura o foto del comprobante de transferencia bancaria.",
      });
    }

    if (
      data.arrivalMode === "at_table" &&
      data.orderType === "dine_in" &&
      !data.tableNumber &&
      !data.tableToken
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tableNumber"],
        message: "Digita el número de mesa donde te encuentras.",
      });
    }
  });

export type ValidatedPlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
