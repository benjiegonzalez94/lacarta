import type {
  BusinessHourRow,
  DayScheduleItem,
  ScheduleStatus,
} from "@/types/domain";

const DAY_NAMES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  0: "Domingo",
};

const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function parseTimeToMinutes(timeStr: string): number {
  const [hStr = "0", mStr = "0"] = timeStr.split(":");
  const h = Number.parseInt(hStr, 10) || 0;
  const m = Number.parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

function formatTimeLabel(openTime: string, closeTime: string): string {
  const openShort = openTime.slice(0, 5).replace(":", "h");
  const closeShort =
    closeTime.slice(0, 5) === "23:59"
      ? "00h00"
      : closeTime.slice(0, 5).replace(":", "h");
  return `${openShort} - ${closeShort}`;
}

function getEcuadorParts(date: Date): { dayOfWeek: number; minutesOfDay: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayOfWeek = weekdayMap[weekdayStr] ?? 0;
  const hour = Number.parseInt(hourStr, 10) % 24;
  const minute = Number.parseInt(minuteStr, 10);

  return {
    dayOfWeek,
    minutesOfDay: hour * 60 + minute,
  };
}

export function getScheduleStatus(
  businessHours?: BusinessHourRow[],
  now: Date = new Date()
): ScheduleStatus {
  const { dayOfWeek, minutesOfDay } = getEcuadorParts(now);

  const byDay = new Map<number, BusinessHourRow>();
  if (businessHours && businessHours.length > 0) {
    for (const row of businessHours) {
      byDay.set(row.day_of_week, row);
    }
  } else {
    // Fallback default schedule (Thu-Sun)
    byDay.set(1, { id: "1", tenant_id: "", day_of_week: 1, open_time: "17:00", close_time: "22:00", is_open: false });
    byDay.set(2, { id: "2", tenant_id: "", day_of_week: 2, open_time: "17:00", close_time: "22:00", is_open: false });
    byDay.set(3, { id: "3", tenant_id: "", day_of_week: 3, open_time: "17:00", close_time: "22:00", is_open: false });
    byDay.set(4, { id: "4", tenant_id: "", day_of_week: 4, open_time: "17:00", close_time: "22:00", is_open: true });
    byDay.set(5, { id: "5", tenant_id: "", day_of_week: 5, open_time: "17:00", close_time: "23:00", is_open: true });
    byDay.set(6, { id: "6", tenant_id: "", day_of_week: 6, open_time: "17:00", close_time: "23:59", is_open: true });
    byDay.set(0, { id: "0", tenant_id: "", day_of_week: 0, open_time: "17:00", close_time: "22:00", is_open: true });
  }

  const scheduleList: DayScheduleItem[] = DISPLAY_DAY_ORDER.map((d) => {
    const row = byDay.get(d);
    const isDayOpen = Boolean(row?.is_open);
    const hours =
      row && isDayOpen
        ? formatTimeLabel(row.open_time, row.close_time)
        : "Cerrado";
    return {
      dayOfWeek: d,
      dayName: DAY_NAMES[d] ?? `Día ${d}`,
      hours,
      isOpen: isDayOpen,
    };
  });

  const todayRow = byDay.get(dayOfWeek);

  if (!todayRow || !todayRow.is_open) {
    return {
      isOpen: false,
      statusLabel: "Cerrado hoy",
      notice: "Consulta nuestros días y horarios de atención",
      todayHours: null,
      scheduleList,
    };
  }

  const openMinutes = parseTimeToMinutes(todayRow.open_time);
  const closeMinutes =
    todayRow.close_time.slice(0, 5) === "23:59"
      ? 24 * 60
      : parseTimeToMinutes(todayRow.close_time);
  const label = formatTimeLabel(todayRow.open_time, todayRow.close_time);

  const isOpenNow =
    minutesOfDay >= openMinutes && minutesOfDay < closeMinutes;

  return {
    isOpen: isOpenNow,
    statusLabel: isOpenNow ? "Abierto ahora" : "Cerrado en este momento",
    notice: isOpenNow
      ? `Horario de hoy: ${label}`
      : `Hoy atendemos de ${label}`,
    todayHours: label,
    scheduleList,
  };
}
