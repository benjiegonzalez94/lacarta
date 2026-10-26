"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { ECUADOR_CITIES } from "@/lib/utils/location";

const RegisterAccountSchema = z.object({
  accountType: z.enum(["customer", "seller"]),
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().trim().min(2, "Ingresa tu nombre completo"),
  cedula: z.string().trim().max(20).optional(),
  phone: z.string().trim().min(7, "Ingresa un número de teléfono válido"),
  city: z.string().trim().min(2).default("Quito"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  restaurantName: z.string().trim().optional(),
  restaurantAddress: z.string().trim().optional(),
});

export type RegisterAccountInput = z.infer<typeof RegisterAccountSchema>;

function slugifyRestaurantName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "restaurante";
}

export async function registerAccountAction(
  rawInput: RegisterAccountInput
): Promise<{
  ok: boolean;
  role?: "customer" | "seller";
  error?: string;
}> {
  const parsed = RegisterAccountSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      error: firstIssue?.message ?? "Datos de registro inválidos.",
    };
  }

  const data = parsed.data;
  if (
    data.accountType === "seller" &&
    (!data.restaurantName || data.restaurantName.trim().length < 2)
  ) {
    return {
      ok: false,
      error: "Ingresa el nombre de tu local o restaurante.",
    };
  }

  const adminClient = createServiceRoleClient();

  const { data: createdAuth, error: createAuthError } =
    await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: data.accountType,
        full_name: data.fullName,
      },
    });

  if (createAuthError || !createdAuth.user) {
    return {
      ok: false,
      error:
        createAuthError?.message === "A user with this email address has already been registered"
          ? "Este correo ya está registrado. Inicia sesión con tu cuenta."
          : createAuthError?.message ?? "No se pudo crear la cuenta.",
    };
  }

  const userId = createdAuth.user.id;
  const matchedCity =
    ECUADOR_CITIES.find(
      (c) => c.name.toLowerCase() === data.city.toLowerCase()
    ) ?? ECUADOR_CITIES[0];

  const effectiveLat = data.latitude ?? matchedCity.latitude;
  const effectiveLng = data.longitude ?? matchedCity.longitude;

  await adminClient.from("profiles").upsert({
    id: userId,
    role: data.accountType,
    full_name: data.fullName,
    cedula: data.cedula || null,
    phone: data.phone,
    city: matchedCity.name,
    latitude: effectiveLat,
    longitude: effectiveLng,
  });

  if (data.accountType === "seller" && data.restaurantName) {
    const baseSlug = slugifyRestaurantName(data.restaurantName);
    const { data: existingSlug } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const finalSlug = existingSlug
      ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`
      : baseSlug;

    const { data: newTenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        owner_id: userId,
        slug: finalSlug,
        name: data.restaurantName.trim(),
        slogan: "Arte en Sabor",
        phone: data.phone,
        address:
          data.restaurantAddress?.trim() || `${matchedCity.name}, Ecuador`,
        city: matchedCity.name,
        latitude: effectiveLat,
        longitude: effectiveLng,
        primary_color: "#E11D48",
        secondary_color: "#BE123C",
        subscription_plan: "mensual",
        subscription_status: "active",
        monthly_fee: 15.0,
      })
      .select("id")
      .single();

    if (!tenantError && newTenant) {
      const defaultHours = Array.from({ length: 7 }, (_, day) => ({
        tenant_id: newTenant.id,
        day_of_week: day,
        open_time: "09:00",
        close_time: "22:00",
        is_open: true,
      }));
      await adminClient.from("business_hours").insert(defaultHours);
      await adminClient.from("categories").insert({
        tenant_id: newTenant.id,
        name: "Especialidades",
        sort_order: 1,
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    role: data.accountType,
  };
}

export async function resolveSignedInRoleAction(): Promise<{
  role: "customer" | "seller";
  profile: {
    fullName: string;
    cedula: string;
    phone: string;
    avatarUrl: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: "customer", profile: null };
  }

  const [{ data: profileRow }, { data: ownedTenant }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const role: "customer" | "seller" =
    ownedTenant || profileRow?.role === "seller" ? "seller" : "customer";

  return {
    role,
    profile: profileRow
      ? {
          fullName: profileRow.full_name || "",
          cedula: profileRow.cedula || "",
          phone: profileRow.phone || "",
          avatarUrl: profileRow.avatar_url || "",
          city: profileRow.city || "Quito",
          latitude:
            profileRow.latitude !== null ? Number(profileRow.latitude) : null,
          longitude:
            profileRow.longitude !== null
              ? Number(profileRow.longitude)
              : null,
        }
      : null,
  };
}

const UpdateProfileSchema = z.object({
  fullName: z.string().trim().max(80),
  cedula: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
  avatarUrl: z.string().trim().optional(),
  city: z.string().trim().max(60).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export async function updateCustomerProfileServerAction(
  rawInput: z.infer<typeof UpdateProfileSchema>
): Promise<{ ok: boolean }> {
  const parsed = UpdateProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: parsed.data.fullName,
    cedula: parsed.data.cedula || null,
    phone: parsed.data.phone || null,
    avatar_url: parsed.data.avatarUrl || null,
    city: parsed.data.city || "Quito",
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/");
  return { ok: true };
}
