"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Eye,
  Landmark,
  Phone,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  extendTenantSubscriptionAction,
  superadminCreateTenantAction,
  superadminPardonCustomerNoShowsAction,
  superadminQuickUpdateTenantAction,
  superadminSearchCustomerAction,
  superadminUpdateOrderStatusAction,
  switchActiveTenantAction,
  toggleTenantSubscriptionAction,
} from "@/app/(dashboard)/admin/sistema/actions";
import type { SuperadminInitialData } from "@/lib/services/superadmin.service";
import { formatCurrency } from "@/lib/utils/currency";
import type {
  CustomerTrustInfo,
  OrderRow,
  OrderStatus,
  ProfileRow,
  SuperadminGlobalOrder,
  SuperadminTenant,
} from "@/types/domain";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Recibido",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo para retirar",
  completed: "Entregado",
  cancelled: "Cancelado",
  no_show: "No-Show (Bloqueado)",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  preparing: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  ready: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  completed: "bg-zinc-800 text-zinc-300 border-zinc-700",
  cancelled: "bg-zinc-900 text-zinc-500 border-zinc-800",
  no_show: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function SuperadminDashboardClient({
  initialData,
}: {
  initialData: SuperadminInitialData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "kpis" | "tenants" | "users" | "support"
  >("kpis");

  const [currentTimestamp] = useState(() => Date.now());

  const [tenants, setTenants] = useState<SuperadminTenant[]>(
    initialData.tenants
  );
  const [profiles] = useState<ProfileRow[]>(initialData.profiles);
  const [orders, setOrders] = useState<SuperadminGlobalOrder[]>(
    initialData.recentOrders
  );

  const [tenantSearch, setTenantSearch] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [profileRoleFilter, setProfileRoleFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");

  // Create new tenant modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: "",
    branch_name: "",
    slug: "",
    city: "Manta",
    phone: "",
    address: "",
  });

  // Customer support lookup
  const [custSearchTerm, setCustSearchTerm] = useState("");
  const [custTrust, setCustTrust] = useState<CustomerTrustInfo | null>(null);
  const [custProfile, setCustProfile] = useState<ProfileRow | null>(null);
  const [custOrders, setCustOrders] = useState<OrderRow[]>([]);
  const [isSearchingCust, setIsSearchingCust] = useState(false);
  const [pardonResult, setPardonResult] = useState<string | null>(null);

  // Receipt Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(
    null
  );

  // Transition & notification feedback
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function showToast(type: "success" | "error", text: string) {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }

  // Action: Switch Active Tenant and enter its panel
  function handleEnterTenant(tenantId: string) {
    startTransition(async () => {
      try {
        await switchActiveTenantAction(tenantId);
        router.push("/admin");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al entrar al local";
        showToast("error", message);
      }
    });
  }

  // Action: Create New Tenant
  function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await superadminCreateTenantAction(newTenantForm);
        setTenants((prev) => [
          {
            ...res.tenant,
            ownerName: null,
            ownerPhone: null,
          },
          ...prev,
        ]);
        setShowCreateModal(false);
        setNewTenantForm({
          name: "",
          branch_name: "",
          slug: "",
          city: "Manta",
          phone: "",
          address: "",
        });
        showToast(
          "success",
          `Restaurante "${res.tenant.name}" registrado con éxito.`
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al registrar negocio";
        showToast("error", message);
      }
    });
  }

  // Action: Toggle Subscription
  function handleToggleSubscription(tenant: SuperadminTenant) {
    const nextStatus =
      tenant.subscription_status === "active" ? "suspended" : "active";
    startTransition(async () => {
      try {
        const res = await toggleTenantSubscriptionAction(tenant.id, nextStatus);
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenant.id
              ? {
                  ...t,
                  subscription_status: nextStatus,
                }
              : t
          )
        );
        showToast("success", res.message);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al actualizar suscripción";
        showToast("error", message);
      }
    });
  }

  // Action: Extend Subscription +30 Days
  function handleExtendSubscription(tenantId: string) {
    startTransition(async () => {
      try {
        const res = await extendTenantSubscriptionAction(tenantId, 30);
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId
              ? {
                  ...t,
                  subscription_ends_at: res.newEndsAt,
                  subscription_status: "active",
                }
              : t
          )
        );
        showToast("success", res.message);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al extender suscripción";
        showToast("error", message);
      }
    });
  }

  // Action: Update Order Status Overwrite
  function handleSuperadminUpdateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus
  ) {
    startTransition(async () => {
      try {
        await superadminUpdateOrderStatusAction(
          orderId,
          nextStatus,
          "Corrección directa vía Superadmin"
        );
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        showToast(
          "success",
          `Pedido actualizado a: ${STATUS_LABELS[nextStatus]}`
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al actualizar pedido";
        showToast("error", message);
      }
    });
  }

  // Action: Customer Lookup
  async function handleCustomerSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!custSearchTerm.trim()) return;

    setIsSearchingCust(true);
    setPardonResult(null);
    try {
      const data = await superadminSearchCustomerAction(custSearchTerm);
      setCustTrust(data.trust);
      setCustProfile(data.customerProfile);
      setCustOrders(data.customerOrders);
      if (!data.trust && data.customerOrders.length === 0 && !data.customerProfile) {
        showToast(
          "error",
          "No se encontraron registros para el teléfono o cédula ingresado."
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al consultar cliente";
      showToast("error", message);
    } finally {
      setIsSearchingCust(false);
    }
  }

  // Action: Pardon Customer No-Shows
  function handlePardonCustomer(phone: string) {
    startTransition(async () => {
      try {
        const res = await superadminPardonCustomerNoShowsAction(phone);
        setPardonResult(res.message);
        showToast("success", res.message);
        // Refresh customer lookup
        const updated = await superadminSearchCustomerAction(phone);
        setCustTrust(updated.trust);
        setCustOrders(updated.customerOrders);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al perdonar no-shows";
        showToast("error", message);
      }
    });
  }

  // Action: Quick Toggle Payment on Tenant
  function handleToggleTenantPayment(
    tenant: SuperadminTenant,
    method: "cash" | "transfer" | "card"
  ) {
    const payloadKey =
      method === "cash"
        ? "cash_payments_enabled"
        : method === "transfer"
        ? "transfer_payments_enabled"
        : "card_payments_enabled";

    const currentValue = tenant[payloadKey];
    const nextValue = !currentValue;

    startTransition(async () => {
      try {
        await superadminQuickUpdateTenantAction(tenant.id, {
          [payloadKey]: nextValue,
        });
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenant.id ? { ...t, [payloadKey]: nextValue } : t
          )
        );
        showToast(
          "success",
          `Método ${method.toUpperCase()} ${nextValue ? "habilitado" : "deshabilitado"} para ${tenant.name}`
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al actualizar método de pago";
        showToast("error", message);
      }
    });
  }

  // Filtered lists
  const filteredTenants = tenants.filter((t) => {
    const q = tenantSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.branch_name && t.branch_name.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q))
    );
  });

  const filteredProfiles = profiles.filter((p) => {
    const matchesFilter =
      profileRoleFilter === "all" || p.role === profileRoleFilter;
    const q = profileSearch.toLowerCase();
    const matchesQuery =
      p.full_name.toLowerCase().includes(q) ||
      (p.cedula && p.cedula.includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.toLowerCase();
    return (
      o.pickup_pin.includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.includes(q)) ||
      o.tenantName.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
              : "border-red-500/40 bg-red-950/90 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/30 via-[#18181B] to-[#18181B] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-black tracking-wider text-violet-300">
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              PANEL SUPERADMINISTRADOR & DEV
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-bold text-zinc-400">
              LaCarta Multi-Tenant Platform
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-zinc-50">
            Control Global de Negocios y Soporte
          </h1>
          <p className="text-xs text-zinc-400">
            Supervisa todos los restaurantes, entra a administrar cualquiera
            de ellos, activa/pausa suscripciones o registra nuevas franquicias.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-800 bg-[#121215] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("kpis")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "kpis"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Métricas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tenants")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "tenants"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Negocios ({tenants.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "users"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Usuarios ({profiles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "support"
                ? "bg-[#E11D48] text-white shadow-sm shadow-[#E11D48]/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Herramientas Soporte</span>
          </button>
        </div>
      </div>

      {/* TAB 1: METRICS & KPIS */}
      {activeTab === "kpis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">Negocios Activos</span>
                <Store className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-400">
                {initialData.metrics.activeTenants}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                De {initialData.metrics.totalTenants} restaurantes registrados
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">MRR Estimado (SaaS)</span>
                <DollarSign className="h-4 w-4 text-violet-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-violet-300">
                {formatCurrency(initialData.metrics.estimatedMrr)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                $15.00/mes por local activo
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">Pedidos Globales</span>
                <Activity className="h-4 w-4 text-[#E11D48]" />
              </div>
              <p className="mt-2 text-3xl font-black text-zinc-50">
                {initialData.metrics.totalOrders}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {initialData.metrics.ordersLast30Days} en los últimos 30 días
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">Volumen Transaccionado</span>
                <Landmark className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-amber-300">
                {formatCurrency(initialData.metrics.totalPlatformGmv)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                GMV acumulado en pedidos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 sm:col-span-1">
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                Distribución de Usuarios
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">Clientes</p>
                      <p className="text-[10px] text-zinc-500">Consumidores finales</p>
                    </div>
                  </div>
                  <span className="text-base font-black text-blue-400">
                    {initialData.metrics.customersCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">Vendedores</p>
                      <p className="text-[10px] text-zinc-500">Dueños de restaurantes</p>
                    </div>
                  </div>
                  <span className="text-base font-black text-emerald-400">
                    {initialData.metrics.sellersCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">Superadmins</p>
                      <p className="text-[10px] text-zinc-500">Equipo de desarrollo</p>
                    </div>
                  </div>
                  <span className="text-base font-black text-violet-400">
                    {initialData.metrics.adminsCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                    Últimos Pedidos en Plataforma
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Monitoreo en vivo de órdenes creadas en cualquier sucursal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("support")}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  Ver Buscador Global
                </button>
              </div>

              <div className="mt-4 divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
                {orders.slice(0, 5).map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300">
                          PIN #{ord.pickup_pin}
                        </span>
                        <span className="text-xs font-black text-zinc-200">
                          {ord.tenantName}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_COLORS[ord.status as OrderStatus] ||
                            STATUS_COLORS.pending
                          }`}
                        >
                          {STATUS_LABELS[ord.status as OrderStatus] || ord.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {ord.customer_name || "Cliente"} • {ord.customer_phone || "Sin tel"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <div>
                        <p className="text-xs font-black text-zinc-100">
                          {formatCurrency(Number(ord.total))}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-zinc-500">
                          {ord.payment_method}
                        </p>
                      </div>
                      {ord.payment_proof_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(ord.payment_proof_url)}
                          className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-300 hover:bg-blue-500/20"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Comprobante</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS & SUBSCRIPTIONS */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#18181B] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar local por nombre, slug, sucursal o ciudad..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3.5 py-2 text-xs font-black text-white shadow-sm shadow-[#E11D48]/30 hover:bg-[#BE123C]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Registrar Nuevo Negocio</span>
              </button>
              <span className="text-xs font-bold text-zinc-400">
                {filteredTenants.length} negocios
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredTenants.map((t) => {
              const isActive = t.subscription_status === "active";
              const endsDate = new Date(t.subscription_ends_at);
              const isExpired = endsDate.getTime() < currentTimestamp;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded-3xl border p-5 transition-all ${
                    isActive
                      ? "border-zinc-800 bg-[#18181B] hover:border-zinc-700"
                      : "border-red-900/40 bg-red-950/10 hover:border-red-800/60"
                  }`}
                >
                  <div>
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-zinc-50">
                            {t.name}
                          </h2>
                          <span
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              isActive
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                : "border-red-500/40 bg-red-500/10 text-red-400"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Check className="h-3 w-3" />
                                Suscripción Activa
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Suspendida
                              </>
                            )}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {t.branch_name} • /{t.slug}
                        </p>
                      </div>

                      <Link
                        href={`/${t.slug}`}
                        target="_blank"
                        className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Ver Menú</span>
                      </Link>
                    </div>

                    {/* Metadata Specs */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-zinc-800/80 bg-[#121215] p-2.5">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          Ubicación
                        </span>
                        <p className="mt-0.5 font-bold text-zinc-200">
                          {t.city || "No especificada"}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {t.address || "Sin dirección"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800/80 bg-[#121215] p-2.5">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          Contacto Vendedor
                        </span>
                        <p className="mt-0.5 font-bold text-zinc-200">
                          {t.ownerName || "Propietario"}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {t.phone || t.ownerPhone || "Sin teléfono"}
                        </p>
                      </div>
                    </div>

                    {/* Subscription & Billing Details */}
                    <div className="mt-3 rounded-2xl border border-zinc-800 bg-[#141417] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 text-violet-400" />
                          <span>Vence:</span>
                          <span
                            className={`font-mono font-bold ${
                              isExpired ? "text-red-400" : "text-zinc-200"
                            }`}
                          >
                            {endsDate.toLocaleDateString("es-EC", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <span className="font-black text-emerald-400">
                          ${t.monthly_fee}/mes
                        </span>
                      </div>

                      {/* Payment Methods Toggles */}
                      <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-800/80 pt-2.5">
                        <span className="text-[10px] font-bold text-zinc-500">
                          Cobros:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleTenantPayment(t, "cash")}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${
                            t.cash_payments_enabled
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-zinc-800 text-zinc-500 line-through"
                          }`}
                        >
                          Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTenantPayment(t, "transfer")}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${
                            t.transfer_payments_enabled
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-zinc-800 text-zinc-500 line-through"
                          }`}
                        >
                          Transferencia
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTenantPayment(t, "card")}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${
                            t.card_payments_enabled
                              ? "bg-violet-500/20 text-violet-300"
                              : "bg-zinc-800 text-zinc-500 line-through"
                          }`}
                        >
                          Tarjetas
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Enter Tenant Management Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEnterTenant(t.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-violet-950/50 transition-all hover:bg-violet-500"
                    >
                      <Store className="h-4 w-4" />
                      <span>Entrar a Gestionar Este Local</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subscription Control Buttons */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleSubscription(t)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
                        isActive
                          ? "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>
                        {isActive ? "Pausar Suscripción" : "Activar"}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleExtendSubscription(t.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs font-black text-violet-200 hover:bg-violet-900/60"
                      title="Extender fecha de suscripción por +30 días"
                    >
                      <Calendar className="h-3.5 w-3.5 text-violet-400" />
                      <span>+30 Días</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE NEW TENANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-violet-400" />
                <h3 className="text-sm font-black text-zinc-50">
                  Registrar Nuevo Negocio en LaCarta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sushi Express"
                  value={newTenantForm.name}
                  onChange={(e) =>
                    setNewTenantForm({ ...newTenantForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400">
                    Sucursal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sucursal Centro"
                    value={newTenantForm.branch_name}
                    onChange={(e) =>
                      setNewTenantForm({
                        ...newTenantForm,
                        branch_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400">
                    Slug URL (sin espacios) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="sushiexpress"
                    value={newTenantForm.slug}
                    onChange={(e) =>
                      setNewTenantForm({
                        ...newTenantForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Manta / Portoviejo / Quito"
                    value={newTenantForm.city}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, city: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400">
                    Teléfono WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+593987654321"
                    value={newTenantForm.phone}
                    onChange={(e) =>
                      setNewTenantForm({
                        ...newTenantForm,
                        phone: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Calle principal y secundaria"
                  value={newTenantForm.address}
                  onChange={(e) =>
                    setNewTenantForm({ ...newTenantForm, address: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121215] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#E11D48] px-5 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
                >
                  {isPending ? "Registrando..." : "Crear Restaurante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: USER DIRECTORY */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#18181B] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula o teléfono..."
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#121215] p-1">
              {["all", "customer", "seller", "admin"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setProfileRoleFilter(role)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors ${
                    profileRoleFilter === role
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {role === "all"
                    ? "Todos"
                    : role === "customer"
                    ? "Clientes"
                    : role === "seller"
                    ? "Vendedores"
                    : "Superadmins"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-[#141417] text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Registro</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-bold text-zinc-100">
                        {p.full_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            p.role === "admin"
                              ? "bg-violet-500/20 text-violet-300"
                              : p.role === "seller"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {p.cedula || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {p.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{p.city}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(p.created_at).toLocaleDateString("es-EC")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.phone ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("support");
                              setCustSearchTerm(p.phone || "");
                              handleCustomerSearch();
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:text-white"
                          >
                            Inspeccionar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPORT TOOLS */}
      {activeTab === "support" && (
        <div className="space-y-6">
          {/* SECTION A: ANTI NO-SHOW CASH SHIELD TOOL */}
          <div className="rounded-3xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#18181B] p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-400">
                  <ShieldAlert className="h-4 w-4" />
                  Soporte a Clientes — Escudo Anti No-Show & Desbloqueo de Efectivo
                </span>
                <h2 className="mt-1 text-lg font-black text-zinc-50">
                  Inspeccionar Confianza y Reactivar Pagos en Efectivo
                </h2>
                <p className="text-xs text-zinc-400">
                  Si un cliente tuvo un imprevisto y su cuenta quedó bloqueada para
                  pagar en efectivo por un pedido no retirado (no-show), puedes
                  perdonar la falta y reactivar su límite de compra.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCustomerSearch}
              className="mt-4 flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Ingresa número de teléfono (ej. 0939636536) o cédula..."
                  value={custSearchTerm}
                  onChange={(e) => setCustSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#121215] py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingCust}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-500"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{isSearchingCust ? "Consultando..." : "Buscar Cliente"}</span>
              </button>
            </form>

            {/* Customer Lookup Result */}
            {custTrust && (
              <div className="mt-5 rounded-2xl border border-zinc-800 bg-[#121215] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-zinc-50">
                        {custProfile?.full_name || "Cliente Registrado"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          custTrust.trustTier === "restricted"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : custTrust.trustTier === "verified"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        Nivel: {custTrust.trustTier}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Cédula: <strong className="text-zinc-200">{custProfile?.cedula || "No registrada"}</strong> •
                      Teléfono: <strong className="text-zinc-200">{custProfile?.phone || custSearchTerm}</strong>
                    </p>
                  </div>

                  {/* Pardon Button */}
                  {custTrust.noShowOrders > 0 && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handlePardonCustomer(custProfile?.phone || custSearchTerm)
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>
                        Perdonar No-Shows ({custTrust.noShowOrders}) y Desbloquear Efectivo
                      </span>
                    </button>
                  )}
                </div>

                {/* Trust stats breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      Pedidos Completados
                    </span>
                    <p className="mt-1 text-xl font-black text-emerald-400">
                      {custTrust.completedOrders}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      Inasistencias (No-Show)
                    </span>
                    <p
                      className={`mt-1 text-xl font-black ${
                        custTrust.noShowOrders > 0 ? "text-red-400" : "text-zinc-400"
                      }`}
                    >
                      {custTrust.noShowOrders}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      Efectivo Permitido
                    </span>
                    <p
                      className={`mt-1 text-base font-black ${
                        custTrust.cashAllowed
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {custTrust.cashAllowed ? "SÍ (Autorizado)" : "BLOQUEADO"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#18181B] p-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      Límite Máx. Efectivo
                    </span>
                    <p className="mt-1 text-xl font-black text-violet-300">
                      {formatCurrency(custTrust.maxCashRemote)}
                    </p>
                  </div>
                </div>

                {pardonResult && (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300">
                    {pardonResult}
                  </div>
                )}

                {/* Customer Recent Orders List */}
                {custOrders.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800/80 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Historial Reciente de Pedidos del Cliente ({custOrders.length})
                    </p>
                    <div className="mt-2 divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800 bg-[#18181B]">
                      {custOrders.map((cord) => (
                        <div
                          key={cord.id}
                          className="flex items-center justify-between p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-zinc-300">
                              PIN #{cord.pickup_pin}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                STATUS_COLORS[cord.status as OrderStatus] ||
                                STATUS_COLORS.pending
                              }`}
                            >
                              {STATUS_LABELS[cord.status as OrderStatus] || cord.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-zinc-200">
                              {formatCurrency(Number(cord.total))}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(cord.created_at).toLocaleDateString("es-EC")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION B: GLOBAL ORDERS SEARCH & OVERWRITE */}
          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400">
                  <Activity className="h-4 w-4" />
                  Soporte a Pedidos Globales
                </span>
                <h2 className="mt-1 text-lg font-black text-zinc-50">
                  Búsqueda, Inspección de Comprobantes y Forzado de Estados
                </h2>
                <p className="text-xs text-zinc-400">
                  Localiza cualquier pedido por su PIN de retiro (4 dígitos),
                  teléfono del cliente o restaurante para resolver reclamos.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por PIN (ej. 7621), teléfono de cliente, nombre o ID..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#121215] py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {filteredOrders.length} pedidos
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {filteredOrders.slice(0, 15).map((ord) => {
                const currentStatus = ord.status as OrderStatus;
                return (
                  <div
                    key={ord.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#121215] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-200">
                          PIN #{ord.pickup_pin}
                        </span>
                        <span className="text-xs font-black text-zinc-100">
                          {ord.tenantName}
                        </span>
                        <span className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                          {ord.arrival_mode === "at_table"
                            ? "Servirse en local"
                            : "Para llevar"}
                        </span>
                        <span className="text-xs font-black text-emerald-400">
                          {formatCurrency(Number(ord.total))}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span>
                          Cliente:{" "}
                          <strong className="text-zinc-200">
                            {ord.customer_name || "Anónimo"}
                          </strong>
                        </span>
                        <span>
                          Tel:{" "}
                          <strong className="text-zinc-200">
                            {ord.customer_phone || "—"}
                          </strong>
                        </span>
                        <span>
                          Método:{" "}
                          <strong className="uppercase text-zinc-200">
                            {ord.payment_method}
                          </strong>
                        </span>
                        <span className="text-zinc-500">
                          {new Date(ord.created_at).toLocaleTimeString("es-EC", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {ord.notes && (
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Notas: {ord.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.payment_proof_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReceiptUrl(ord.payment_proof_url)
                          }
                          className="flex items-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/20"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Comprobante</span>
                        </button>
                      ) : null}

                      {/* Overwrite Status Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-500">
                          Estado:
                        </span>
                        <select
                          value={currentStatus}
                          disabled={isPending}
                          onChange={(e) =>
                            handleSuperadminUpdateOrderStatus(
                              ord.id,
                              e.target.value as OrderStatus
                            )
                          }
                          className="rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-200 focus:border-violet-500 focus:outline-none"
                        >
                          <option value="pending">Recibido</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="preparing">En preparación</option>
                          <option value="ready">Listo para retirar</option>
                          <option value="completed">Entregado</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="no_show">No-Show</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Comprobante de Transferencia Bancaria
              </span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-2xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewReceiptUrl}
                alt="Comprobante Bancario"
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href={previewReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir en tamaño original</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
