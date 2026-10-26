import { z } from "zod";

export const UuidSchema = z.string().uuid("Identificador UUID inválido.");

export const CategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la categoría es obligatorio.")
    .max(80, "Máximo 80 caracteres."),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const CategoryUpdateSchema = CategoryFormSchema.extend({
  categoryId: UuidSchema,
});

export const ProductFormSchema = z.object({
  categoryId: z.string().uuid("Selecciona una categoría válida."),
  name: z
    .string()
    .trim()
    .min(1, "El nombre del producto es obligatorio.")
    .max(120, "Máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  price: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo.")
    .max(9999.99, "Precio fuera de rango."),
  imageUrl: z
    .string()
    .trim()
    .url("URL de imagen inválida.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  isAvailable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const ProductUpdateSchema = ProductFormSchema.extend({
  productId: UuidSchema,
});

export const TenantSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del restaurante es obligatorio.")
    .max(120, "Máximo 120 caracteres."),
  branchName: z
    .string()
    .trim()
    .min(1, "El distintivo de sucursal es obligatorio (ej. Sucursal Iñaquito, Matriz Norte).")
    .max(80, "Máximo 80 caracteres.")
    .default("Matriz Principal"),
  slogan: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres.")
    .default("Arte en Sabor"),
  phone: z
    .string()
    .trim()
    .min(7, "Ingresa un número de teléfono válido.")
    .max(25, "Número de teléfono demasiado largo."),
  deliveryFee: z.coerce
    .number()
    .min(0, "El costo de envío no puede ser negativo.")
    .max(100, "Costo de envío fuera de rango."),
  city: z
    .string()
    .trim()
    .min(2, "Ingresa la ciudad del local.")
    .max(80)
    .default("Quito"),
  address: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  latitude: z
    .union([z.coerce.number().min(-90).max(90), z.literal(""), z.null()])
    .optional()
    .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null)),
  longitude: z
    .union([z.coerce.number().min(-180).max(180), z.literal(""), z.null()])
    .optional()
    .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null)),
  googleMapsUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  bankDetails: z
    .string()
    .trim()
    .max(800, "Máximo 800 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  cashPaymentsEnabled: z.boolean().default(true),
  transferPaymentsEnabled: z.boolean().default(true),
  cardPaymentsEnabled: z.boolean().default(false),
  cardGateway: z.string().trim().default("payphone"),
  cardMerchantId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  settlementBankName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  settlementAccountType: z
    .enum(["Ahorros", "Corriente"])
    .default("Ahorros"),
  settlementAccountNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  settlementHolderName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  settlementHolderId: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color primario hex inválido.")
    .default("#E11D48"),
  secondaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color secundario hex inválido.")
    .default("#BE123C"),
  logoUrl: z
    .string()
    .trim()
    .url("URL de logo inválida.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  bannerUrl: z
    .string()
    .trim()
    .url("URL de banner inválida.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const TableCreateSchema = z.object({
  tableNumber: z.coerce
    .number()
    .int("El número de mesa debe ser entero.")
    .min(1, "El número de mesa debe ser mayor a 0.")
    .max(500, "Máximo mesa 500."),
});

export const OrderStatusUpdateSchema = z.object({
  orderId: z.string().uuid("ID de pedido inválido."),
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
    "no_show",
  ]),
});

export const ModifierGroupCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre del grupo es obligatorio.")
      .max(80, "Máximo 80 caracteres."),
    minSelect: z.coerce.number().int().min(0).max(20).default(0),
    maxSelect: z.coerce.number().int().min(1).max(20).default(1),
  })
  .refine((d) => d.maxSelect >= d.minSelect, {
    message: "El máximo debe ser mayor o igual al mínimo.",
    path: ["maxSelect"],
  });

export const ModifierOptionCreateSchema = z.object({
  groupId: UuidSchema,
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la opción es obligatorio.")
    .max(80, "Máximo 80 caracteres."),
  priceDelta: z.coerce.number().min(0).max(999.99).default(0),
});

export const BusinessHourUpdateSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean(),
});
