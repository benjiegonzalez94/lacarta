import { Suspense } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  ExternalLink,
  FileCheck2,
  MessageCircle,
  ShieldAlert,
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
import {
  buildSellerConfirmationWhatsAppUrl,
  PAYMENT_METHOD_LABELS,
} from "@/lib/whatsapp";
import type { OrderStatus, PaymentMethod } from "@/types/domain";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Recibido",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "¡Listo para retirar / servir!",
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

  const tableNumberById = new Map(
    data.tables.map((t) => [t.id, t.table_number])
  );

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Pedidos en curso</p>
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
            {availableProductsCount} / {data.products.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-4">
          <p className="text-xs text-zinc-400">Mesas del local</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {data.tables.length}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-zinc-50">
              Control de Despacho y Cocina en Tiempo Real
            </h1>
            <p className="text-xs text-zinc-400">
              Avanza el estado con 1 toque (Recibido → Preparando → ¡Listo para
              retirar!) para avisar al cliente en su celular sin necesitar
              meseros
            </p>
          </div>
        </div>

        {data.orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center text-sm text-zinc-400">
            Aún no se han registrado pedidos. Comparte tu link{" "}
            <span className="font-mono text-zinc-200">/{tenant.slug}</span> o
            coloca los códigos QR en tus mesas.
          </div>
        ) : (
          <div className="space-y-3.5">
            {data.orders.map((order) => {
              const status = order.status as OrderStatus;
              const paymentMethod = (order.payment_method ||
                "cash") as PaymentMethod;
              const tableNum = order.table_id
                ? tableNumberById.get(order.table_id)
                : null;
              const arrivalMode = order.arrival_mode || "on_the_way";
              const pickupPin = order.pickup_pin || "----";

              let modalityLabel = "🛍️ Para Llevar (Retiro en Barra)";
              if (order.order_type === "dine_in") {
                modalityLabel = tableNum
                  ? `🍽️ Para Servir • Mesa #${tableNum}`
                  : "🚗 Para Servir (Cliente en camino)";
              }

              const replyWhatsAppUrl = order.customer_phone
                ? buildSellerConfirmationWhatsAppUrl({
                    customerPhone: order.customer_phone,
                    customerName: order.customer_name,
                    restaurantName: tenant.name,
                    orderId: order.id,
                    orderType: order.order_type,
                    paymentMethod,
                    subtotal: Number(order.subtotal),
                    deliveryFee: 0,
                    total: Number(order.total),
                    bankDetails: tenant.bank_details,
                  })
                : null;

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
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs font-black text-[#FB7185]">
                          PIN: {pickupPin}
                        </span>
                        <span className="font-mono text-xs font-bold text-zinc-400">
                          #{order.id.slice(0, 6).toUpperCase()}
                        </span>
                        <Badge
                          variant={
                            order.order_type === "dine_in" ? "primary" : "muted"
                          }
                        >
                          {modalityLabel}
                        </Badge>
                        <Badge variant="muted">
                          {PAYMENT_METHOD_LABELS[paymentMethod] ??
                            "💵 Efectivo"}
                        </Badge>
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

                      <p className="text-xs font-semibold text-zinc-200">
                        {order.customer_name
                          ? `Cliente: ${order.customer_name}`
                          : tableNum
                            ? `Comensal en Mesa #${tableNum}`
                            : "Cliente en local"}{" "}
                        {order.customer_phone
                          ? `• Cel: ${order.customer_phone}`
                          : ""}
                      </p>

                      {paymentMethod === "cash" &&
                      arrivalMode === "on_the_way" &&
                      !tableNum ? (
                        <p className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                          <span>
                            Efectivo en camino: Si tienes alta demanda, confirma
                            llegada en barra o por WhatsApp.
                          </span>
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {order.payment_proof_url ? (
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            <span>Ver Comprobante de Transferencia</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}

                        {replyWhatsAppUrl ? (
                          <a
                            href={replyWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-[#202024] px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-300"
                          >
                            <MessageCircle className="h-3 w-3 text-emerald-400" />
                            <span>Contactar por WhatsApp</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Total</span>
                        <p className="text-base font-black text-[#FB7185]">
                          {formatCurrency(Number(order.total))}
                        </p>
                      </div>

                      {/* 1-Tap Kitchen Dispatch Buttons */}
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
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-[#BE123C]"
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              <span>Pasar a Preparando</span>
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
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-zinc-950 shadow-sm hover:bg-emerald-400"
                            >
                              <BellRing className="h-3.5 w-3.5" />
                              <span>¡Listo para Retirar / Mesa!</span>
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
                              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Marcar Entregado</span>
                            </button>
                          </form>
                        ) : null}

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
                            <option value="pending">Recibido</option>
                            <option value="preparing">En preparación</option>
                            <option value="ready">
                              ¡Listo para retirar / mesa!
                            </option>
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
                            Cambiar
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
                      📝 Nota del cliente: {order.notes}
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
        <div className="text-sm text-zinc-400">Cargando resumen...</div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
