import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMenuClient } from "@/components/menu/PublicMenuClient";
import { RestaurantHeader } from "@/components/menu/RestaurantHeader";
import {
  getPublicMenuBySlug,
  resolveTableByQrToken,
} from "@/lib/services/menu.service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { QrTokenSchema, SlugSchema } from "@/lib/validators/order";

interface TableMenuPageProps {
  params: Promise<{ slug: string; tableId: string }>;
}

export async function generateMetadata({
  params,
}: TableMenuPageProps): Promise<Metadata> {
  const { slug: rawSlug, tableId: rawTableId } = await params;
  const parsedSlug = SlugSchema.safeParse(rawSlug);
  const parsedToken = QrTokenSchema.safeParse(rawTableId);

  if (!parsedSlug.success || !parsedToken.success) {
    return { title: "Mesa no encontrada" };
  }

  const supabase = createPublicServerClient();
  const [menu, resolvedTable] = await Promise.all([
    getPublicMenuBySlug(supabase, parsedSlug.data),
    resolveTableByQrToken(supabase, parsedSlug.data, parsedToken.data),
  ]);

  if (!menu || !resolvedTable) {
    return { title: "Mesa no encontrada" };
  }

  return {
    title: `Mesa #${resolvedTable.tableNumber} • ${menu.tenant.name}`,
    description: `Pide desde la Mesa #${resolvedTable.tableNumber} en ${menu.tenant.name}.`,
  };
}

async function TableMenuContent({ params }: TableMenuPageProps) {
  await connection();
  const { slug: rawSlug, tableId: rawTableId } = await params;
  const parsedSlug = SlugSchema.safeParse(rawSlug);
  const parsedToken = QrTokenSchema.safeParse(rawTableId);

  if (!parsedSlug.success || !parsedToken.success) {
    notFound();
  }

  const supabase = createPublicServerClient();
  const [menu, resolvedTable] = await Promise.all([
    getPublicMenuBySlug(supabase, parsedSlug.data),
    resolveTableByQrToken(supabase, parsedSlug.data, parsedToken.data),
  ]);

  if (!menu || !resolvedTable) {
    notFound();
  }

  const themeStyle = {
    "--tenant-primary": menu.branding.primaryColor,
    "--tenant-secondary": menu.branding.secondaryColor,
  } as CSSProperties;

  return (
    <div
      style={themeStyle}
      className="flex min-h-screen flex-col bg-[#0F0F11] text-zinc-50"
    >
      <RestaurantHeader
        tenant={menu.tenant}
        branding={menu.branding}
        schedule={menu.schedule}
        resolvedTable={resolvedTable}
      />
      <PublicMenuClient menu={menu} resolvedTable={resolvedTable} />
    </div>
  );
}

export default function TableMenuPage(props: TableMenuPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] text-sm text-zinc-400">
          Validando mesa y cargando menú...
        </div>
      }
    >
      <TableMenuContent {...props} />
    </Suspense>
  );
}
