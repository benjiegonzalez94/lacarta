import type { SupabaseClient } from "@supabase/supabase-js";
import { getScheduleStatus } from "@/lib/utils/schedule";
import type { Database } from "@/types/database";
import type {
  BusinessHourRow,
  CategoryRow,
  EnrichedProduct,
  MenuCategoryWithProducts,
  ModifierGroupRow,
  ModifierGroupWithOptions,
  ModifierOptionRow,
  ProductCustomizationMeta,
  ProductModifierGroupRow,
  ProductRow,
  PublicMenuBundle,
  ResolvedTable,
  SauceOption,
} from "@/types/domain";

const DEFAULT_SAUCES: SauceOption[] = [
  {
    id: "bbq",
    name: "BBQ",
    description: "Salsa clásica barbacoa dulce y ahumada",
    spicyLevel: 0,
  },
  {
    id: "mostaza-miel",
    name: "Mostaza y Miel",
    description: "Equilibrio suave, cremoso y agridulce",
    spicyLevel: 0,
  },
  {
    id: "queso-parmesano",
    name: "Queso Parmesano",
    description: "Cremosa con auténtico sabor a queso parmesano sazonado",
    spicyLevel: 0,
  },
  {
    id: "carolina",
    name: "Carolina",
    description: "Salsa picante intensa con notas ahumadas",
    spicyLevel: 1,
    spicyIcon: "🔥",
  },
  {
    id: "buffalo",
    name: "Buffalo",
    description: "La clásica y explosiva salsa picante de alitas",
    spicyLevel: 2,
    spicyIcon: "🔥🔥",
  },
];

const CATEGORY_META_BY_NAME: Record<
  string,
  { badge: string; description: string; icon: string }
> = {
  promociones: {
    badge: "OFERTA",
    description: "Promos especiales por tiempo limitado",
    icon: "sparkles",
  },
  alitas: {
    badge: "LA ESPECIALIDAD",
    description:
      "Crujientes alitas con porción de papas y salsas artesanales a elección",
    icon: "flame",
  },
  especiales: {
    badge: "DE LA CASA",
    description: "Platos contundentes y combinaciones únicas",
    icon: "star",
  },
  hamburguesas: {
    badge: "100% RES",
    description: "Hamburguesas jugosas preparadas al momento",
    icon: "utensils",
  },
  salchipapas: {
    badge: "FAVORITOS",
    description:
      "Papas doradas con salchichas plumrose, huevo y deditos de pollo",
    icon: "flame",
  },
  adicionales: {
    badge: "EXTRAS",
    description: "Agrega más sabor, porciones extra y salsas adicionales",
    icon: "plus-circle",
  },
  bebidas: {
    badge: "REFRESCANTE",
    description: "Batidos cremosos, frozens frutales y té helado",
    icon: "cup-soda",
  },
  colas: {
    badge: "BIEN FRÍAS",
    description: "Gaseosas personales y familiares en vidrio y plástico",
    icon: "glass-water",
  },
};

function inferProductVisualMeta(product: ProductRow): ProductCustomizationMeta {
  const normalizedName = product.name.toLowerCase();
  const meta: ProductCustomizationMeta = {};

  if (normalizedName.includes("promo")) {
    meta.tag = "PROMO DEL DÍA";
    meta.isPromo = true;
  } else if (normalizedName.startsWith("6 alitas")) {
    meta.tag = "INDIVIDUAL";
  } else if (normalizedName.startsWith("12 alitas")) {
    meta.tag = "PARA DOS";
  } else if (normalizedName.startsWith("18 alitas")) {
    meta.tag = "POPULAR";
  } else if (normalizedName.startsWith("24 alitas")) {
    meta.tag = "PARA COMPARTIR";
  } else if (normalizedName.startsWith("30 alitas")) {
    meta.tag = "SUPER COMBO";
  } else if (normalizedName.includes("premium")) {
    meta.tag = "ESPECIALIDAD";
  } else if (normalizedName.includes("explosión")) {
    meta.tag = "RECOMENDADO";
  } else if (normalizedName.includes("papipollo")) {
    meta.tag = "CLÁSICO";
  } else if (normalizedName.includes("hamburguesa tipo 2")) {
    meta.tag = "COMBO COMPLETO";
  } else if (normalizedName.includes("hamburguesa tipo 1")) {
    meta.tag = "LA FAVORITA";
  } else if (normalizedName.includes("kids")) {
    meta.tag = "INFANTIL";
  }

  return meta;
}

