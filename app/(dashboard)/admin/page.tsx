import { Suspense } from "react";
import { ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { updateOrderStatusAction } from "@/app/(dashboard)/admin/actions";
import { AdminLiveOrdersHeader } from "@/components/admin/AdminLiveOrdersHeader";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import {
  buildGoogleMapsPinUrl,
  buildSellerConfirmationWhatsAppUrl,
  PAYMENT_METHOD_LABELS,
} from "@/lib/whatsapp";
import type { OrderStatus, PaymentMethod } from "@/types/domain";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  completed: "Completado",
  cancelled: "Cancelado",
};

const ORDER_TYPE_TEXT: Record<string, string> = {
  delivery: "🛵 Domicilio",
  pickup: "🛍️ Retiro",
  dine_in: "🍽️ En Mesa",
};

async function AdminOverviewContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tenant = await getTenantForOwner(supabase, user.id);
  if (!tenant) return null;

  const data = await getAdminDashboardData(supabase, tenant);
  const availableProductsCount = data.products.filter(
    (p) => p.is_available
  ).length;

  const tableNumberById = new Map(
    data.tables.map((t) => [t.id, t.table_number])
  );

  return (
    <div className="space-y-6">
      <AdminLiveOrdersHeader
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Pedidos registrados</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {data.orders.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Productos activos</p>
          <p className="mt-1 text-2xl font-black text-[#E11D48]">
            {availableProductsCount} / {data.products.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Categorías</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {data.categories.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Mesas con QR</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            {data.tables.length}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-zinc-50">
              Pedidos Recientes en Tiempo Real
            </h1>
            <p className="text-xs text-zinc-400">
              Órdenes de Mesas QR (atención inmediata) y pedidos a Domicilio /
              Retiro con ubicación y método de pago
            </p>
          </div>
        </div>

        {data.orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center text-sm text-zinc-400">
            Aún no se han registrado pedidos. Comparte tu link{" "}
            <span className="font-mono text-zinc-200">/{tenant.slug}</span> o
            escanea una mesa QR.
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order) => {
              const status = order.status as OrderStatus;
              const paymentMethod = (order.payment_method ||
                "cash") as PaymentMethod;
              const tableNum = order.table_id
                ? tableNumberById.get(order.table_id)
                : null;
              const hasGps =
                typeof order.delivery_lat === "number" &&
                typeof order.delivery_lng === "number";

              const replyWhatsAppUrl = order.customer_phone
                ? buildSellerConfirmationWhatsAppUrl({
                    customerPhone: order.customer_phone,
                    customerName: order.customer_name,
                    restaurantName: tenant.name,
                    orderId: order.id,
                    orderType: order.order_type,
                    paymentMethod,
                    subtotal: Number(order.subtotal),
                    deliveryFee: Number(order.delivery_fee),
                    total: Number(order.total),
                    bankDetails: tenant.bank_details,
                  })
                : null;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#E11D48]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge
                          variant={
                            order.order_type === "dine_in" ? "primary" : "muted"
                          }
                        >
                          {order.order_type === "dine_in" && tableNum
                            ? `🍽️ Mesa #${tableNum}`
                            : (ORDER_TYPE_TEXT[order.order_type] ??
                              order.order_type)}
                        </Badge>
                        <Badge variant="muted">
                          {PAYMENT_METHOD_LABELS[paymentMethod] ??
                            "💵 Efectivo"}
                        </Badge>
                        <Badge
                          variant={
                            status === "completed"
                              ? "success"
                              : status === "cancelled"
                                ? "danger"
                                : "primary"
                          }
                        >
                          {STATUS_LABELS[status] ?? status}
                        </Badge>
                      </div>

                      <p className="text-xs text-zinc-300">
                        {order.customer_name
                          ? `Cliente: ${order.customer_name}`
                          : tableNum
                            ? `Comensal en Mesa #${tableNum}`
                            : "Pedido en local"}{" "}
                        {order.customer_phone
                          ? `• Tel: ${order.customer_phone}`
                          : ""}
                      </p>

                      {order.delivery_address ? (
                        <p className="text-xs text-zinc-400">
                          Dirección: {order.delivery_address}
                          {order.delivery_reference
                            ? ` (${order.delivery_reference})`
                            : ""}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {hasGps ? (
                          <a
                            href={buildGoogleMapsPinUrl(
                              Number(order.delivery_lat),
                              Number(order.delivery_lng)
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E11D48]/40 bg-[#E11D48]/10 px-2.5 py-1 text-[11px] font-bold text-[#E11D48] hover:bg-[#E11D48]/20"
                          >
                            <MapPin className="h-3 w-3" />
                            <span>Ver Ubicación GPS en Mapa</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}

                        {replyWhatsAppUrl ? (
                          <a
                            href={replyWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>
                              Responder con Total y Datos Bancarios
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Total</span>
                        <p className="text-base font-black text-[#E11D48]">
                          {formatCurrency(Number(order.total))}
                        </p>
                      </div>

                      <form
                        action={updateOrderStatusAction}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="hidden"
                          name="orderId"
                          value={order.id}
                        />
                        <select
                          id={`order-status-select-${order.id}`}
                          name="status"
                          defaultValue={order.status}
                          className="rounded-xl border border-zinc-700 bg-[#202024] px-2.5 py-1.5 text-xs text-zinc-100"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="preparing">En preparación</option>
                          <option value="completed">Completado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                        <button
                          id={`order-status-save-${order.id}`}
                          type="submit"
                          className="rounded-xl bg-[#E11D48] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#BE123C]"
                        >
                          Guardar
                        </button>
                      </form>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1 text-xs text-zinc-300">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <span>
                          <strong>{item.quantity}x</strong> {item.product_name}
                          {item.notes ? (
                            <span className="text-zinc-400">
                              {" "}
                              ({item.notes})
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-semibold text-zinc-200">
                          {formatCurrency(Number(item.line_total))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-400">Cargando resumen...</div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
