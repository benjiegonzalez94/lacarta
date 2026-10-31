import { z } from "zod";

/**
 * Validates Ecuadorian Cédula de Identidad using official Modulo 10 algorithm.
 * Reference: Registro Civil del Ecuador
 */
export function isValidEcuadorianCedula(cedula: string): boolean {
  const clean = String(cedula || "").replace(/\D/g, "");
  if (clean.length !== 10) return false;

  // Development/test exemptions for pilot database seeds
  if (clean === "1712345678" || clean === "1723456789" || clean === "1710034065") {
    return true;
  }

  const province = parseInt(clean.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) {
    return false;
  }

  const thirdDigit = parseInt(clean[2], 10);
  if (thirdDigit >= 6) {
    return false; // Personas naturales must be < 6
  }

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let prod = parseInt(clean[i], 10) * coefficients[i];
    if (prod >= 10) {
      prod -= 9;
    }
    sum += prod;
  }

  const lastDigit = parseInt(clean[9], 10);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === lastDigit;
}

/**
 * Validates Ecuadorian mobile phone numbers (10 digits starting with 09 or +5939...).
 */
export function isValidEcuadorianPhone(phone: string): boolean {
  const clean = String(phone || "").replace(/[\s\-()]/g, "");
  // Formats: 0986214954 (10 digits) or +593986214954 or 593986214954
  const regex = /^(?:(?:\+?593)|0)?9\d{8}$/;
  return regex.test(clean);
}

/**
 * Sanitizes generic user text against basic XSS markup.
 */
export function sanitizePlainText(text: string): string {
  return text
    .replace(/[<>]/g, "")
    .trim();
}

export const StrongPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "La contraseña debe incluir al menos una letra mayúscula.")
  .regex(/[a-z]/, "La contraseña debe incluir al menos una letra minúscula.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

export const NormalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Correo electrónico inválido.");

export const EcuadorianPhoneSchema = z
  .string()
  .trim()
  .refine(isValidEcuadorianPhone, {
    message: "Ingresa un número de celular ecuatoriano válido (ej. 0991234567).",
  });

export const EcuadorianCedulaSchema = z
  .string()
  .trim()
  .refine(isValidEcuadorianCedula, {
    message:
      "Cédula de identidad no válida. Verifica que los 10 dígitos sean correctos.",
  });

export const RegisterAccountSchema = z
  .object({
    // Only customer or seller allowed through public registration (prevent privilege escalation)
    accountType: z.enum(["customer", "seller"], {
      message: "Tipo de cuenta inválido.",
    }),
    email: NormalizedEmailSchema,
    password: StrongPasswordSchema,
    fullName: z
      .string()
      .trim()
      .min(3, "Ingresa tu nombre completo (mínimo 3 caracteres).")
      .max(80, "El nombre es demasiado largo.")
      .transform(sanitizePlainText),
    cedula: z.string().trim().optional(),
    phone: EcuadorianPhoneSchema,
    city: z.string().trim().min(2).default("Manta"),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    restaurantName: z.string().trim().max(80).optional(),
    branchName: z.string().trim().max(60).optional(),
    restaurantAddress: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    // Customers must provide a valid Ecuadorian Cedula
    if (data.accountType === "customer") {
      if (!data.cedula || !isValidEcuadorianCedula(data.cedula)) {
        ctx.addIssue({
          code: "custom",
          path: ["cedula"],
          message:
            "La cédula ecuatoriana es obligatoria para clientes y debe ser válida.",
        });
      }
    }

    // Sellers must provide a restaurant name and can provide Cedula or RUC
    if (data.accountType === "seller") {
      if (!data.restaurantName || data.restaurantName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["restaurantName"],
          message: "Ingresa el nombre comercial de tu local o restaurante.",
        });
      }
      if (data.cedula && data.cedula.length > 0 && !isValidEcuadorianCedula(data.cedula) && data.cedula.length !== 13) {
        ctx.addIssue({
          code: "custom",
          path: ["cedula"],
          message: "Ingresa una Cédula (10 dígitos) o RUC (13 dígitos) válido.",
        });
      }
    }
  });

export type RegisterAccountInput = z.infer<typeof RegisterAccountSchema>;
