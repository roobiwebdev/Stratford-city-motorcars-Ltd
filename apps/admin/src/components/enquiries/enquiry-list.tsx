"use client";

import {
  DEFAULT_PAGE_SIZE,
  ENQUIRY_KINDS,
  ENQUIRY_SORTS,
  VALUATION_STATUSES,
  enquirySubject,
  formatNumber,
  formatPrice,
  type Enquiry,
  type EnquiryKind,
  type EnquiryListQuery,
  type EnquirySort,
  type EnquiryStatus,
  type ValuationStatus,
} from "@Stratford-city-motorcars-Ltd/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Inbox, Repeat2 } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { routes } from "@/components/shell/routes";
import { EnquiryStatusBadge, ValuationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, ErrorState, LoadingRows, Notice, PageBody, PageHeader } from "@/components/ui/page";
import { DataTable, rowLinkClass, type Column } from "@/components/ui/table";
import { FilterSelect, Pagination, SearchField, SegmentedFilter, Toolbar } from "@/components/ui/toolbar";
import { GuardedLink } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { queryKeys } from "@/lib/query";

import { ContactActions, KindTag, MemberInitials, Waiting } from "./parts";

type StatusTab = EnquiryStatus | "open" | "all";
const STATUS_TABS: StatusTab[] = ["open", "new", "contacted", "viewing-arranged", "sold", "not-proceeding", "all"];

function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * The enquiry inbox, or — with `mode="part-exchange"` — the valuation queue,
 * which is the same enquiries narrowed to part exchanges with the columns a
 * valuation needs. Filters live in the URL so a filtered view can be shared
 * or bookmarked. Paged by the API.
 */
