export const BOOKING_TIME_ZONE = "Europe/Paris";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone = BOOKING_TIME_ZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone = BOOKING_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtcMs - date.getTime();
}

export function localDateTimeToUtc(date: string, time: string, timeZone = BOOKING_TIME_ZONE) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return new Date(Number.NaN);
  }

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = new Date(localAsUtcMs - getTimeZoneOffsetMs(new Date(localAsUtcMs), timeZone));
  const correctedOffset = getTimeZoneOffsetMs(utc, timeZone);
  utc = new Date(localAsUtcMs - correctedOffset);

  return utc;
}

export function getZonedDateKey(date: Date, timeZone = BOOKING_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function getZonedDayIndex(date: Date, timeZone = BOOKING_TIME_ZONE) {
  const dateKey = getZonedDateKey(date, timeZone);
  return localDateTimeToUtc(dateKey, "12:00:00", timeZone).getUTCDay();
}

export function getZonedMinutes(date: Date, timeZone = BOOKING_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function zonedDateAtMinutes(date: Date, totalMinutes: number, timeZone = BOOKING_TIME_ZONE) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return localDateTimeToUtc(
    getZonedDateKey(date, timeZone),
    `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`,
    timeZone
  );
}

export function getZonedDayBounds(date: Date, timeZone = BOOKING_TIME_ZONE) {
  const dateKey = getZonedDateKey(date, timeZone);
  return {
    start: localDateTimeToUtc(dateKey, "00:00:00", timeZone),
    end: new Date(localDateTimeToUtc(dateKey, "23:59:59", timeZone).getTime() + 999),
  };
}

export function formatBookingTimeDebug(date: Date, timeZone = BOOKING_TIME_ZONE) {
  if (Number.isNaN(date.getTime())) return "Invalid Date";
  const parts = getZonedParts(date, timeZone);

  return [
    `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`,
    `${parts.hour.toString().padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}:${parts.second.toString().padStart(2, "0")}`,
    timeZone,
  ].join(" ");
}

export function isBookingTimezoneDebugEnabled() {
  if (typeof window === "undefined") {
    return process.env.DEBUG_BOOKING_TIMEZONE === "1";
  }

  return (
    process.env.NEXT_PUBLIC_DEBUG_BOOKING_TIMEZONE === "1" ||
    window.localStorage.getItem("DEBUG_BOOKING_TIMEZONE") === "1"
  );
}

export function logBookingTimezone(label: string, payload: Record<string, unknown>) {
  if (!isBookingTimezoneDebugEnabled()) return;

  const environment =
    typeof window === "undefined"
      ? {
          runtimeTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          runtimeOffsetMin: new Date().getTimezoneOffset(),
        }
      : {
          browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          browserOffsetMin: new Date().getTimezoneOffset(),
        };

  console.log(`[booking-timezone] ${label}`, {
    ...environment,
    ...payload,
  });
}
