import type { SupabaseClient } from "@supabase/supabase-js";
import { getScheduleStatus } from "@/lib/utils/schedule";
import type { Database } from "@/types/database";
import type {
  CategoryRow,
  EnrichedProduct,
  MenuCategoryWithProducts,
  ProductCustomizationMeta,
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

function inferProductCustomization(
  product: ProductRow,
  categoryName: string
): ProductCustomizationMeta {
  const normalizedName = product.name.toLowerCase();
  const normalizedDesc = (product.description ?? "").toLowerCase();
  const normalizedCat = categoryName.toLowerCase();

  const meta: ProductCustomizationMeta = {};

  // Detect sauce count from description or product name (e.g. "2 salsas a elección", "3 salsas")
  const sauceMatch =
    normalizedDesc.match(/(\d+)\s*(?:salsas?|sabores?)/i) ??
    normalizedName.match(/(\d+)\s*(?:salsas?|sabores?)/i);

  if (sauceMatch) {
    const count = Number.parseInt(sauceMatch[1], 10);
    if (Number.isFinite(count) && count > 0) {
      meta.maxSauces = count;
    }
  } else if (normalizedCat.includes("alitas")) {
    meta.maxSauces = 2;
  }

  if (
    normalizedName.includes("papas") ||
    normalizedCat.includes("alitas") ||
    normalizedDesc.includes("papas")
  ) {
    meta.includesFries = true;
  }

  // Tags for visual hierarchy
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

  // Options for extra sauces
  if (normalizedName.includes("salsa cheddar")) {
    meta.options = ["Salsa Cheddar", "Salsa Ranch", "Queso Crema"];
  }

  // Flavors for sodas / colas or Fuze Tea
  if (normalizedCat.includes("colas")) {
    if (normalizedName.includes("vidrio")) {
      meta.flavors = [
        "Coca-Cola",
        "Sprite",
        "Fanta",
        "Inca Kola",
        "Fioravanti",
      ];
    } else {
      meta.flavors = ["Coca-Cola", "Sprite", "Fanta", "Inca Kola"];
    }
  } else if (normalizedName.includes("fuze")) {
    meta.flavors = ["Fuze Tea Limón", "Fuze Tea Durazno"];
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

  const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
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
  ]);

  const rawCategories: CategoryRow[] = categoriesData ?? [];
  const rawProducts: ProductRow[] = productsData ?? [];

  const categories: MenuCategoryWithProducts[] = rawCategories
    .map((category) => {
      const catKey = category.name.trim().toLowerCase();
      const extra = CATEGORY_META_BY_NAME[catKey];
      const categoryProducts: EnrichedProduct[] = rawProducts
        .filter((p) => p.category_id === category.id)
        .map((product) => ({
          ...product,
          price: Number(product.price),
          meta: inferProductCustomization(product, category.name),
        }));

      return {
        ...category,
        badge: extra?.badge,
        description: extra?.description,
        icon: extra?.icon,
        products: categoryProducts,
      };
    })
    .filter((cat) => cat.products.length > 0);

  return {
    tenant: {
      ...tenant,
      delivery_fee: Number(tenant.delivery_fee),
    },
    branding: {
      slogan: "Arte en Sabor",
      taglines: [
        "Arte en Sabor",
        "Alitas, Amigos y Buenos Momentos",
        "Alitas • Papas Fritas • Hamburguesas",
      ],
      serviceNotice: "Servicio a Domicilio disponible en horario de atención",
    },
    categories,
    sauces: DEFAULT_SAUCES,
    schedule: getScheduleStatus(),
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
