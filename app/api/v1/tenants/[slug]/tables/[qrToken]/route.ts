import { NextResponse } from "next/server";
import { resolveTableByQrToken } from "@/lib/services/menu.service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { QrTokenSchema, SlugSchema } from "@/lib/validators/order";

interface RouteContext {
  params: Promise<{ slug: string; qrToken: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: rawSlug, qrToken: rawQrToken } = await context.params;
  const parsedSlug = SlugSchema.safeParse(rawSlug);
  const parsedToken = QrTokenSchema.safeParse(rawQrToken);

  if (!parsedSlug.success || !parsedToken.success) {
    return NextResponse.json(
      { error: "INVALID_PARAMETERS" },
      { status: 400 }
    );
  }

  const supabase = createPublicServerClient();
  const table = await resolveTableByQrToken(
    supabase,
    parsedSlug.data,
    parsedToken.data
  );

  if (!table) {
    return NextResponse.json({ error: "TABLE_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ data: table });
}
