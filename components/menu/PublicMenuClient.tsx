"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CartCheckoutDrawer } from "@/components/menu/CartCheckoutDrawer";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { FloatingCartBar } from "@/components/menu/FloatingCartBar";
import { ProductCard } from "@/components/menu/ProductCard";
import { ProductCustomizeModal } from "@/components/menu/ProductCustomizeModal";
import { Badge } from "@/components/ui/Badge";
import { roundMoney } from "@/lib/utils/currency";
import type {
  CartItem,
  EnrichedProduct,
  PublicMenuBundle,
  ResolvedTable,
  SelectedModifierChoice,
} from "@/types/domain";

export interface PublicMenuClientProps {
  menu: PublicMenuBundle;
  resolvedTable?: ResolvedTable | null;
}

function getStorageKey(slug: string): string {
  return `lacarta_cart_${slug}`;
}

function readStoredCart(storageKey: string): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function subscribeNoop() {
  return () => {};
}

function buildCartItemSignature(params: {
  productId: string;
  selectedModifiers: SelectedModifierChoice[];
  customNotes: string;
}): string {
  const modsKey = params.selectedModifiers
    .map((m) => m.optionId)
    .sort()
    .join(",");
  return `${params.productId}::${modsKey}::${params.customNotes}`;
}

export function PublicMenuClient({
  menu,
  resolvedTable,
}: PublicMenuClientProps) {
  const storageKey = getStorageKey(menu.tenant.slug);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    menu.categories[0]?.id ?? ""
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>(() =>
    readStoredCart(storageKey)
  );
  const [customizingProduct, setCustomizingProduct] =
    useState<EnrichedProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Ignore quota errors
    }
  }, [cart, storageKey]);

  const activeCart = useMemo(() => (isClient ? cart : []), [cart, isClient]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return menu.categories;

    return menu.categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [menu.categories, searchQuery]);

  const qtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeCart) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [activeCart]);

  const totalItems = useMemo(
    () => activeCart.reduce((sum, item) => sum + item.quantity, 0),
    [activeCart]
  );

  const subtotal = useMemo(
    () =>
      activeCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [activeCart]
  );

  function handleSelectCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    const el = document.getElementById(`category-section-${categoryId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSelectProduct(product: EnrichedProduct) {
    if (product.modifierGroups.length > 0) {
      setCustomizingProduct(product);
      return;
    }

    handleConfirmAdd({
      product,
      quantity: 1,
      selectedModifiers: [],
      customNotes: "",
    });
  }

  function handleConfirmAdd(params: {
    product: EnrichedProduct;
    quantity: number;
    selectedModifiers: SelectedModifierChoice[];
    customNotes: string;
  }) {
    const cartItemId = buildCartItemSignature({
      productId: params.product.id,
      selectedModifiers: params.selectedModifiers,
      customNotes: params.customNotes,
    });

    const modsDelta = params.selectedModifiers.reduce(
      (sum, m) => sum + m.priceDelta,
      0
    );
    const unitPrice = roundMoney(params.product.price + modsDelta);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.cartItemId === cartItemId
      );
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: Math.min(50, item.quantity + params.quantity),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          cartItemId,
          productId: params.product.id,
          name: params.product.name,
          basePrice: params.product.price,
          unitPrice,
          quantity: params.quantity,
          selectedModifiers: params.selectedModifiers,
          selectedSauces: [],
          selectedOption: null,
          customNotes: params.customNotes,
        },
      ];
    });

    setCustomizingProduct(null);
  }

  function handleUpdateCartQty(cartItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: Math.min(50, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function handleRemoveCartItem(cartItemId: string) {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  }

  function handleClearCart() {
    setCart([]);
  }

  return (
    <>
      <CategoryTabs
        categories={menu.categories}
        activeCategoryId={activeCategoryId}
        searchQuery={searchQuery}
        onSelectCategory={handleSelectCategory}
        onSearchChange={setSearchQuery}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-32">
        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center">
            <p className="text-sm font-semibold text-zinc-200">
              No encontramos platos que coincidan con &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              id="reset-search-filter-btn"
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 rounded-xl bg-[#E5A93C] px-4 py-2 text-xs font-bold text-zinc-950"
            >
              Ver todo el menú
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section
                key={category.id}
                id={`category-section-${category.id}`}
                className="scroll-mt-28"
              >
                <div className="mb-3.5 flex items-end justify-between border-b border-zinc-800/80 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black uppercase tracking-tight text-zinc-50 sm:text-xl">
                        {category.name}
                      </h2>
                      {category.badge ? (
                        <Badge variant="primary">{category.badge}</Badge>
                      ) : null}
                    </div>
                    {category.description ? (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantityInCart={qtyByProductId.get(product.id) ?? 0}
                      onSelectProduct={handleSelectProduct}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <FloatingCartBar
        totalItems={totalItems}
        subtotal={subtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {customizingProduct ? (
        <ProductCustomizeModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onConfirmAdd={handleConfirmAdd}
        />
      ) : null}

      {isCartOpen ? (
        <CartCheckoutDrawer
          tenant={menu.tenant}
          cart={activeCart}
          resolvedTable={resolvedTable}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={handleUpdateCartQty}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
        />
      ) : null}
    </>
  );
}
