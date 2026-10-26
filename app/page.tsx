import { Suspense } from "react";
import { connection } from "next/server";
import { UnifiedAuthView } from "@/components/auth/UnifiedAuthView";
import {
  HomeDinerHubClient,
  type DirectoryTenantItem,
} from "@/components/menu/HomeDinerHubClient";
import { createClient } from "@/lib/supabase/server";
import { getScheduleStatus } from "@/lib/utils/schedule";

async function HomeHubContent() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <UnifiedAuthView />;
  }

  const [
    { data: profileRow },
    { data: ownedTenant },
    { data: tenantsData },
    { data: hoursData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("tenants")
      .select("id, slug")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("business_hours").select("*"),
  ]);

  const tenants: DirectoryTenantItem[] = (tenantsData ?? []).map((t) => {
    const tenantHours = (hoursData ?? []).filter(
      (h) => h.tenant_id === t.id
    );
    const schedule = getScheduleStatus(tenantHours);
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      branchName: t.branch_name,
      slogan: t.slogan || "Arte en Sabor",
      phone: t.phone,
      address: t.address,
      city: t.city || "Quito",
      latitude: t.latitude !== null ? Number(t.latitude) : null,
      longitude: t.longitude !== null ? Number(t.longitude) : null,
      googleMapsUrl: t.google_maps_url,
      primaryColor: t.primary_color || "#E11D48",
      logoUrl: t.logo_url,
      isOpen: schedule.isOpen,
      statusLabel: schedule.statusLabel,
      scheduleNotice: schedule.notice,
    };
  });

  const isSeller = Boolean(ownedTenant || profileRow?.role === "seller");

  return (
    <HomeDinerHubClient
      tenants={tenants}
      isSeller={isSeller}
      serverProfile={
        profileRow
          ? {
              name: profileRow.full_name || "",
              cedula: profileRow.cedula || "",
              phone: profileRow.phone || "",
              avatarUrl: profileRow.avatar_url || "",
              city: profileRow.city || "Quito",
              latitude:
                profileRow.latitude !== null
                  ? Number(profileRow.latitude)
                  : null,
              longitude:
                profileRow.longitude !== null
                  ? Number(profileRow.longitude)
                  : null,
            }
          : null
      }
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] text-sm text-zinc-400">
          Cargando LaCarta...
        </div>
      }
    >
      <HomeHubContent />
    </Suspense>
  );
}
