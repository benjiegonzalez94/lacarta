import { Suspense } from "react";
import { updateOrderStatusAction } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import type { OrderStatus } from "@/types/domain";

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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Pedidos registrados</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {data.orders.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Productos activos</p>
          <p className="mt-1 text-2xl font-black text-[#E5A93C]">
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
              Pedidos Recientes
            </h1>
            <p className="text-xs text-zinc-400">
              Órdenes registradas vía menú público y códigos QR en mesa
            </p>
          </div>
        </div>

        {data.orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center text-sm text-zinc-400">
            Aún no se han registrado pedidos. Realiza una prueba desde el menú
            público{" "}
            <span className="font-mono text-zinc-200">/{tenant.slug}</span>.
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order) => {
              const status = order.status as OrderStatus;
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#E5A93C]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge variant="muted">
                          {ORDER_TYPE_TEXT[order.order_type] ?? order.order_type}
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
                      <p className="mt-1 text-xs text-zinc-300">
                        {order.customer_name
                          ? `Cliente: ${order.customer_name}`
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
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Total</span>
                        <p className="text-base font-black text-[#E5A93C]">
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
                          className="rounded-xl bg-[#E5A93C] px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-[#CA8A04]"
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
                        className="flex items-center justify-between"
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
                        <span className="font-semibold text-zinc-200">
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
