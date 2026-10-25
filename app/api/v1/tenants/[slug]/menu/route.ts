import { NextResponse } from "next/server";
import { getPublicMenuBySlug } from "@/lib/services/menu.service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { SlugSchema } from "@/lib/validators/order";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const parsedSlug = SlugSchema.safeParse(rawSlug);

  if (!parsedSlug.success) {
    return NextResponse.json(
      { error: "INVALID_SLUG", details: parsedSlug.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createPublicServerClient();
  const menu = await getPublicMenuBySlug(supabase, parsedSlug.data);

  if (!menu) {
    return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ data: menu });
}
