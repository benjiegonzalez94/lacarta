"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CustomerCardRow } from "@/types/domain";

const SaveCardSchema = z.object({
  cardBrand: z.enum(["Visa", "Mastercard", "Diners", "Amex"]).default("Visa"),
  cardNumber: z.string().trim().min(12).max(19),
  holderName: z.string().trim().min(3, "Ingresa el nombre del titular"),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(2025).max(2040),
  isDefault: z.boolean().default(true),
});

export async function getCustomerCardsAction(): Promise<CustomerCardRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: cards } = await supabase
    .from("customer_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return cards ?? [];
}

export async function saveCustomerCardAction(
  rawInput: z.infer<typeof SaveCardSchema>
): Promise<{ ok: boolean; card?: CustomerCardRow; error?: string }> {
  const parsed = SaveCardSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión para guardar una tarjeta." };
  }

  const cleanNumber = parsed.data.cardNumber.replace(/\s+/g, "");
  const last4 = cleanNumber.slice(-4);
  const cardToken = `tok_${parsed.data.cardBrand.toLowerCase()}_${Date.now()}_${last4}`;

  if (parsed.data.isDefault) {
    await supabase
      .from("customer_cards")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data: newCard, error } = await supabase
    .from("customer_cards")
    .insert({
      user_id: user.id,
      card_brand: parsed.data.cardBrand,
      last4,
      holder_name: parsed.data.holderName.toUpperCase(),
      exp_month: parsed.data.expMonth,
      exp_year: parsed.data.expYear,
      card_token: cardToken,
      is_default: parsed.data.isDefault,
    })
    .select("*")
    .single();

  if (error || !newCard) {
    return { ok: false, error: error?.message ?? "Error al guardar la tarjeta." };
  }

  revalidatePath("/");
  return { ok: true, card: newCard };
}

export async function deleteCustomerCardAction(cardId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  await supabase
    .from("customer_cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  revalidatePath("/");
  return { ok: true };
}