export function EnquiryList({ mode = "all" }: { mode?: "all" | "part-exchange" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const partExchange = mode === "part-exchange";

  const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  };

  const status = read<StatusTab>("status", STATUS_TABS, partExchange ? "all" : "open");
  const kind = partExchange ? "part-exchange" : read<EnquiryKind | "all">("kind", ["all", ...ENQUIRY_KINDS.map((item) => item.value)], "all");
  const valuation = read<ValuationStatus | "all">("valuation", ["all", ...VALUATION_STATUSES.map((item) => item.value)], "all");
  const handledBy = params.get("handler") ?? "all";
  const sort = read<EnquirySort>("sort", ENQUIRY_SORTS.map((item) => item.value), "newest");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebounced(search);

  const setParams = (next: Record<string, string | undefined>, resetPage = true) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "all" || (key === "status" && value === (partExchange ? "all" : "open"))) query.delete(key);
      else query.set(key, value);
    }
    if (resetPage && !("page" in next)) query.delete("page");
    router.replace(`${pathname}${query.size ? `?${query}` : ""}` as Route, { scroll: false });
  };

  useEffect(() => {
    if ((params.get("q") ?? "") !== debouncedSearch.trim()) setParams({ q: debouncedSearch.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync the debounced search into the URL only
  }, [debouncedSearch]);

  const listQuery: EnquiryListQuery = {
    status: partExchange ? (status === "all" ? "all" : status) : status,
    kind,
    valuation: partExchange ? valuation : undefined,
    handledBy,
    sort,
    search: debouncedSearch.trim() || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  const list = useQuery({ queryKey: queryKeys.enquiries(listQuery), queryFn: () => api.enquiries.list(listQuery), placeholderData: keepPreviousData });
  const counts = useQuery({ queryKey: queryKeys.enquiryCounts({ kind }), queryFn: () => api.enquiries.counts({ kind }) });
  const team = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const members = new Map((team.data ?? []).map((member) => [member.id, member]));

  const filtered = Boolean(debouncedSearch.trim()) || handledBy !== "all" || valuation !== "all" || (!partExchange && kind !== "all");
  const clear = () => {
    setSearch("");
    setParams({ q: undefined, handler: undefined, valuation: undefined, kind: undefined, status: undefined });
  };

  const tabs = STATUS_TABS.filter((tab) => !partExchange || tab !== "open").map((value) => {
    const byStatus = counts.data?.byStatus;
    const label =
      value === "open" ? "Open" : value === "all" ? "All" : value === "new" ? "New" : value === "contacted" ? "Contacted" : value === "viewing-arranged" ? "Viewing arranged" : value === "sold" ? "Sold" : "Not proceeding";
    const count = !counts.data ? undefined : value === "open" ? counts.data.open : value === "all" ? counts.data.total : byStatus![value];
    return { value, label, count, attention: value === "new" };
  });
  const ordered = partExchange ? [tabs.find((tab) => tab.value === "all")!, ...tabs.filter((tab) => tab.value !== "all")] : tabs;

  const columns: Column<Enquiry>[] = [
    {
      id: "received",
      header: "Received",
      className: "w-36",
      cell: (enquiry) => (
        <div>
          <p className="text-[0.8125rem] whitespace-nowrap" title={formatDateTime(enquiry.createdAt)}>
            {formatRelative(enquiry.createdAt)}
          </p>
          {enquiry.status === "new" ? <Waiting since={enquiry.createdAt} className="mt-0.5" /> : null}
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (enquiry) => (
        <div className="min-w-0">
          <GuardedLink href={routes.enquiry(enquiry.id)} className={cn(rowLinkClass, enquiry.status === "new" && "font-semibold")}>
            {enquiry.name}
          </GuardedLink>
          <p data-numeric className="mt-0.5 text-xs text-ink-500">
            {enquiry.reference}
          </p>
        </div>
      ),
    },
    partExchange
      ? {
          id: "car",
          header: "Their car",
          cell: (enquiry) =>
            enquiry.payload.kind === "part-exchange" ? (
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {enquiry.payload.year} {enquiry.payload.make} {enquiry.payload.model}
                </p>
                <p data-numeric className="mt-0.5 truncate text-xs text-ink-500">
                  {enquiry.payload.registration} · {formatNumber(enquiry.payload.mileage)} mi · {enquiry.payload.condition}
                </p>
              </div>
            ) : null,
        }
      : {
          id: "about",
          header: "About",
          cell: (enquiry) => (
            <div className="min-w-0 max-w-md">
              <p className="truncate text-sm">{enquirySubject(enquiry)}</p>
              <KindTag kind={enquiry.kind} className="mt-1" />
            </div>
          ),
        },
    ...(partExchange
      ? [
          {
            id: "valuation",
            header: "Valuation",
            cell: (enquiry: Enquiry) =>
              enquiry.valuation ? (
                <div className="flex flex-col items-start gap-1">
                  <ValuationBadge status={enquiry.valuation.status} />
                  {enquiry.valuation.amount !== null ? (
                    <span data-numeric className="text-xs text-ink-600">
                      {formatPrice(enquiry.valuation.amount)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <ValuationBadge status="awaiting" />
              ),
          } satisfies Column<Enquiry>,
        ]
      : []),
    { id: "status", header: "Status", cell: (enquiry) => <EnquiryStatusBadge status={enquiry.status} /> },
    { id: "handler", header: "Handling", minWidth: "lg", cell: (enquiry) => <MemberInitials member={enquiry.handledBy ? members.get(enquiry.handledBy) : undefined} /> },
    {
      id: "contact",
      header: "Contact",
      hideHeader: true,
      minWidth: "xl",
      align: "right",
      cell: (enquiry) => (
        <div className="flex justify-end">
          <ContactActions enquiry={enquiry} size="sm" context={enquiry.vehicle?.title} />
        </div>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Sales"
        title={partExchange ? "Part exchange" : "Enquiries"}
        description={
          partExchange
            ? "Valuation requests from the website. Every figure is an initial guide, confirmed only after the car is inspected."
            : "Everything sent through the website’s forms. Replies happen by phone, WhatsApp or email — record what happened here."
        }
      />

      <SegmentedFilter label="Filter by status" value={status} onChange={(value) => setParams({ status: value })} options={ordered} className="mb-4" />

      <Toolbar>
        <SearchField
          label={partExchange ? "Search part exchanges" : "Search enquiries"}
          placeholder={partExchange ? "Name, registration or car" : "Name, email, phone, reference or car"}
          value={search}
          onChange={setSearch}
        />
        {partExchange ? (
          <FilterSelect label="Filter by valuation" allLabel="Any valuation" value={valuation} onChange={(value) => setParams({ valuation: value })} options={VALUATION_STATUSES} />
        ) : (
          <FilterSelect label="Filter by type" allLabel="All types" value={kind} onChange={(value) => setParams({ kind: value })} options={ENQUIRY_KINDS} />
        )}
        <div className="w-full sm:w-48">
          <Select aria-label="Filter by who is handling it" value={handledBy} onChange={(event) => setParams({ handler: event.target.value })}>
            <option value="all">Anyone handling</option>
            <option value="unassigned">Unassigned</option>
            {(team.data ?? [])
              .filter((member) => member.status === "active")
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </Select>
        </div>
        <div className="w-full sm:w-40 sm:ml-auto">
          <Select aria-label="Sort enquiries" value={sort} onChange={(event) => setParams({ sort: event.target.value === "newest" ? undefined : event.target.value })}>
            {ENQUIRY_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Enquiries could not be loaded" />
      ) : list.isPending ? (
        <LoadingRows label="Loading enquiries" thumb={false} />
      ) : list.data.total === 0 ? (
        filtered || status !== (partExchange ? "all" : "open") ? (
          <EmptyState
            compact
            title={filtered ? "No enquiries match" : "Nothing here"}
            body={filtered ? "Try a different search, or clear the filters." : "No enquiries are in this state right now."}
            action={filtered ? <Button onClick={clear}>Clear filters</Button> : null}
          />
        ) : counts.data?.total ? (
          <EmptyState compact icon={<Inbox />} title="Nothing open" body="Every enquiry has been dealt with. New ones from the website will appear here." />
        ) : (
          <div className="space-y-4">
            <EmptyState
              icon={partExchange ? <Repeat2 /> : <Inbox />}
              title={partExchange ? "No part-exchange requests yet" : "No enquiries yet"}
              body={
                partExchange
                  ? "When someone asks for a valuation on the website, it appears here with everything they told you about their car."
                  : "When a customer uses a form on the website — a question, a viewing or test drive request, finance or part exchange — it appears here."
              }
            />
            <Notice tone="warning" title="Make sure somebody is told">
              The website can also send each enquiry to email or text. Check Settings to see whether notifications are set up.
            </Notice>
          </div>
        )
      ) : (
        <>
          <DataTable
            caption={partExchange ? "Part-exchange enquiries" : "Enquiries"}
            rows={list.data.items}
            columns={columns}
            rowKey={(enquiry) => enquiry.id}
            sortable={false}
            busy={list.isPlaceholderData}
            rowClassName={(enquiry) => (enquiry.status === "new" ? "bg-brass/[0.04]" : "")}
            renderCard={(enquiry) => (
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <GuardedLink href={routes.enquiry(enquiry.id)} className={cn(rowLinkClass, "truncate", enquiry.status === "new" && "font-semibold")}>
                    {enquiry.name}
                  </GuardedLink>
                  <span className="shrink-0 text-xs text-ink-500">{formatRelative(enquiry.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-[0.8125rem] text-ink-700">
                  {enquiry.payload.kind === "part-exchange" && partExchange
                    ? `${enquiry.payload.year} ${enquiry.payload.make} ${enquiry.payload.model} · ${enquiry.payload.registration}`
                    : enquirySubject(enquiry)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <EnquiryStatusBadge status={enquiry.status} />
                  {partExchange && enquiry.valuation ? <ValuationBadge status={enquiry.valuation.status} /> : <KindTag kind={enquiry.kind} />}
                  {enquiry.status === "new" ? <Waiting since={enquiry.createdAt} className="ml-1" /> : null}
                </div>
              </div>
            )}
          />
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} noun={["enquiry", "enquiries"]} onChange={(next) => setParams({ page: String(next) }, false)} />
        </>
      )}
    </PageBody>
  );
}
