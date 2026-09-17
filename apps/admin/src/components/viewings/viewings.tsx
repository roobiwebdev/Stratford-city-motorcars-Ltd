"use client";

import {
  APPOINTMENT_TYPES,
  type Appointment,
  type AppointmentListQuery,
  type AppointmentType,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, KeyRound } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { AppointmentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, ErrorState, Notice, PageBody, PageHeader, Skeleton } from "@/components/ui/page";
import { FilterSelect, Toolbar } from "@/components/ui/toolbar";
import { api } from "@/lib/api";
import { dateKey, formatDayLabel, formatTime, formatWeekdayDate, plural } from "@/lib/format";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

import { AppointmentSheet } from "./appointment-sheet";

const DAY = 86_400_000;

/** Monday 00:00 (browser time) of the week containing `date`. */
function weekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function parseWeek(value: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return weekStart(new Date(y!, m! - 1, d!));
  }
  return weekStart(new Date());
}

function localKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const rangeLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * The diary: viewings and test drives, a week at a time. A seven-column week
 * on large screens and a day-by-day agenda on phones and tablets. Nothing
 * here contacts the customer — confirm times by phone or WhatsApp as usual.
 */
export function Viewings() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can } = useSession();

  const start = parseWeek(params.get("week"));
  const end = new Date(start.getTime() + 7 * DAY);
  const type = (params.get("type") as AppointmentType | null) ?? "all";
  const status = params.get("status") === "all" ? "all" : "active";
  const creating = params.get("new") === "1";
  const openId = params.get("open");

  const setParams = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" && key === "type") query.delete(key);
      else query.set(key, value);
    }
    router.replace(`${pathname}${query.size ? `?${query}` : ""}` as Route, { scroll: false });
  };

  const listQuery: AppointmentListQuery = { from: start.toISOString(), to: end.toISOString(), type, status };
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.appointments(listQuery),
    queryFn: () => api.appointments.list(listQuery),
  });

  // Anything still "to confirm" or "confirmed" whose time has passed needs an outcome.
  const overdue = useQuery({
    queryKey: queryKeys.appointments({ overdue: true }),
    queryFn: () => api.appointments.list({ to: new Date(Date.now() - 60 * 60_000).toISOString(), status: "active" }),
  });

  // An appointment opened by link may sit outside the visible week.
  const linked = useQuery({
    queryKey: queryKeys.appointments({ id: openId }),
    queryFn: () => api.appointments.list({ status: "all" }),
    enabled: Boolean(openId),
    select: (items) => items.find((item) => item.id === openId),
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY + 2 * 3_600_000));
  const byDay = new Map<string, Appointment[]>();
  for (const appointment of data ?? []) {
    const key = dateKey(appointment.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), appointment]);
  }
  const todayKey = dateKey(new Date());
  const isThisWeek = localKey(start) === localKey(weekStart(new Date()));
  const shift = (weeks: number) => setParams({ week: localKey(new Date(start.getTime() + weeks * 7 * DAY + 3_600_000)) });

  const lastDay = new Date(end.getTime() - DAY);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Sales"
        title="Viewings & test drives"
        description="Who is coming in, to see which car. Arrange them from an enquiry, or here for someone who rang or walked in."
        actions={
          can("appointments.edit") ? (
            <Button variant="primary" onClick={() => setParams({ new: "1" })}>
              <CalendarPlus aria-hidden />
              Arrange
            </Button>
          ) : null
        }
      />

      {overdue.data?.length ? (
        <Notice
          tone="warning"
          className="mb-5"
          title={`${plural(overdue.data.length, "appointment")} in the past without an outcome`}
          action={
            <Button size="sm" onClick={() => setParams({ open: overdue.data[0]!.id })}>
              Record the first
            </Button>
          }
        >
          {overdue.data.map((item) => `${item.customerName} (${formatWeekdayDate(item.startsAt)})`).join(", ")} — mark each completed, a no-show or cancelled.
        </Notice>
      ) : null}

      <Toolbar className="sm:flex-nowrap">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous week" className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised hover:border-ink-400 sm:size-10">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next week" className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised hover:border-ink-400 sm:size-10">
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <Button variant="ghost" onClick={() => setParams({ week: undefined })} disabled={isThisWeek}>
            This week
          </Button>
          <p className="ml-2 font-display text-lg whitespace-nowrap" aria-live="polite" data-numeric>
            {rangeLabel.format(start)} – {rangeLabel.format(lastDay)}
          </p>
        </div>
        <div className="flex w-full gap-2.5 sm:ml-auto sm:w-auto">
          <FilterSelect label="Filter by type" allLabel="All types" value={type} onChange={(value) => setParams({ type: value })} options={APPOINTMENT_TYPES} className="sm:w-44" />
          <div className="w-full sm:w-48">
            <Select aria-label="Which appointments" value={status} onChange={(event) => setParams({ status: event.target.value === "all" ? "all" : undefined })}>
              <option value="active">Upcoming only</option>
              <option value="all">With outcomes</option>
            </Select>
          </div>
        </div>
      </Toolbar>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="The diary could not be loaded" />
      ) : (
        <>
          {/* Large screens: the week at a glance. */}
          <div className={cn("hidden grid-cols-7 border border-border bg-border lg:grid lg:gap-px", isFetching && !isPending && "opacity-70")} aria-busy={isPending}>
            {days.map((day) => {
              const key = localKey(day);
              const items = byDay.get(key) ?? [];
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              const today = key === todayKey;
              return (
                <section key={key} aria-label={formatDayLabel(day.toISOString())} className={cn("flex min-h-72 flex-col", weekend ? "bg-surface" : "bg-surface-raised")}>
                  <header className={cn("border-b px-3 py-2.5", today ? "border-b-2 border-brass" : "border-border")}>
                    <p className={cn("admin-label", today && "text-brass-deep")}>{new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(day)}</p>
                    <p data-numeric className={cn("font-display text-xl leading-tight", today && "text-brass-deep")}>
                      {day.getDate()}
                    </p>
                    {weekend ? <p className="text-[0.6875rem] text-ink-600">By appointment</p> : null}
                  </header>
                  <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                    {isPending ? (
                      <Skeleton className="h-16" />
                    ) : (
                      items.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onOpen={() => setParams({ open: appointment.id })} compact />)
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Phones and tablets: an agenda. */}
          <div className="lg:hidden">
            {isPending ? (
              <div className="space-y-3" role="status" aria-label="Loading the diary">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : data?.length ? (
              <ol className="space-y-5">
                {days
                  .filter((day) => byDay.has(localKey(day)))
                  .map((day) => (
                    <li key={localKey(day)}>
                      <h2 className={cn("admin-label mb-2", localKey(day) === todayKey && "text-brass-deep")}>{formatDayLabel(day.toISOString())}</h2>
                      <ul className="space-y-2">
                        {byDay.get(localKey(day))!.map((appointment) => (
                          <li key={appointment.id}>
                            <AppointmentCard appointment={appointment} onOpen={() => setParams({ open: appointment.id })} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
              </ol>
            ) : null}
          </div>

          {!isPending && !data?.length ? (
            <EmptyState
              compact
              className="mt-4"
              title="Nothing arranged this week"
              body={status === "active" ? "No viewings or test drives are booked. Past ones with an outcome are hidden — include them with the filter above." : "No viewings or test drives this week."}
              action={
                can("appointments.edit") ? (
                  <Button onClick={() => setParams({ new: "1" })}>
                    <CalendarPlus aria-hidden />
                    Arrange one
                  </Button>
                ) : null
              }
            />
          ) : null}
        </>
      )}

      {creating ? <AppointmentSheet onClose={() => setParams({ new: undefined })} /> : null}
      {openId && (data?.find((item) => item.id === openId) ?? linked.data) ? (
        <AppointmentSheet appointment={data?.find((item) => item.id === openId) ?? linked.data!} onClose={() => setParams({ open: undefined })} />
      ) : null}
    </PageBody>
  );
}

function AppointmentCard({ appointment, onOpen, compact }: { appointment: Appointment; onOpen: () => void; compact?: boolean }) {
  const past = new Date(appointment.startsAt).getTime() < Date.now();
  const done = appointment.status === "completed" || appointment.status === "cancelled" || appointment.status === "no-show";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full border border-l-2 bg-surface-raised text-left transition-colors hover:border-ink-400",
        appointment.status === "requested" ? "border-l-brass" : appointment.status === "confirmed" ? "border-l-ink-950" : "border-l-ink-300",
        done && "bg-surface",
        compact ? "px-2 py-1.5" : "flex items-start justify-between gap-3 px-4 py-3",
      )}
    >
      <span className="block min-w-0">
        <span data-numeric className={cn("flex items-center gap-1.5 font-medium", compact ? "text-xs" : "text-sm")}>
          {formatTime(appointment.startsAt)}
          {appointment.type === "test-drive" ? <KeyRound className="size-3 text-ink-500" aria-label="Test drive" /> : null}
          {past && !done ? <span className="text-[0.625rem] font-normal text-brass-deep uppercase">Outcome?</span> : null}
        </span>
        <span className={cn("block truncate", compact ? "text-xs" : "text-sm")}>{appointment.customerName}</span>
        <span className={cn("block truncate text-ink-600", compact ? "text-[0.6875rem]" : "text-xs")}>
          {compact ? null : `${appointment.type === "test-drive" ? "Test drive" : "Viewing"} · `}
          {appointment.vehicleTitle ?? "Car not set"}
        </span>
        {appointment.type === "test-drive" && !compact && appointment.status !== "cancelled" ? (
          <span className="mt-1 flex items-center gap-1 text-[0.6875rem] text-ink-500">
            <CircleCheck className={cn("size-3", appointment.checks.licenceSeen ? "text-success" : "text-ink-300")} aria-hidden />
            Licence {appointment.checks.licenceSeen ? "seen" : "not seen"}
          </span>
        ) : null}
      </span>
      {compact ? null : <AppointmentStatusBadge status={appointment.status} />}
    </button>
  );
}
