"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import {
  CategoryFormSchema,
  CategoryUpdateSchema,
  OrderStatusUpdateSchema,
  ProductFormSchema,
  ProductUpdateSchema,
  TableCreateSchema,
  TenantSettingsSchema,
  UuidSchema,
} from "@/lib/validators/admin";
import type { TenantRow } from "@/types/domain";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

async function requireOwnedTenant(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  tenant: TenantRow;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado. Inicia sesión primero.");
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!tenant) {
    throw new Error("No tienes un restaurante vinculado a tu cuenta.");
  }

  return { supabase, tenant };
}

async function uploadProductImageIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  formData: FormData
): Promise<string | null> {
  const fileEntry = formData.get("imageFile");
  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    return null;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(fileEntry.type)) {
    throw new Error(
      "Formato de imagen no soportado. Usa JPG, PNG, WebP o AVIF."
    );
  }

  if (fileEntry.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite máximo de 5 MB.");
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const ext = extMap[fileEntry.type] ?? "jpg";
  const objectPath = `${tenantId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(objectPath, fileEntry, {
      contentType: fileEntry.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error al subir imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

/**
 * Claims an unowned pilot tenant (owner_id IS NULL) for the currently authenticated user.
 */
export async function claimPilotTenantAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión primero." };
  }

  const adminClient = createServiceRoleClient();
  const { data: existingOwned } = await adminClient
    .from("tenants")
    .select("id, slug")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingOwned) {
    revalidatePath("/admin");
    return { ok: true, message: "Tu cuenta ya está vinculada." };
  }

  const { data: unownedTenant } = await adminClient
    .from("tenants")
    .select("id, slug, owner_id")
    .is("owner_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!unownedTenant) {
    return {
      ok: false,
      message: "No hay restaurantes pendientes de vincular.",
    };
  }

  const { error } = await adminClient
    .from("tenants")
    .update({ owner_id: user.id })
    .eq("id", unownedTenant.id)
    .is("owner_id", null);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/${unownedTenant.slug}`);
  return { ok: true, message: "Restaurante vinculado exitosamente." };
}

export async function toggleProductAvailabilityAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsedId = UuidSchema.safeParse(formData.get("productId"));
  const nextAvailable = formData.get("nextAvailable") === "true";

  if (!parsedId.success) return;

  await supabase
    .from("products")
    .update({ is_available: nextAvailable })
    .eq("id", parsedId.data)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function createCategoryAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsed = CategoryFormSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return;
  }

  await supabase.from("categories").insert({
    tenant_id: tenant.id,
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
  });

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function updateCategoryAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsed = CategoryUpdateSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", parsed.data.categoryId)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function deleteCategoryAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsedId = UuidSchema.safeParse(formData.get("categoryId"));
  if (!parsedId.success) return;

  await supabase
    .from("categories")
    .delete()
    .eq("id", parsedId.data)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function createProductAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const uploadedUrl = await uploadProductImageIfPresent(
    supabase,
    tenant.id,
    formData
  );

  const parsed = ProductFormSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    imageUrl: uploadedUrl ?? (formData.get("imageUrl") || undefined),
    isAvailable: true,
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return;
  }

  await supabase.from("products").insert({
    tenant_id: tenant.id,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    image_url: parsed.data.imageUrl,
    is_available: parsed.data.isAvailable,
    sort_order: parsed.data.sortOrder,
  });

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function updateProductAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const uploadedUrl = await uploadProductImageIfPresent(
    supabase,
    tenant.id,
    formData
  );

  const rawImageUrl = formData.get("imageUrl");
  const effectiveImageUrl =
    uploadedUrl ??
    (typeof rawImageUrl === "string" && rawImageUrl.trim().length > 0
      ? rawImageUrl.trim()
      : undefined);

  const parsed = ProductUpdateSchema.safeParse({
    productId: formData.get("productId"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    imageUrl: effectiveImageUrl,
    isAvailable: formData.get("isAvailable") !== "false",
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("products")
    .update({
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      image_url: parsed.data.imageUrl,
      is_available: parsed.data.isAvailable,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", parsed.data.productId)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function deleteProductAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsedId = UuidSchema.safeParse(formData.get("productId"));
  if (!parsedId.success) return;

  await supabase
    .from("products")
    .delete()
    .eq("id", parsedId.data)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function updateTenantSettingsAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsed = TenantSettingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    deliveryFee: formData.get("deliveryFee"),
    logoUrl: formData.get("logoUrl") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      delivery_fee: parsed.data.deliveryFee,
      logo_url: parsed.data.logoUrl,
    })
    .eq("id", tenant.id);

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin");
  revalidatePath(`/${tenant.slug}`);
}

export async function createTableAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsed = TableCreateSchema.safeParse({
    tableNumber: formData.get("tableNumber"),
  });

  if (!parsed.success) {
    return;
  }

  const qrToken = `${tenant.slug}-mesa-${parsed.data.tableNumber}-${crypto
    .randomUUID()
    .slice(0, 6)}`;

  await supabase.from("tables").insert({
    tenant_id: tenant.id,
    table_number: parsed.data.tableNumber,
    qr_token: qrToken,
  });

  revalidatePath("/admin/configuracion");
}

export async function deleteTableAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsedId = UuidSchema.safeParse(formData.get("tableId"));
  if (!parsedId.success) return;

  await supabase
    .from("tables")
    .delete()
    .eq("id", parsedId.data)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin/configuracion");
}

export async function updateOrderStatusAction(formData: FormData) {
  const { supabase, tenant } = await requireOwnedTenant();
  const parsed = OrderStatusUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .eq("tenant_id", tenant.id);

  revalidatePath("/admin");
}
