"use client";

import { formatPrice, type Appointment, type Overview as OverviewData, type OverviewListing } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { ArrowRight, CalendarPlus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { EnquiryLine } from "@/components/enquiries/parts";
import { routes, withQuery } from "@/components/shell/routes";
import { AppointmentStatusBadge, Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState, Metric, Notice, PageBody, PageHeader, Panel, Skeleton } from "@/components/ui/page";
import { Photo } from "@/components/ui/photo";
import { GuardedLink } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { formatDayLabel, formatLongDay, formatTime, plural } from "@/lib/format";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/London" }).format(date));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * What needs doing today: enquiries waiting for a reply, today's viewings,
 * cars held off the website and listings short of the standard. Every figure
 * comes from stored records — there is no visitor tracking to report.
 */
export function Overview() {
  const { user, can } = useSession();
  const { data, isPending, error, refetch } = useQuery({ queryKey: queryKeys.overview, queryFn: () => api.overview.get() });

  return (
    <PageBody>
      <PageHeader
        eyebrow={formatLongDay(new Date())}
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description="What needs a reply, who is coming in, and what is on the website."
        actions={
          <>
            {can("appointments.edit") ? (
              <ButtonLink href={withQuery(routes.viewings, { new: "1" })}>
                <CalendarPlus aria-hidden />
                Arrange viewing
              </ButtonLink>
            ) : null}
            {can("stock.edit") ? (
              <ButtonLink href={routes.newVehicle} variant="primary">
                <Plus aria-hidden />
                Add a car
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="The overview could not be loaded" />
      ) : (
        <div className="flex flex-col gap-6">
          {data?.stock.withheld.length ? <WithheldNotice listings={data.stock.withheld} /> : null}
          <Figures data={data} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-6 xl:col-span-7">
              <NeedsReply data={data} loading={isPending} />
              <RecentEnquiries data={data} loading={isPending} />
            </div>
            <div className="flex min-w-0 flex-col gap-6 xl:col-span-5">
              <Appointments data={data} loading={isPending} />
              <ListingsNeedingWork data={data} loading={isPending} />
            </div>
          </div>
        </div>
      )}
    </PageBody>
  );
}

type Props = { data: OverviewData | undefined; loading: boolean };

function WithheldNotice({ listings }: { listings: OverviewListing[] }) {
  const first = listings[0]!;
  return (
    <Notice
      tone="danger"
      title={`${plural(listings.length, "car")} marked for sale ${listings.length === 1 ? "is" : "are"} not showing on the website`}
      action={
        <ButtonLink href={routes.vehicle(first.id)} size="sm">
          Fix {listings.length === 1 ? "it" : "the first"}
        </ButtonLink>
      }
    >
      {listings.map((listing) => `${listing.title}: ${listing.issues[0]?.message ?? "a publishing rule is not met."}`).join(" ")}
    </Notice>
  );
}

function Figures({ data }: { data: OverviewData | undefined }) {
  if (!data) {
    return (
      <div role="status" aria-label="Loading figures" className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface-raised p-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-8 w-14" />
            <Skeleton className="mt-3 h-2.5 w-24" />
          </div>
        ))}
      </div>
    );
  }
  const { stock, enquiries, appointments } = data;
  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
      <Metric
        label="New enquiries"
        value={enquiries.byStatus.new}
        hint={`${enquiries.open} open in total`}
        href={withQuery(routes.enquiries, { status: "new" })}
        tone={enquiries.byStatus.new ? "attention" : undefined}
      />
      <Metric
        label="Viewings today"
        value={appointments.today.length}
        hint={appointments.toConfirm ? `${appointments.toConfirm} still to confirm` : "All confirmed"}
        href={routes.viewings}
        tone={appointments.toConfirm ? "attention" : undefined}
      />
      <Metric label="On the website" value={stock.live} hint={`${stock.featured} featured · ${stock.reserved} reserved`} href={withQuery(routes.stock, { status: "published" })} />
      <Metric label="Drafts" value={stock.drafts} hint={stock.readyToPublish ? `${stock.readyToPublish} ready to publish` : "None ready to publish"} href={withQuery(routes.stock, { status: "draft" })} />
      <Metric label="Stock for sale" value={stock.stockValue ? formatPrice(stock.stockValue) : "—"} hint={stock.poaCount ? `Plus ${stock.poaCount} POA` : "Cash prices, cars on the website"} />
      <Metric label="Sold · 30 days" value={stock.soldRecently} hint="Pages stay up, marked sold" href={withQuery(routes.stock, { status: "sold" })} />
    </div>
  );
}

function PanelRows({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

function ViewAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <GuardedLink href={href as Route} className="flex h-9 items-center gap-1.5 text-xs text-ink-600 transition-colors hover:text-foreground">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </GuardedLink>
  );
}

