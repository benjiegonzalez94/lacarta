"use client";

import {
  CupSoda,
  Flame,
  GlassWater,
  PlusCircle,
  Search,
  Sparkles,
  Star,
  Utensils,
  X,
} from "lucide-react";
import type { MenuCategoryWithProducts } from "@/types/domain";

export interface CategoryTabsProps {
  categories: MenuCategoryWithProducts[];
  activeCategoryId: string;
  searchQuery: string;
  onSelectCategory: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
}

function renderCategoryIcon(iconName?: string) {
  switch (iconName) {
    case "sparkles":
      return <Sparkles className="h-3.5 w-3.5" />;
    case "flame":
      return <Flame className="h-3.5 w-3.5" />;
    case "star":
      return <Star className="h-3.5 w-3.5" />;
    case "utensils":
      return <Utensils className="h-3.5 w-3.5" />;
    case "plus-circle":
      return <PlusCircle className="h-3.5 w-3.5" />;
    case "cup-soda":
      return <CupSoda className="h-3.5 w-3.5" />;
    case "glass-water":
      return <GlassWater className="h-3.5 w-3.5" />;
    default:
      return <Flame className="h-3.5 w-3.5" />;
  }
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  searchQuery,
  onSelectCategory,
  onSearchChange,
}: CategoryTabsProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-zinc-800/90 bg-[#0F0F11]/95 pt-7 backdrop-blur-md sm:pt-0">
      <div className="mx-auto max-w-3xl px-4 py-2.5 sm:py-3">
        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="menu-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar alitas, hamburguesas, batidos..."
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] py-2 pr-9 pl-10 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-[#E5A93C] focus:outline-none"
          />
          {searchQuery ? (
            <button
              id="menu-search-clear-btn"
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <nav
          aria-label="Categorías del menú"
          className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5"
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                id={`category-tab-${category.id}`}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#E5A93C] text-zinc-950 shadow-sm shadow-[#E5A93C]/30"
                    : "border border-zinc-800 bg-[#18181B] text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                }`}
              >
                {renderCategoryIcon(category.icon)}
                <span>{category.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive
                      ? "bg-zinc-950/20 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {category.products.length}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
