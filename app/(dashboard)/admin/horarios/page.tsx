import { Suspense } from "react";
import { connection } from "next/server";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getScheduleStatus } from "@/lib/utils/schedule";

async function ScheduleContent() {
  await connection();
  const schedule = getScheduleStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#18181B] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5A93C]/15 text-[#E5A93C]">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {schedule.scheduleList.map((item) => (
          <div
            key={item.dayName}
            className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#18181B] px-5 py-4"
          >
            <span className="text-sm font-bold text-zinc-100">
              {item.dayName}
            </span>
            <span className="rounded-lg bg-[#202024] px-3 py-1 font-mono text-xs font-semibold text-[#E5A93C]">
              {item.hours}
            </span>
          </div>
        ))}
      </div>
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
