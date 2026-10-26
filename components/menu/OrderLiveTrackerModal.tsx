"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Landmark,
  RefreshCw,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";

export interface LiveOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  line_total: number;
  notes: string | null;
}

export interface LiveOrderStatusData {
  order_id: string;
  tenant_slug: string;
  tenant_name: string;
  tenant_branch?: string;
  tenant_phone: string;
  order_type: string;
  status: string;
  arrival_mode: string;
  table_number: number | null;
  payment_method: string;
  payment_status?: string;
  card_brand?: string | null;
  card_last4?: string | null;
  payment_reference?: string | null;
  has_payment_proof: boolean;
  pickup_pin: string;
  customer_name: string | null;
  total: number;
  created_at: string;
  items: LiveOrderItem[];
}

export interface OrderLiveTrackerModalProps {
  orderId: string;
  onClose: () => void;
}

const STEPS = [
  {
    key: "pending",
    label: "Recibido",
    desc: "El local recibió tu pedido.",
    icon: Clock,
  },
  {
    key: "preparing",
    label: "En Preparación",
    desc: "Están preparando tu comida en cocina.",
    icon: ChefHat,
  },
  {
    key: "ready",
    label: "¡Listo para Retirar en Barra!",
    desc: "Acércate a la barra con tu PIN a retirar y siéntate en la mesa que prefieras.",
    icon: BellRing,
  },
  {
    key: "completed",
    label: "Entregado",
    desc: "¡Buen provecho!",
    icon: CheckCircle2,
  },
];

function getStepIndex(status: string): number {
  if (status === "pending" || status === "confirmed") return 0;
  if (status === "preparing") return 1;
  if (status === "ready") return 2;
  if (status === "completed") return 3;
  return -1;
}

export function OrderLiveTrackerModal({
  orderId,
  onClose,
}: OrderLiveTrackerModalProps) {
  const [order, setOrder] = useState<LiveOrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_order_live_status", {
        p_order_id: orderId,
      });
      if (data && data.length > 0) {
        const row = data[0];
        const parsedItems = Array.isArray(row.items)
          ? (row.items as unknown as LiveOrderItem[])
          : [];
        setOrder({
          order_id: row.order_id,
          tenant_slug: row.tenant_slug,
          tenant_name: row.tenant_name,
          tenant_branch: row.tenant_branch ?? undefined,
          tenant_phone: row.tenant_phone,
          order_type: row.order_type,
          status: row.status,
          arrival_mode: row.arrival_mode,
          table_number: row.table_number,
          payment_method: row.payment_method,
          payment_status: row.payment_status ?? undefined,
          card_brand: row.card_brand ?? null,
          card_last4: row.card_last4 ?? null,
          payment_reference: row.payment_reference ?? null,
          has_payment_proof: row.has_payment_proof,
          pickup_pin: row.pickup_pin,
          customer_name: row.customer_name,
          total: Number(row.total),
          created_at: row.created_at,
          items: parsedItems,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStatus();

    const supabase = createClient();
    const channel = supabase
      .channel(`live-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          void fetchStatus();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void fetchStatus();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isReady = order?.status === "ready";
  const isCancelled =
    order?.status === "cancelled" || order?.status === "no_show";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#18181B] text-zinc-50 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
              Estado de tu Pedido
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="refresh-order-tracker-btn"
              type="button"
              onClick={() => void fetchStatus()}
              aria-label="Actualizar estado"
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              id="close-order-tracker-btn"
              type="button"
              onClick={onClose}
              aria-label="Cerrar monitor"
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading || !order ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Cargando estado del pedido...
            </div>
          ) : (
            <>
              {/* Order Highlight Card */}
              <div
                className={`rounded-2xl border p-4 ${
                  isReady
                    ? "border-emerald-500/60 bg-emerald-500/15"
                    : "border-[#E11D48]/40 bg-[#141418]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-zinc-400">
                      {order.tenant_name}{" "}
                      {order.tenant_branch ? `(${order.tenant_branch}) ` : ""}• #
                      {order.order_id.slice(0, 6).toUpperCase()}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-zinc-50">
                      {order.order_type === "dine_in" ? (
                        <>
                          <Utensils className="h-4 w-4 text-[#FB7185]" />
                          <span>Para Servir (Retiro en Barra)</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4 text-[#FB7185]" />
                          <span>Para Llevar (Retiro en Barra)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-1.5 text-center">
                    <span className="block text-[9px] font-bold uppercase text-zinc-400">
                      PIN RETIRO
                    </span>
                    <span className="font-mono text-lg font-black text-[#FB7185]">
                      {order.pickup_pin}
                    </span>
                  </div>
                </div>

                {isReady ? (
                  <div className="mt-3 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-zinc-950 animate-pulse">
                    🔔 ¡LISTO PARA RETIRAR! Acércate a la barra con tu PIN {order.pickup_pin}
                    {order.payment_method === "cash" ? " para pagar en efectivo y recibir tu comida." : " a retirar tu pedido."}
                    {" "}Luego eres libre de sentarte en cualquier mesa disponible.
                  </div>
                ) : null}
              </div>

              {/* Progress Steps */}
              {!isCancelled ? (
                <div className="space-y-2 rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const done = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 rounded-xl p-2.5 ${
                          isCurrent
                            ? "border border-[#E11D48]/50 bg-[#E11D48]/10"
                            : done
                              ? "opacity-95"
                              : "opacity-35"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            done
                              ? idx === 2
                                ? "bg-emerald-500 text-zinc-950"
                                : "bg-[#E11D48] text-white"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase text-zinc-100">
                            {step.label}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Payment Summary */}
              <div className="space-y-2 rounded-2xl border border-zinc-800 bg-[#141418] p-3.5 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold">Método de Pago:</span>
                  <span className="font-black">
                    {order.payment_method === "card"
                      ? `Tarjeta (${order.card_brand || "Crédito"} •••• ${order.card_last4 || "4242"})`
                      : order.payment_method === "transfer"
                        ? "Transferencia Bancaria"
                        : "Efectivo en Barra"}
                  </span>
                </div>

                {order.payment_method === "card" ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-[11px] text-violet-200">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pago confirmado en la App • Ref: {order.payment_reference || "PAY-DIRECT"}</span>
                  </div>
                ) : order.payment_method === "transfer" ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-200">
                    <Landmark className="h-3.5 w-3.5" />
                    <span>Comprobante adjuntado • En verificación por cocina</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-200">
                    <span>Pagas {formatCurrency(order.total)} en efectivo en barra</span>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-1.5 rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  Resumen de tu Pedido
                </p>
                <div className="divide-y divide-zinc-800">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-zinc-100">
                          {item.quantity}x {item.product_name}
                        </span>
                        {item.notes ? (
                          <p className="text-[10px] text-zinc-400">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                      <span className="font-bold text-zinc-200">
                        {formatCurrency(Number(item.line_total))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-xs font-black text-zinc-50">
                  <span>Total</span>
                  <span className="text-sm text-[#FB7185]">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