export async function getPublicMenuBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<PublicMenuBundle | null> {
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (tenantError || !tenant) {
    return null;
  }

  const [
    { data: categoriesData },
    { data: productsData },
    { data: hoursData },
    { data: groupsData },
    { data: optionsData },
    { data: productGroupsData },
    { data: publicTablesData },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("business_hours")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("modifier_groups")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("modifier_options")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_modifier_groups")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase.rpc("list_public_tables", { p_slug: slug }),
  ]);

  const rawCategories: CategoryRow[] = categoriesData ?? [];
  const rawProducts: ProductRow[] = productsData ?? [];
  const rawHours: BusinessHourRow[] = hoursData ?? [];
  const rawGroups: ModifierGroupRow[] = groupsData ?? [];
  const rawOptions: ModifierOptionRow[] = optionsData ?? [];
  const rawProductLinks: ProductModifierGroupRow[] = productGroupsData ?? [];

  const groupsWithOptionsMap = new Map<string, ModifierGroupWithOptions>();
  for (const grp of rawGroups) {
    const grpOptions = rawOptions
      .filter((opt) => opt.group_id === grp.id)
      .map((opt) => ({
        ...opt,
        price_delta: Number(opt.price_delta),
      }));
    if (grpOptions.length > 0) {
      groupsWithOptionsMap.set(grp.id, {
        ...grp,
        options: grpOptions,
      });
    }
  }

  const categories: MenuCategoryWithProducts[] = rawCategories
    .map((category) => {
      const catKey = category.name.trim().toLowerCase();
      const extra = CATEGORY_META_BY_NAME[catKey];
      const categoryProducts: EnrichedProduct[] = rawProducts
        .filter((p) => p.category_id === category.id)
        .map((product) => {
          const attachedGroups = rawProductLinks
            .filter((link) => link.product_id === product.id)
            .map((link) => groupsWithOptionsMap.get(link.group_id))
            .filter((g): g is ModifierGroupWithOptions => Boolean(g));

          return {
            ...product,
            price: Number(product.price),
            meta: inferProductVisualMeta(product),
            modifierGroups: attachedGroups,
          };
        });

      return {
        ...category,
        badge: extra?.badge,
        description: extra?.description,
        icon: extra?.icon,
        products: categoryProducts,
      };
    })
    .filter((cat) => cat.products.length > 0);

  const tables: ResolvedTable[] = (publicTablesData ?? []).map((tb) => ({
    tableId: tb.table_id,
    tableNumber: tb.table_number,
    qrToken: tb.qr_token,
  }));

  return {
    tenant: {
      ...tenant,
      delivery_fee: Number(tenant.delivery_fee),
    },
    branding: {
      slogan: tenant.slogan || "Arte en Sabor",
      primaryColor: tenant.primary_color || "#E11D48",
      secondaryColor: tenant.secondary_color || "#BE123C",
      bannerUrl: tenant.banner_url ?? null,
      taglines: [
        tenant.slogan || "Arte en Sabor",
        "Pide antes de llegar o desde tu mesa sin hacer filas",
      ],
      serviceNotice: "Atención en Mesa y Retiro en el Local sin esperas",
    },
    categories,
    sauces: DEFAULT_SAUCES,
    schedule: getScheduleStatus(rawHours),
    tables,
  };
}

export async function resolveTableByQrToken(
  supabase: SupabaseClient<Database>,
  slug: string,
  qrToken: string
): Promise<ResolvedTable | null> {
  const { data, error } = await supabase.rpc("resolve_table", {
    p_slug: slug,
    p_qr_token: qrToken,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    tableId: row.table_id,
    tableNumber: row.table_number,
    qrToken,
  };
}
