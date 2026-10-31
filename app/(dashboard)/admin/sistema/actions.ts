"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { lookupCustomerTrustInfo } from "@/lib/services/superadmin.service";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { UuidSchema } from "@/lib/validators/admin";
import type { OrderStatus } from "@/types/domain";

async function requireSuperAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado. Inicia sesión como superadministrador.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error(
      "Acceso restringido: Se requieren permisos de Super Administrador / Dev."
    );
  }

  return { user, supabase };
}

export async function switchActiveTenantAction(tenantId: string) {
  await requireSuperAdminSession();
  const validTenantId = UuidSchema.parse(tenantId);

  const cookieStore = await cookies();
  cookieStore.set("active_admin_tenant_id", validTenantId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/configuracion");

  return { success: true, activeTenantId: validTenantId };
}

export async function clearActiveTenantAction() {
  await requireSuperAdminSession();
  const cookieStore = await cookies();
  cookieStore.delete("active_admin_tenant_id");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleTenantSubscriptionAction(
  tenantId: string,
  nextStatus: "active" | "suspended"
) {
  await requireSuperAdminSession();
  const validTenantId = UuidSchema.parse(tenantId);

  const adminClient = createServiceRoleClient();

  // If activating and subscription already expired, grant 30 days
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("subscription_ends_at, slug")
    .eq("id", validTenantId)
    .single();

  let updatePayload: {
    subscription_status: string;
    subscription_ends_at?: string;
  } = {
    subscription_status: nextStatus,
  };

  if (nextStatus === "active" && tenant?.subscription_ends_at) {
    const endsAt = new Date(tenant.subscription_ends_at);
    if (endsAt.getTime() < Date.now()) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      updatePayload = {
        ...updatePayload,
        subscription_ends_at: futureDate.toISOString(),
      };
    }
  }

  const { error } = await adminClient
    .from("tenants")
    .update(updatePayload)
    .eq("id", validTenantId);

  if (error) {
    throw new Error(`Error al actualizar estado del tenant: ${error.message}`);
  }

  revalidatePath("/admin/sistema");
  revalidatePath("/admin");
  if (tenant?.slug) {
    revalidatePath(`/${tenant.slug}`);
  }

  return {
    success: true,
    status: nextStatus,
    message:
      nextStatus === "active"
        ? "Suscripción activada con éxito."
        : "Suscripción suspendida con éxito.",
  };
}

export async function extendTenantSubscriptionAction(
  tenantId: string,
  daysToAdd = 30
) {
  await requireSuperAdminSession();
  const validTenantId = UuidSchema.parse(tenantId);

  const adminClient = createServiceRoleClient();

  const { data: tenant, error: fetchError } = await adminClient
    .from("tenants")
    .select("subscription_ends_at, slug")
    .eq("id", validTenantId)
    .single();

  if (fetchError || !tenant) {
    throw new Error("No se encontró el restaurante especificado.");
  }

  const currentEnds = tenant.subscription_ends_at
    ? new Date(tenant.subscription_ends_at)
    : new Date();

  const baseDate = currentEnds.getTime() > Date.now() ? currentEnds : new Date();
  baseDate.setDate(baseDate.getDate() + daysToAdd);

  const newEndsAt = baseDate.toISOString();

  const { error: updateError } = await adminClient
    .from("tenants")
    .update({
      subscription_ends_at: newEndsAt,
      subscription_status: "active",
    })
    .eq("id", validTenantId);

  if (updateError) {
    throw new Error(
      `Error al extender la suscripción: ${updateError.message}`
    );
  }

  revalidatePath("/admin/sistema");
  revalidatePath("/admin");
  if (tenant.slug) {
    revalidatePath(`/${tenant.slug}`);
  }

  return {
    success: true,
    newEndsAt,
    message: `Suscripción extendida por +${daysToAdd} días exitosamente.`,
  };
}

export async function superadminUpdateOrderStatusAction(
  orderId: string,
  nextStatus: OrderStatus,
  supportNote?: string
) {
  await requireSuperAdminSession();
  const validOrderId = UuidSchema.parse(orderId);

  const adminClient = createServiceRoleClient();

  const { data: order } = await adminClient
    .from("orders")
    .select("notes, status")
    .eq("id", validOrderId)
    .single();

  const appendedNotes = supportNote
    ? `${order?.notes ? order.notes + " | " : ""}[Soporte Superadmin: ${supportNote}]`
    : order?.notes;

  const { error } = await adminClient
    .from("orders")
    .update({
      status: nextStatus,
      notes: appendedNotes,
    })
    .eq("id", validOrderId);

  if (error) {
    throw new Error(`Error al actualizar pedido: ${error.message}`);
  }

  revalidatePath("/admin/sistema");
  revalidatePath("/admin");

  return {
    success: true,
    orderId: validOrderId,
    newStatus: nextStatus,
  };
}

export async function superadminPardonCustomerNoShowsAction(phone: string) {
  await requireSuperAdminSession();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, "");

  if (cleanPhone.length < 7) {
    throw new Error("Número de teléfono no válido.");
  }

  const adminClient = createServiceRoleClient();

  // Find all orders with no_show status for this customer phone
  const { data: noShowOrders, error: findError } = await adminClient
    .from("orders")
    .select("id, notes")
    .ilike("customer_phone", `%${cleanPhone}%`)
    .eq("status", "no_show");

  if (findError) {
    throw new Error(
      `Error al consultar pedidos no-show: ${findError.message}`
    );
  }

  const count = noShowOrders?.length ?? 0;

  if (count > 0 && noShowOrders) {
    for (const ord of noShowOrders) {
      await adminClient
        .from("orders")
        .update({
          status: "cancelled",
          notes: `${ord.notes ? ord.notes + " | " : ""}[No-Show perdonado por Soporte Superadmin]`,
        })
        .eq("id", ord.id);
    }
  }

  revalidatePath("/admin/sistema");

  return {
    success: true,
    countPardoned: count,
    message:
      count > 0
        ? `Se perdonaron ${count} pedidos de inasistencia (no-show). El cliente ya puede volver a pedir en efectivo.`
        : "El cliente no registraba pedidos en estado no-show.",
  };
}

