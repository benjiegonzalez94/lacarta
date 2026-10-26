import { Suspense } from "react";
import { connection } from "next/server";
import {
  HomeDinerHubClient,
  type DirectoryTenantItem,
} from "@/components/menu/HomeDinerHubClient";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getScheduleStatus } from "@/lib/utils/schedule";

async function HomeHubContent() {
  await connection();
  const supabase = createPublicServerClient();

  const [{ data: tenantsData }, { data: hoursData }] = await Promise.all([
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
      slogan: t.slogan || "Arte en Sabor",
      phone: t.phone,
      address: t.address,
      primaryColor: t.primary_color || "#E11D48",
      logoUrl: t.logo_url,
      isOpen: schedule.isOpen,
      statusLabel: schedule.statusLabel,
      scheduleNotice: schedule.notice,
    };
  });

  return <HomeDinerHubClient tenants={tenants} />;
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
