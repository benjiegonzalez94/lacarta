import { Suspense } from "react";
import { connection } from "next/server";
import {
  HomeDinerHubClient,
  type DirectoryTenantItem,
} from "@/components/menu/HomeDinerHubClient";
import type { QuickTableItem } from "@/components/menu/TableQrScannerModal";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getScheduleStatus } from "@/lib/utils/schedule";

interface HomePageProps {
  searchParams: Promise<{ scan?: string }>;
}

async function HomeHubContent({ searchParams }: HomePageProps) {
  await connection();
  const params = await searchParams;
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
      deliveryFee: Number(t.delivery_fee),
      primaryColor: t.primary_color || "#E5A93C",
      logoUrl: t.logo_url,
      isOpen: schedule.isOpen,
      statusLabel: schedule.statusLabel,
      scheduleNotice: schedule.notice,
    };
  });

  // Provide quick table links for pilot restaurant Cowiings (Mesas 1..5)
  const quickTables: QuickTableItem[] = [1, 2, 3, 4, 5].map((num) => ({
    tenantSlug: "cowiings",
    tenantName: "Cowiings",
    tableNumber: num,
    qrToken: `cowiings-mesa-${num}`,
  }));

  return (
    <HomeDinerHubClient
      tenants={tenants}
      quickTables={quickTables}
      initialScanOpen={params.scan === "1"}
    />
  );
}

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] text-sm text-zinc-400">
          Cargando LaCarta...
        </div>
      }
    >
      <HomeHubContent {...props} />
    </Suspense>
  );
}
