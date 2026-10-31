import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Check, Clock } from "lucide-react";
import { saveBusinessHoursAction } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminDashboardData,
  getTenantForOwner,
} from "@/lib/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { getScheduleStatus } from "@/lib/utils/schedule";

const ORDERED_DAYS: { dayOfWeek: number; label: string }[] = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

async function ScheduleContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get("active_admin_tenant_id")?.value;
  const tenant = await getTenantForOwner(supabase, user.id, activeTenantId);
  if (!tenant) return null;

  const data = await getAdminDashboardData(supabase, tenant);
  const schedule = getScheduleStatus(data.businessHours);

  const byDay = new Map(
    data.businessHours.map((row) => [row.day_of_week, row])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E11D48]/15 text-[#E11D48]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-zinc-50">
              Horarios de Atención (Zona Horaria Ecuador • GMT-5)
            </h1>
            <p className="text-xs text-zinc-400">{schedule.notice}</p>
          </div>
        </div>

        <Badge variant={schedule.isOpen ? "success" : "secondary"}>
          {schedule.statusLabel}
        </Badge>
      </div>

      <form
        action={saveBusinessHoursAction}
        className="rounded-2xl border border-zinc-800 bg-[#18181B] p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
              Configurar Apertura y Cierre por Día
            </h2>
            <p className="text-xs text-zinc-400">
              Si la hora de cierre es menor o igual a la de apertura (ej. 16:00
              a 00:00), el sistema interpreta cierre pasada la medianoche.
            </p>
          </div>
          <button
            id="save-business-hours-btn"
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-4 py-2.5 text-xs font-black text-white hover:bg-[#BE123C]"
          >
            <Check className="h-4 w-4" />
            <span>Guardar Horarios</span>
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {ORDERED_DAYS.map(({ dayOfWeek, label }) => {
            const row = byDay.get(dayOfWeek);
            const isOpen = row ? row.is_open : true;
            const openTime = row ? row.open_time.slice(0, 5) : "16:00";
            const closeTime = row ? row.close_time.slice(0, 5) : "23:00";

            return (
              <div
                key={dayOfWeek}
                className="flex flex-wrap items-center justify-between gap-4 py-3.5"
              >
                <label
                  htmlFor={`day-open-${dayOfWeek}`}
                  className="flex min-w-[150px] cursor-pointer items-center gap-3"
                >
                  <input
                    id={`day-open-${dayOfWeek}`}
                    name={`isOpen_${dayOfWeek}`}
                    type="checkbox"
                    defaultChecked={isOpen}
                    className="h-4 w-4 rounded accent-[#E11D48]"
                  />
                  <span className="text-sm font-bold text-zinc-100">
                    {label}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`open-time-${dayOfWeek}`}
                      className="text-xs text-zinc-400"
                    >
                      Abre:
                    </label>
                    <input
                      id={`open-time-${dayOfWeek}`}
                      name={`openTime_${dayOfWeek}`}
                      type="time"
                      defaultValue={openTime}
                      className="rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 font-mono text-xs text-zinc-100"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`close-time-${dayOfWeek}`}
                      className="text-xs text-zinc-400"
                    >
                      Cierra:
                    </label>
                    <input
                      id={`close-time-${dayOfWeek}`}
                      name={`closeTime_${dayOfWeek}`}
                      type="time"
                      defaultValue={closeTime}
                      className="rounded-xl border border-zinc-700 bg-[#202024] px-3 py-1.5 font-mono text-xs text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </form>
    </div>
  );
}

export default function AdminSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-400">Cargando horarios...</div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
