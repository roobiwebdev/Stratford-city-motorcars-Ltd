/**
 * Dates and times for the admin, always in the showroom's time zone — a
 * viewing at 2pm is 2pm in Stratford, whatever the laptop is set to.
 *
 * Money, mileage and vehicle prices come from the shared formatters in
 * `@Stratford-city-motorcars-Ltd/core`, so the admin prints them exactly as
 * the website does.
 */

export const TIME_ZONE = "Europe/London";

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const weekdayDayMonth = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});
const longDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** "17 Sep" this year, "17 Sep 2025" otherwise. */
export function formatShortDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date);
}

/** "Tue 17 Sep" */
export function formatWeekdayDate(iso: string): string {
  return weekdayDayMonth.format(new Date(iso));
}

/** "Tuesday 17 September" */
export function formatLongDay(date: Date | string): string {
  return longDay.format(typeof date === "string" ? new Date(date) : date);
}

/** "14:30" */
export function formatTime(iso: string): string {
  return clock.format(new Date(iso));
}

/** "Tue 17 Sep, 14:30" */
export function formatDateTime(iso: string): string {
  return `${weekdayDayMonth.format(new Date(iso))}, ${clock.format(new Date(iso))}`;
}

/** YYYY-MM-DD in the showroom's time zone, for grouping by day. */
export function dateKey(date: Date | string): string {
  return dateKeyFormat.format(typeof date === "string" ? new Date(date) : date);
}

/** "Today", "Yesterday", "Tomorrow" or "Tue 17 Sep". */
export function formatDayLabel(iso: string, now = new Date()): string {
  const key = dateKey(iso);
  const day = 86_400_000;
  if (key === dateKey(now)) return "Today";
  if (key === dateKey(new Date(now.getTime() - day))) return "Yesterday";
  if (key === dateKey(new Date(now.getTime() + day))) return "Tomorrow";
  return formatWeekdayDate(iso);
}

/** "just now", "12 min ago", "3 hours ago", "Yesterday", "4 days ago", then a date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return formatShortDate(iso);
}

/** How long something has waited: "25 min", "3 hours", "2 days". */
export function formatWaiting(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.floor(hours / 24)} days`;
}

/** Waiting longer than this is flagged. */
export const SLOW_REPLY_HOURS = 24;

export function isWaitingLong(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() > SLOW_REPLY_HOURS * 3_600_000;
}

/** A local `datetime-local` value ("2026-09-17T14:30") from an ISO instant, in the showroom's zone. */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: TIME_ZONE,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** The ISO instant for a `datetime-local` value read as showroom time. */
export function fromDateTimeInput(value: string): string {
  // Guess as UTC, then correct by the zone's offset at that moment.
  const guess = new Date(`${value}:00Z`);
  const offset = zoneOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000).toISOString();
}

function zoneOffsetMinutes(date: Date): number {
  const local = new Date(date.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60_000);
}

/** Hour and weekday of an instant in showroom time, for opening-hours checks. */
export function showroomClock(iso: string): Date {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: TIME_ZONE }));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "1 car", "3 cars". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
