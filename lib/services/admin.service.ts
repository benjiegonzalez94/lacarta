import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  CategoryRow,
  OrderItemRow,
  OrderRow,
  OrderStatus,
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
}

export async function getTenantForOwner(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TenantRow | null> {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  return data ?? null;
}

export async function getAdminDashboardData(
  supabase: SupabaseClient<Database>,
  tenant: TenantRow
): Promise<AdminTenantDashboardData> {
  const [categoriesRes, productsRes, tablesRes, ordersRes] = await Promise.all([
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

  return {
    tenant,
    categories: categoriesRes.data ?? [],
    products: productsRes.data ?? [],
    tables: tablesRes.data ?? [],
    orders,
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