export async function superadminSearchCustomerAction(searchTerm: string) {
  await requireSuperAdminSession();
  const adminClient = createServiceRoleClient();
  return await lookupCustomerTrustInfo(adminClient, searchTerm);
}

export async function superadminQuickUpdateTenantAction(
  tenantId: string,
  payload: {
    phone?: string;
    address?: string;
    cash_payments_enabled?: boolean;
    transfer_payments_enabled?: boolean;
    card_payments_enabled?: boolean;
    monthly_fee?: number;
  }
) {
  await requireSuperAdminSession();
  const validTenantId = UuidSchema.parse(tenantId);

  const adminClient = createServiceRoleClient();

  const { data: tenant, error } = await adminClient
    .from("tenants")
    .update(payload)
    .eq("id", validTenantId)
    .select("slug")
    .single();

  if (error) {
    throw new Error(`Error al actualizar local: ${error.message}`);
  }

  revalidatePath("/admin/sistema");
  revalidatePath("/admin");
  if (tenant?.slug) {
    revalidatePath(`/${tenant.slug}`);
  }

  return { success: true, message: "Datos del local actualizados con éxito." };
}

export async function superadminCreateTenantAction(payload: {
  name: string;
  branch_name?: string;
  slug: string;
  city: string;
  phone: string;
  address?: string;
}) {
  await requireSuperAdminSession();

  const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleanSlug || cleanSlug.length < 3) {
    throw new Error("El slug debe tener al menos 3 caracteres alfanuméricos.");
  }

  const cleanName = payload.name.trim();
  if (!cleanName) {
    throw new Error("El nombre del local es obligatorio.");
  }

  const adminClient = createServiceRoleClient();

  const { data: existing } = await adminClient
    .from("tenants")
    .select("id")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (existing) {
    throw new Error(
      `El slug /${cleanSlug} ya está registrado por otro restaurante.`
    );
  }

  const { data: newTenant, error: insertError } = await adminClient
    .from("tenants")
    .insert({
      name: cleanName,
      branch_name: payload.branch_name?.trim() || "Matriz Principal",
      slug: cleanSlug,
      city: payload.city.trim() || "Manta",
      phone: payload.phone.trim() || "+593900000000",
      address: payload.address?.trim() || null,
      slogan: "Arte en Sabor",
      primary_color: "#E11D48",
      secondary_color: "#BE123C",
      subscription_status: "active",
      subscription_plan: "mensual",
      monthly_fee: 15.0,
      cash_payments_enabled: true,
      transfer_payments_enabled: true,
      card_payments_enabled: true,
    })
    .select("*")
    .single();

  if (insertError || !newTenant) {
    throw new Error(
      `Error al crear el restaurante: ${insertError?.message || "Desconocido"}`
    );
  }

  // Create default category
  await adminClient.from("categories").insert({
    tenant_id: newTenant.id,
    name: "Platos Principales",
    sort_order: 1,
  });

  // Create default business hours (7 days, 10:00 to 22:00)
  const defaultHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    tenant_id: newTenant.id,
    day_of_week: day,
    open_time: "10:00:00",
    close_time: "22:00:00",
    is_open: true,
  }));
  await adminClient.from("business_hours").insert(defaultHours);

  revalidatePath("/admin/sistema");
  revalidatePath("/");

  return { success: true, tenant: newTenant };
}