function NeedsReply({ data, loading }: Props) {
  const waiting = data?.enquiries.needsReply ?? [];
  const total = data?.enquiries.byStatus.new ?? 0;
  return (
    <Panel
      title={
        <h2 className="admin-eyebrow flex items-center gap-2.5 text-ink-600">
          Needs a reply
          {total ? (
            <span data-numeric className="inline-flex h-5 min-w-5 items-center justify-center bg-brass px-1.5 font-sans text-[0.6875rem] tracking-normal text-ink-950">
              {total}
            </span>
          ) : null}
        </h2>
      }
      action={<span className="text-xs text-ink-500">Oldest first</span>}
      flush
    >
      {loading ? (
        <PanelRows />
      ) : waiting.length ? (
        <>
          <ul className="divide-y divide-border">
            {waiting.map((enquiry) => (
              <li key={enquiry.id}>
                <EnquiryLine enquiry={enquiry} showWaiting showStatus={false} />
              </li>
            ))}
          </ul>
          {total > waiting.length ? (
            <div className="border-t border-border px-5 py-2">
              <ViewAll href={withQuery(routes.enquiries, { status: "new", sort: "oldest" })}>All {total} new enquiries</ViewAll>
            </div>
          ) : null}
        </>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground">Nothing is waiting for a reply.</p>
      )}
    </Panel>
  );
}

function RecentEnquiries({ data, loading }: Props) {
  return (
    <Panel title="Latest enquiries" action={<ViewAll href={routes.enquiries}>All enquiries</ViewAll>} flush>
      {loading ? (
        <PanelRows rows={4} />
      ) : data?.enquiries.recent.length ? (
        <ul className="divide-y divide-border">
          {data.enquiries.recent.map((enquiry) => (
            <li key={enquiry.id}>
              <EnquiryLine enquiry={enquiry} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground">No enquiries have come in from the website yet.</p>
      )}
    </Panel>
  );
}

function AppointmentLine({ appointment, showDay }: { appointment: Appointment; showDay?: boolean }) {
  return (
    <GuardedLink
      href={withQuery(routes.viewings, { open: appointment.id })}
      className="flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-ink-50 sm:px-5"
    >
      <span className="w-16 shrink-0" data-numeric>
        {showDay ? <span className="block text-xs text-ink-500">{formatDayLabel(appointment.startsAt)}</span> : null}
        <span className="block text-sm font-medium">{formatTime(appointment.startsAt)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{appointment.customerName}</span>
        <span className="block truncate text-xs text-ink-600">
          {appointment.type === "test-drive" ? "Test drive" : "Viewing"} · {appointment.vehicleTitle ?? "Car not set"}
        </span>
      </span>
      <AppointmentStatusBadge status={appointment.status} />
    </GuardedLink>
  );
}

function Appointments({ data, loading }: Props) {
  const today = data?.appointments.today ?? [];
  const upcoming = data?.appointments.upcoming ?? [];
  return (
    <Panel title="Viewings & test drives" action={<ViewAll href={routes.viewings}>Diary</ViewAll>} flush>
      {loading ? (
        <PanelRows />
      ) : (
        <>
          <p className="admin-label border-b border-border bg-surface/60 px-5 py-2">Today</p>
          {today.length ? (
            <ul className="divide-y divide-border">
              {today.map((appointment) => (
                <li key={appointment.id}>
                  <AppointmentLine appointment={appointment} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-muted-foreground">Nobody is booked in today.</p>
          )}
          <p className="admin-label border-y border-border bg-surface/60 px-5 py-2">Next seven days</p>
          {upcoming.length ? (
            <ul className="divide-y divide-border">
              {upcoming.map((appointment) => (
                <li key={appointment.id}>
                  <AppointmentLine appointment={appointment} showDay />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-muted-foreground">Nothing arranged yet.</p>
          )}
        </>
      )}
    </Panel>
  );
}

function ListingsNeedingWork({ data, loading }: Props) {
  const listings = data?.stock.needsWork ?? [];
  return (
    <Panel title="Listings to finish" action={<ViewAll href={routes.stock}>All cars</ViewAll>} flush>
      {loading ? (
        <PanelRows />
      ) : listings.length ? (
        <ul className="divide-y divide-border">
          {listings.map((listing) => (
            <li key={listing.id}>
              <GuardedLink href={routes.vehicle(listing.id)} className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-ink-50 sm:px-5">
                <Photo src={listing.coverSrc} alt="" className="h-11 w-16 shrink-0" sizes="64px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{[listing.year, listing.title].filter(Boolean).join(" ") || "Untitled car"}</span>
                  <span className="block truncate text-xs text-ink-600" data-numeric>
                    {listing.issues.length
                      ? `${plural(listing.issues.length, "thing")} to fix before publishing`
                      : `${listing.dealerPhotos} of 20+ photos${listing.hasVideo ? "" : " · no video"}`}
                  </span>
                </span>
                {listing.issues.length ? <Tag className="border-destructive/30 text-destructive">Blocked</Tag> : <Tag>{listing.status === "draft" ? "Ready" : "Live"}</Tag>}
              </GuardedLink>
            </li>
          ))}
        </ul>
      ) : data && data.stock.live + data.stock.drafts === 0 ? (
        <div className="px-5 py-6">
          <p className="text-sm text-muted-foreground">No cars for sale or in draft yet.</p>
          <GuardedLink href={routes.newVehicle} className="mt-2 inline-flex h-9 items-center gap-1.5 text-sm underline decoration-brass underline-offset-4">
            Add the first car
          </GuardedLink>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground">Every listing meets the standard. Nothing to finish.</p>
      )}
    </Panel>
  );
}
