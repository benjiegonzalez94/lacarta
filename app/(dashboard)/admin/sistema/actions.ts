"use server";

import { revalidatePath } from "next/cache";
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
