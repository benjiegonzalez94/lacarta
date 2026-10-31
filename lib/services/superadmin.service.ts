import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  CustomerTrustInfo,
  OrderRow,
  ProfileRow,
  SuperadminGlobalOrder,
  SuperadminMetrics,
  SuperadminTenant,
} from "@/types/domain";

export interface SuperadminInitialData {
  metrics: SuperadminMetrics;
  tenants: SuperadminTenant[];
  profiles: ProfileRow[];
  recentOrders: SuperadminGlobalOrder[];
}

export async function getSuperadminDashboardData(
  supabase: SupabaseClient<Database>
): Promise<SuperadminInitialData> {
  const [tenantsRes, profilesRes, ordersRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rawTenants = tenantsRes.data ?? [];
  const rawProfiles = profilesRes.data ?? [];
  const rawOrders = ordersRes.data ?? [];

  // Map tenant owner names from profiles
  const profileMap = new Map<string, ProfileRow>();
  for (const p of rawProfiles) {
    profileMap.set(p.id, p);
  }

  const tenants: SuperadminTenant[] = rawTenants.map((t) => {
    const owner = t.owner_id ? profileMap.get(t.owner_id) : undefined;
    return {
      ...t,
      ownerName: owner?.full_name ?? null,
      ownerPhone: owner?.phone ?? null,
    };
  });

  // Map tenant name to orders
  const tenantMap = new Map<string, { name: string; slug: string }>();
  for (const t of rawTenants) {
    tenantMap.set(t.id, { name: t.name, slug: t.slug });
  }

  const recentOrders: SuperadminGlobalOrder[] = rawOrders.map((o) => {
    const tInfo = tenantMap.get(o.tenant_id);
    return {
      ...o,
      tenantName: tInfo?.name ?? "Desconocido",
      tenantSlug: tInfo?.slug ?? "",
    };
  });

  // Compute platform metrics
  const activeTenants = rawTenants.filter(
    (t) => t.subscription_status === "active"
  ).length;
  const suspendedTenants = rawTenants.filter(
    (t) => t.subscription_status === "suspended"
  ).length;

  const estimatedMrr = rawTenants
    .filter((t) => t.subscription_status === "active")
    .reduce((sum, t) => sum + (Number(t.monthly_fee) || 15), 0);

  const nonCancelledOrders = rawOrders.filter((o) => o.status !== "cancelled");
  const totalPlatformGmv = nonCancelledOrders.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ordersLast30Days = rawOrders.filter(
    (o) => new Date(o.created_at) >= thirtyDaysAgo
  ).length;

  const customersCount = rawProfiles.filter((p) => p.role === "customer").length;
  const sellersCount = rawProfiles.filter((p) => p.role === "seller").length;
  const adminsCount = rawProfiles.filter((p) => p.role === "admin").length;

  const metrics: SuperadminMetrics = {
    totalTenants: rawTenants.length,
    activeTenants,
    suspendedTenants,
    estimatedMrr,
    totalOrders: rawOrders.length,
    totalPlatformGmv,
    ordersLast30Days,
    totalProfiles: rawProfiles.length,
    customersCount,
    sellersCount,
    adminsCount,
  };

  return {
    metrics,
    tenants,
    profiles: rawProfiles,
    recentOrders,
  };
}

export async function lookupCustomerTrustInfo(
  supabase: SupabaseClient<Database>,
  searchTerm: string
): Promise<{
  trust: CustomerTrustInfo | null;
  phone: string;
  customerProfile: ProfileRow | null;
  customerOrders: OrderRow[];
}> {
  const cleanTerm = searchTerm.trim();
  let cleanPhone = cleanTerm.replace(/[^0-9]/g, "");

  let customerProfile: ProfileRow | null = null;

  // If search term looks like a cédula (10 digits) or not a 09 phone, check profiles
  if (cleanTerm.length === 10 && !cleanTerm.startsWith("09")) {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("cedula", cleanTerm)
      .maybeSingle();

    if (p) {
      customerProfile = p;
      if (p.phone) {
        cleanPhone = p.phone.replace(/[^0-9]/g, "");
      }
    }
  } else {
    // Search profile by phone
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .ilike("phone", `%${cleanPhone}%`)
      .maybeSingle();

    if (p) {
      customerProfile = p;
    }
  }

  if (cleanPhone.length < 7) {
    return {
      trust: null,
      phone: cleanPhone,
      customerProfile,
      customerOrders: [],
    };
  }

  // Call get_customer_trust_profile RPC
  const { data: rpcData, error } = await supabase.rpc(
    "get_customer_trust_profile",
    { p_phone: cleanPhone }
  );

  let trust: CustomerTrustInfo | null = null;
  if (!error && rpcData && rpcData.length > 0) {
    const row = rpcData[0];
    trust = {
      completedOrders: row.completed_orders ?? 0,
      noShowOrders: row.no_show_orders ?? 0,
      cashAllowed: Boolean(row.cash_allowed),
      maxCashRemote: Number(row.max_cash_remote) || 0,
      trustTier: row.trust_tier ?? "new",
    };
  }

  // Fetch recent orders placed by this phone
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .ilike("customer_phone", `%${cleanPhone}%`)
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    trust,
    phone: cleanPhone,
    customerProfile,
    customerOrders: orders ?? [],
  };
}
