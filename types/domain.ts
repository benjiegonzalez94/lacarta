import type { Tables } from "@/types/database";

export type TenantRow = Tables<"tenants">;
export type CategoryRow = Tables<"categories">;
export type ProductRow = Tables<"products">;
export type TableRow = Tables<"tables">;
export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type BusinessHourRow = Tables<"business_hours">;
export type ModifierGroupRow = Tables<"modifier_groups">;
export type ModifierOptionRow = Tables<"modifier_options">;
export type ProductModifierGroupRow = Tables<"product_modifier_groups">;

export type OrderType = "delivery" | "pickup" | "dine_in";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "completed"
  | "cancelled";

export interface SauceOption {
  id: string;
  name: string;
  description: string;
  spicyLevel: 0 | 1 | 2;
  spicyIcon?: string;
}

export interface ModifierGroupWithOptions extends ModifierGroupRow {
  options: ModifierOptionRow[];
}

export interface ProductCustomizationMeta {
  tag?: string;
  isPromo?: boolean;
  maxSauces?: number;
  includesFries?: boolean;
  options?: string[];
  flavors?: string[];
}

export interface EnrichedProduct extends ProductRow {
  meta: ProductCustomizationMeta;
  modifierGroups: ModifierGroupWithOptions[];
}

export interface MenuCategoryWithProducts extends CategoryRow {
  badge?: string;
  description?: string;
  icon?: string;
  products: EnrichedProduct[];
}

export interface DayScheduleItem {
  dayOfWeek: number;
  dayName: string;
  hours: string;
  isOpen: boolean;
}

export interface ScheduleStatus {
  isOpen: boolean;
  statusLabel: string;
  notice: string;
  todayHours: string | null;
  scheduleList: DayScheduleItem[];
}

export interface TenantBranding {
  slogan: string;
  primaryColor: string;
  secondaryColor: string;
  bannerUrl: string | null;
  taglines: string[];
  serviceNotice: string;
}

export interface PublicMenuBundle {
  tenant: TenantRow;
  branding: TenantBranding;
  categories: MenuCategoryWithProducts[];
  sauces: SauceOption[];
  schedule: ScheduleStatus;
}

export interface ResolvedTable {
  tableId: string;
  tableNumber: number;
  qrToken: string;
}

export interface SelectedModifierChoice {
  optionId: string;
  groupId: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  selectedModifiers: SelectedModifierChoice[];
  selectedSauces: string[];
  selectedOption: string | null;
  customNotes: string;
}

export interface OrderItemPayload {
  product_id: string;
  quantity: number;
  notes: string | null;
  option_ids?: string[];
}

export interface PlaceOrderInput {
  slug: string;
  orderType: OrderType;
  items: OrderItemPayload[];
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  notes?: string | null;
  tableToken?: string | null;
}

export interface OrderCalculationResult {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface PlaceOrderResult {
  orderId: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  whatsappUrl: string;
  whatsappMessage: string;
}
