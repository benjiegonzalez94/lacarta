"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ResolvedTable } from "@/types/domain";

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
  availableTables?: ResolvedTable[];
  onClose: () => void;
}

const STEPS = [
  {
    key: "pending",
    label: "Pedido Recibido",
    desc: "El local recibió tu orden y la está revisando.",
    icon: Clock,
  },
  {
    key: "preparing",
    label: "En Preparación",
    desc: "La cocina ya está preparando tus alimentos.",
    icon: ChefHat,
  },
  {
    key: "ready",
    label: "¡Listo para Retirar / Servir!",
    desc: "Acércate a la barra o espera en tu mesa.",
    icon: BellRing,
  },
  {
    key: "completed",
    label: "Pedido Entregado",
    desc: "¡Buen provecho! Gracias por usar LaCarta.",
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
  availableTables = [],
  onClose,
}: OrderLiveTrackerModalProps) {
  const [order, setOrder] = useState<LiveOrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTableToken, setSelectedTableToken] = useState("");
  const [assigningTable, setAssigningTable] = useState(false);
  const [tableAssignSuccess, setTableAssignSuccess] = useState<string | null>(
    null
  );

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

  async function handleAssignTable() {
    if (!order || !selectedTableToken || assigningTable) return;
    setAssigningTable(true);
    setTableAssignSuccess(null);
    try {
      const supabase = createClient();
      const { data: tableNum, error } = await supabase.rpc(
        "assign_order_table",
        {
          p_order_id: order.order_id,
          p_slug: order.tenant_slug,
          p_table_token: selectedTableToken,
        }
      );
      if (!error && tableNum) {
        setTableAssignSuccess(
          `¡Mesa #${tableNum} asignada! El local ya sabe en qué mesa entregarte.`
        );
        await fetchStatus();
      }
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
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${
                isReady
                  ? "animate-bounce bg-emerald-500"
                  : "bg-[#E11D48] shadow-[#E11D48]/30"
              }`}
            >
              {isReady ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <ChefHat className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="live-tracker-title"
                className="text-base font-black uppercase text-zinc-50"
              >
                Estado de tu Pedido en Vivo
              </h2>
              <p className="text-[11px] text-zinc-400">
                Actualización automática en tiempo real
              </p>
            </div>
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
              Conectando con la cocina del restaurante...
            </div>
          ) : (
            <>
              {/* Top PIN & Modality Banner */}
              <div
                className={`rounded-2xl border p-4 ${
                  isReady
                    ? "border-emerald-500/60 bg-emerald-500/15"
                    : "border-[#E11D48]/40 bg-gradient-to-br from-[#271018] to-[#141418]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {order.tenant_name} • Orden #
                      {order.order_id.slice(0, 6).toUpperCase()}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      {order.order_type === "dine_in" ? (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-zinc-50">
                          <Utensils className="h-4 w-4 text-[#FB7185]" />
                          {order.table_number
                            ? `Para Servir • Mesa #${order.table_number}`
                            : "Para Servir en el Local (En camino)"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-zinc-50">
                          <ShoppingBag className="h-4 w-4 text-[#FB7185]" />
                          Para Llevar (Retiro en Barra)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/90 px-3 py-1.5 text-center">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      PIN Retiro
                    </span>
                    <span className="font-mono text-base font-black text-[#FB7185]">
                      {order.pickup_pin}
                    </span>
                  </div>
                </div>

                {isReady ? (
                  <div className="mt-3 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-zinc-950">
                    {order.table_number
                      ? `🔔 ¡TU PEDIDO ESTÁ LISTO! Te lo llevarán a tu Mesa #${order.table_number} o retíralo en barra con el PIN ${order.pickup_pin}.`
                      : `🔔 ¡TU PEDIDO ESTÁ LISTO PARA RETIRAR! Acércate a la barra y muestra tu PIN ${order.pickup_pin}.`}
                  </div>
                ) : null}

                {isCancelled ? (
                  <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-xs font-bold text-red-200">
                    Este pedido fue marcado como cancelado o no retirado.
                  </div>
                ) : null}
              </div>

              {/* Stepper Progress */}
              {!isCancelled ? (
                <div className="space-y-2.5 rounded-2xl border border-zinc-800 bg-[#141418] p-4">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const done = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${
                          isCurrent
                            ? "border border-[#E11D48]/50 bg-[#E11D48]/10"
                            : done
                              ? "opacity-95"
                              : "opacity-40"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
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
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black uppercase text-zinc-100">
                              {step.label}
                            </p>
                            {isCurrent ? (
                              <span className="rounded-full bg-[#E11D48]/20 px-2 py-0.5 text-[10px] font-bold text-[#FB7185]">
                                Estado actual
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Check-in at Table if customer ordered while "on_the_way" */}
              {!order.table_number &&
              availableTables.length > 0 &&
              !isCancelled &&
              order.status !== "completed" ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FB7185]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      ¿Ya llegaste al local y te sentaste en una mesa?
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Indica en qué número de mesa estás para que el local te
                    lleve la comida directo a tu mesa:
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <select
                      id="live-tracker-table-select"
                      value={selectedTableToken}
                      onChange={(e) => setSelectedTableToken(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs font-bold text-zinc-100"
                    >
                      <option value="">Seleccionar mi mesa...</option>
                      {availableTables.map((tb) => (
                        <option key={tb.qrToken} value={tb.qrToken}>
                          Mesa #{tb.tableNumber}
                        </option>
                      ))}
                    </select>
                    <button
                      id="live-tracker-assign-table-btn"
                      type="button"
                      disabled={!selectedTableToken || assigningTable}
                      onClick={handleAssignTable}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3.5 py-2 text-xs font-black text-white hover:bg-[#BE123C] disabled:opacity-50"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Estoy aquí</span>
                    </button>
                  </div>
                  {tableAssignSuccess ? (
                    <p className="mt-2 text-[11px] font-bold text-emerald-400">
                      {tableAssignSuccess}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Order Summary */}
              <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span>Detalle de tu pedido</span>
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
                        {item.notes ? (
                          <span className="text-zinc-500"> ({item.notes})</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-zinc-400">
                        {formatCurrency(Number(item.line_total))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void fetchStatus()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2 text-xs font-bold text-zinc-200 hover:border-[#E11D48]"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#E11D48]" />
                  <span>Actualizar estado</span>
                </button>

                <a
                  href={buildWhatsAppUrl(
                    order.tenant_phone,
                    `Hola *${order.tenant_name}*, consulto por mi pedido *#${order.order_id
                      .slice(0, 8)
                      .toUpperCase()}* (PIN: *${order.pickup_pin}*).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-3.5 py-2 text-xs font-black text-zinc-950 hover:bg-[#16A34A]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Escribir al Local</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
