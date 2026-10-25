import type { DayScheduleItem, ScheduleStatus } from "@/types/domain";

interface TimeWindow {
  openMinutes: number;
  closeMinutes: number;
  label: string;
}

const COWIINGS_WINDOWS: Record<number, TimeWindow> = {
  // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
  4: { openMinutes: 17 * 60, closeMinutes: 22 * 60, label: "17h00 - 22h00" },
  5: { openMinutes: 17 * 60, closeMinutes: 23 * 60, label: "17h00 - 23h00" },
  6: { openMinutes: 17 * 60, closeMinutes: 24 * 60, label: "17h00 - 00h00" },
  0: { openMinutes: 17 * 60, closeMinutes: 22 * 60, label: "17h00 - 22h00" },
};

const DEFAULT_SCHEDULE_LIST: DayScheduleItem[] = [
  { dayName: "Jueves", hours: "17h00 - 22h00" },
  { dayName: "Viernes", hours: "17h00 - 23h00" },
  { dayName: "Sábado", hours: "17h00 - 00h00" },
  { dayName: "Domingo", hours: "17h00 - 22h00" },
];

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

export function getScheduleStatus(now: Date = new Date()): ScheduleStatus {
  const { dayOfWeek, minutesOfDay } = getEcuadorParts(now);
  const todayWindow = COWIINGS_WINDOWS[dayOfWeek];

  if (!todayWindow) {
    return {
      isOpen: false,
      statusLabel: "Cerrado hoy",
      notice: "Atendemos de Jueves a Domingo desde las 17h00",
      todayHours: null,
      scheduleList: DEFAULT_SCHEDULE_LIST,
    };
  }

  const isOpen =
    minutesOfDay >= todayWindow.openMinutes &&
    minutesOfDay < todayWindow.closeMinutes;

  return {
    isOpen,
    statusLabel: isOpen ? "Abierto ahora" : "Cerrado en este momento",
    notice: isOpen
      ? `Horario de hoy: ${todayWindow.label}`
      : `Hoy abrimos en horario ${todayWindow.label}`,
    todayHours: todayWindow.label,
    scheduleList: DEFAULT_SCHEDULE_LIST,
  };
}
