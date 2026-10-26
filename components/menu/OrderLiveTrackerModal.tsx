"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  Hash,
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
  tenant_phone: string;
  order_type: string;
  status: string;
  arrival_mode: string;
  table_number: number | null;
  payment_method: string;
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
    label: "¡Listo para Retirar / Servir!",
    desc: "Acércate a la barra o recíbelo en tu mesa.",
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
  const [manualTableInput, setManualTableInput] = useState("");
  const [assigningTable, setAssigningTable] = useState(false);

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
          tenant_phone: row.tenant_phone,
          order_type: row.order_type,
          status: row.status,
          arrival_mode: row.arrival_mode,
          table_number: row.table_number,
          payment_method: row.payment_method,
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

  async function handleSaveManualTable() {
    const num = Number.parseInt(manualTableInput.trim(), 10);
    if (!order || Number.isNaN(num) || num < 1 || assigningTable) return;
    setAssigningTable(true);
    try {
      const supabase = createClient();
      await supabase.rpc("assign_order_table_number", {
        p_order_id: order.order_id,
        p_table_number: num,
      });
      setManualTableInput("");
      await fetchStatus();
    } finally {
      setAssigningTable(false);
    }
  }

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isReady = order?.status === "ready";
  const isCancelled =
    order?.status === "cancelled" || order?.status === "no_show";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-tracker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pt-10 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
                isReady ? "animate-bounce bg-emerald-500" : "bg-[#E11D48]"
              }`}
            >
              {isReady ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <ChefHat className="h-5 w-5" />
              )}
            </div>
            <h2
              id="live-tracker-title"
              className="text-base font-black uppercase text-zinc-50"
            >
              Estado de tu Pedido
            </h2>
          </div>

          <button
            id="close-live-tracker-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar seguimiento"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading || !order ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Cargando estado del pedido...
            </div>
          ) : (
            <>
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
                      {order.tenant_name} • #
                      {order.order_id.slice(0, 6).toUpperCase()}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-zinc-50">
                      {order.order_type === "dine_in" ? (
                        <>
                          <Utensils className="h-4 w-4 text-[#FB7185]" />
                          <span>
                            {order.table_number
                              ? `Para Servir • Mesa #${order.table_number}`
                              : "Para Servir (En camino)"}
                          </span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4 text-[#FB7185]" />
                          <span>Para Llevar (Retiro en Barra)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-center">
                    <span className="block text-[9px] font-bold uppercase text-zinc-400">
                      PIN
                    </span>
                    <span className="font-mono text-base font-black text-[#FB7185]">
                      {order.pickup_pin}
                    </span>
                  </div>
                </div>

                {isReady ? (
                  <div className="mt-3 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-zinc-950">
                    {order.table_number
                      ? `🔔 ¡LISTO! Te lo llevarán a la Mesa #${order.table_number} o retíralo en barra.`
                      : `🔔 ¡LISTO PARA RETIRAR! Acércate a la barra con el PIN ${order.pickup_pin}.`}
                  </div>
                ) : null}
              </div>

              {!isCancelled ? (
                <div className="space-y-2 rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const done = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 rounded-xl p-2 ${
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

              {/* Manual table input if customer arrived and sat down */}
              {!isCancelled && order.status !== "completed" ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                  <label
                    htmlFor="tracker-manual-table-input"
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-200"
                  >
                    <Hash className="h-3.5 w-3.5 text-[#E11D48]" />
                    <span>
                      {order.table_number
                        ? `Estás en la Mesa #${order.table_number} (¿Cambiaste de mesa?)`
                        : "¿Ya estás en una mesa? Digita el número:"}
                    </span>
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="tracker-manual-table-input"
                      type="number"
                      min="1"
                      max="500"
                      inputMode="numeric"
                      value={manualTableInput}
                      onChange={(e) => setManualTableInput(e.target.value)}
                      placeholder="Ej: 4"
                      className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500"
                    />
                    <button
                      id="tracker-save-table-btn"
                      type="button"
                      disabled={!manualTableInput.trim() || assigningTable}
                      onClick={handleSaveManualTable}
                      className="rounded-xl bg-[#E11D48] px-3.5 py-2 text-xs font-black text-white hover:bg-[#BE123C] disabled:opacity-50"
                    >
                      Guardar Mesa
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span>Resumen</span>
                  <span className="text-[#FB7185]">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2"
                    >
                      <span>
                        <strong>{item.quantity}x</strong> {item.product_name}
                      </span>
                      <span className="shrink-0 text-zinc-400">
                        {formatCurrency(Number(item.line_total))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => void fetchStatus()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-[#202024] py-2.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48]"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#E11D48]" />
                <span>Actualizar estado</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
