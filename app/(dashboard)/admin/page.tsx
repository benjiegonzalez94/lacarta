import { Suspense } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Landmark,
  User,
} from "lucide-react";
import { updateOrderStatusAction } from "@/app/(dashboard)/admin/actions";
import { AdminLiveOrdersHeader } from "@/components/admin/AdminLiveOrdersHeader";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import type { OrderStatus, PaymentMethod } from "@/types/domain";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Recibido",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "¡Listo para retirar en barra!",
  completed: "Entregado",
  cancelled: "Cancelado",
  no_show: "No se presentó (Efectivo bloqueado)",
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

  const activeOrdersCount = data.orders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready"].includes(o.status)
  ).length;

  return (
    <div className="space-y-6">
      <AdminLiveOrdersHeader
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Pedidos activos</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            {activeOrdersCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Total pedidos</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {data.orders.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Productos activos</p>
          <p className="mt-1 text-2xl font-black text-[#E11D48]">
            {availableProductsCount}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3">
          <h1 className="text-base font-black uppercase tracking-tight text-zinc-50">
            Comandas de Cocina y Retiros en Barra
          </h1>
          <p className="text-xs text-zinc-400">
            Verifica el comprobante si es transferencia, prepara el pedido y márcalo listo para que el cliente se acerque a la barra.
          </p>
        </div>

        {data.orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center text-sm text-zinc-400">
            Aún no hay pedidos registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order) => {
              const status = order.status as OrderStatus;
              const paymentMethod = (order.payment_method || "cash") as PaymentMethod;
              const pickupPin = order.pickup_pin || "----";

              const isCard = paymentMethod === "card";
              const isTransfer = paymentMethod === "transfer";
              
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    status === "ready"
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : status === "preparing"
                        ? "border-[#E11D48]/50 bg-[#18181B]"
                        : "border-zinc-800 bg-[#18181B]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs font-black text-[#FB7185]">
                          PIN: {pickupPin}
                        </span>
                        <Badge
                          variant={
                            order.order_type === "dine_in" ? "primary" : "muted"
                          }
                        >
                          {order.order_type === "dine_in"
                            ? "🍽️ Retiro en Barra (Para Servir)"
                            : "🛍️ Retiro en Barra (Para Llevar)"}
                        </Badge>

                        {/* Payment Method Badge */}
                        {isCard ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-black text-violet-300">
                            <CreditCard className="h-3 w-3" />
                            <span>
                              PAGADO CON TARJETA ({order.card_brand || "Visa"} •••• {order.card_last4 || "4242"})
                            </span>
                          </span>
                        ) : isTransfer ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-black text-blue-300">
                            <Landmark className="h-3 w-3" />
                            <span>TRANSFERENCIA BANCARIA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                            <span>COBRAR EN EFECTIVO AL ENTREGAR</span>
                          </span>
                        )}

                        <Badge
                          variant={
                            status === "completed" || status === "ready"
                              ? "success"
                              : status === "cancelled" || status === "no_show"
                                ? "danger"
                                : "primary"
                          }
                        >
                          {STATUS_LABELS[status] ?? status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2.5 pt-0.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-[#202024]">
                          {order.customer_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={order.customer_avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-zinc-400" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-zinc-200">
                          {order.customer_name || "Cliente"}
                          {order.customer_cedula
                            ? ` • CI: ${order.customer_cedula}`
                            : ""}
                          {order.customer_phone
                            ? ` • Cel: ${order.customer_phone}`
                            : ""}
                        </p>
                      </div>

                      {/* Payment Proof Button for Transfer */}
                      {order.payment_proof_url ? (
                        <div className="pt-1">
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <FileCheck2 className="h-4 w-4" />
                            <span>Ver Comprobante de Transferencia</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ) : isTransfer ? (
                        <p className="text-[11px] font-semibold text-amber-300">
                          ⚠️ Sin comprobante adjunto.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="text-base font-black text-[#FB7185]">
                        {formatCurrency(Number(order.total))}
                      </p>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {status === "pending" || status === "confirmed" ? (
                          <form action={updateOrderStatusAction}>
                            <input
                              type="hidden"
                              name="orderId"
                              value={order.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="preparing"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3.5 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              <span>Mandar a Cocina</span>
                            </button>
                          </form>
                        ) : null}

                        {status === "preparing" ? (
                          <form action={updateOrderStatusAction}>
                            <input
                              type="hidden"
                              name="orderId"
                              value={order.id}
                            />
                            <input type="hidden" name="status" value="ready" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-zinc-950 hover:bg-emerald-400"
                            >
                              <BellRing className="h-3.5 w-3.5" />
                              <span>¡Marcar Listo para Barra!</span>
                            </button>
                          </form>
                        ) : null}

                        {status === "ready" ? (
                          <form action={updateOrderStatusAction}>
                            <input
                              type="hidden"
                              name="orderId"
                              value={order.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="completed"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-2 text-xs font-black text-zinc-950 hover:bg-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Entregado</span>
                            </button>
                          </form>
                        ) : null}

                        <form
                          action={updateOrderStatusAction}
                          className="flex items-center gap-1"
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
                            className="rounded-xl border border-zinc-700 bg-[#202024] px-2 py-1.5 text-xs text-zinc-100"
                          >
                            <option value="pending">Recibido</option>
                            <option value="preparing">Preparando</option>
                            <option value="ready">¡Listo para retirar!</option>
                            <option value="completed">Entregado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="no_show">
                              No se presentó (Bloquear efectivo)
                            </option>
                          </select>
                          <button
                            id={`order-status-save-${order.id}`}
                            type="submit"
                            className="rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48]"
                          >
                            OK
                          </button>
                        </form>
                      </div>
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
                  {order.notes ? (
                    <p className="mt-2 rounded-lg bg-[#141418] px-2.5 py-1.5 text-[11px] text-zinc-400">
                      📝 {order.notes}
                    </p>
                  ) : null}
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
        <div className="text-sm text-zinc-400">Cargando pedidos...</div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
