import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMenuClient } from "@/components/menu/PublicMenuClient";
import { RestaurantHeader } from "@/components/menu/RestaurantHeader";
import { getPublicMenuBySlug } from "@/lib/services/menu.service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { SlugSchema } from "@/lib/validators/order";

interface PublicMenuPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicMenuPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const parsed = SlugSchema.safeParse(rawSlug);
  if (!parsed.success) {
    return { title: "Menú no encontrado" };
  }

  const supabase = createPublicServerClient();
  const menu = await getPublicMenuBySlug(supabase, parsed.data);

  if (!menu) {
    return { title: "Restaurante no encontrado" };
  }

  return {
    title: `${menu.tenant.name} — Menú Digital y Pedidos por WhatsApp`,
    description: `${menu.tenant.name}: ${menu.branding.slogan}. Pide directo por WhatsApp.`,
  };
}

async function MenuContent({ params }: PublicMenuPageProps) {
  await connection();
  const { slug: rawSlug } = await params;
  const parsed = SlugSchema.safeParse(rawSlug);

  if (!parsed.success) {
    notFound();
  }

  const supabase = createPublicServerClient();
  const menu = await getPublicMenuBySlug(supabase, parsed.data);

  if (!menu) {
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
      />
      <PublicMenuClient menu={menu} />
    </div>
  );
}

export default function PublicMenuPage(props: PublicMenuPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F11] text-sm text-zinc-400">
          Cargando carta digital...
        </div>
      }
    >
      <MenuContent {...props} />
    </Suspense>
  );
}
