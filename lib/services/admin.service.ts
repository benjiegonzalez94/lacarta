import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  BusinessHourRow,
  CategoryRow,
  ModifierGroupWithOptions,
  OrderItemRow,
  OrderRow,
  OrderStatus,
  ProductModifierGroupRow,
  ProductRow,
  TableRow,
  TenantRow,
} from "@/types/domain";

export interface OrderWithItems extends OrderRow {
  items: OrderItemRow[];
}

export interface AdminTenantDashboardData {
  tenant: TenantRow;
  categories: CategoryRow[];
  products: ProductRow[];
  tables: TableRow[];
  orders: OrderWithItems[];
  businessHours: BusinessHourRow[];
  modifierGroups: ModifierGroupWithOptions[];
  productModifierLinks: ProductModifierGroupRow[];
}

export async function getTenantForOwner(
  supabase: SupabaseClient<Database>,
  userId: string,
  preferredTenantId?: string | null
): Promise<TenantRow | null> {
  // Check user role first
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // If user is platform superadmin, allow inspecting any preferred tenant or primary
  if (profile?.role === "admin") {
    if (preferredTenantId) {
      const { data: chosenTenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", preferredTenantId)
        .maybeSingle();

      if (chosenTenant) {
        return chosenTenant;
      }
    }

    const { data: primaryTenant } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return primaryTenant ?? null;
  }

  // Regular seller: check owned tenant
  const { data: ownedTenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedTenant) {
    return ownedTenant;
  }

  return null;
}

export async function getAllTenants(
  supabase: SupabaseClient<Database>
): Promise<TenantRow[]> {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getAdminDashboardData(
  supabase: SupabaseClient<Database>,
  tenant: TenantRow
): Promise<AdminTenantDashboardData> {
  const [
    categoriesRes,
    productsRes,
    tablesRes,
    ordersRes,
    hoursRes,
    groupsRes,
    optionsRes,
    linksRes,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("table_number", { ascending: true }),
    supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("business_hours")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("modifier_groups")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("modifier_options")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_modifier_groups")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
  ]);

  const rawOrders = ordersRes.data ?? [];
  const orderIds = rawOrders.map((o) => o.id);

  let orderItems: OrderItemRow[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .eq("tenant_id", tenant.id)
      .in("order_id", orderIds);
    orderItems = itemsData ?? [];
  }

  const orders: OrderWithItems[] = rawOrders.map((order) => ({
    ...order,
    items: orderItems.filter((item) => item.order_id === order.id),
  }));

  const rawOptions = optionsRes.data ?? [];
  const modifierGroups: ModifierGroupWithOptions[] = (groupsRes.data ?? []).map(
    (grp) => ({
      ...grp,
      options: rawOptions.filter((opt) => opt.group_id === grp.id),
    })
  );

  return {
    tenant,
    categories: categoriesRes.data ?? [],
    products: productsRes.data ?? [],
    tables: tablesRes.data ?? [],
    orders,
    businessHours: hoursRes.data ?? [],
    modifierGroups,
    productModifierLinks: linksRes.data ?? [],
  };
}

export async function updateOrderStatusForTenant(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(error.message);
  }
}
