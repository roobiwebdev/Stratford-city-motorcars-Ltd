"use client";

import {
  STOCK_SORTS,
  deniedReason,
  formatMileageShort,
  formatVehiclePrice,
  listingProgress,
  type AdminVehicle,
  type StockSort,
  type VehicleStatus,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  BadgeCheck,
  Car,
  Copy,
  ExternalLink,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Star,
  StarOff,
  Tag as TagIcon,
  Undo2,
  Unlock,
} from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { routes } from "@/components/shell/routes";
import { Tag, VehicleStatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { ActionMenu, type MenuAction } from "@/components/ui/menu";
import { EmptyState, ErrorState, LoadingRows, PageBody, PageHeader } from "@/components/ui/page";
import { Photo } from "@/components/ui/photo";
import { DataTable, rowLinkClass, type Column } from "@/components/ui/table";
import { FilterSelect, ResultCount, SearchField, SegmentedFilter, Toolbar } from "@/components/ui/toolbar";
import { GuardedLink } from "@/components/ui/unsaved";
import { api, SITE_URL } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { queryKeys } from "@/lib/query";

import { useVehicleActions, vehicleName } from "./vehicle-actions";

type StatusFilter = VehicleStatus | "all" | "not-showing";
const STATUS_VALUES: StatusFilter[] = ["all", "published", "draft", "sold", "archived", "not-showing"];

function sortVehicles(vehicles: AdminVehicle[], sort: StockSort) {
  const price = (vehicle: AdminVehicle) => (vehicle.priceOnApplication ? Number.MAX_SAFE_INTEGER : (vehicle.price ?? -1));
  return [...vehicles].sort((a, b) => {
    switch (sort) {
      case "price-desc":
        return price(b) - price(a);
      case "price-asc":
        return price(a) - price(b);
      case "year-desc":
        return (b.year ?? 0) - (a.year ?? 0);
      case "title":
        return vehicleName(a).localeCompare(vehicleName(b));
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
}

/** Every car in every state. Stock is small enough to fetch whole and filter instantly. */
export function StockList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data, isPending, error, refetch, isFetching } = useQuery({ queryKey: queryKeys.stock, queryFn: () => api.stock.list() });
  const actions = useVehicleActions();

  const statusParam = params.get("status") as StatusFilter | null;
  const status: StatusFilter = statusParam && STATUS_VALUES.includes(statusParam) ? statusParam : "all";
  const [search, setSearch] = useState("");
  const [make, setMake] = useState<string>("all");
  const [sort, setSort] = useState<StockSort>("updated");

  const setStatus = (next: StatusFilter) => {
    const query = new URLSearchParams(params.toString());
    if (next === "all") query.delete("status");
    else query.set("status", next);
    router.replace(`${pathname}${query.size ? `?${query}` : ""}` as Route, { scroll: false });
  };

  const vehicles = (data ?? []).map((vehicle) => ({ vehicle, progress: listingProgress(vehicle) }));
  const count = (predicate: (item: (typeof vehicles)[number]) => boolean) => vehicles.filter(predicate).length;
  const makes = [...new Set(vehicles.map((item) => item.vehicle.make).filter(Boolean))].sort();

  const needle = search.trim().toLowerCase();
  const filtered = sortVehicles(
    vehicles
      .filter(({ vehicle, progress }) => {
        if (status === "not-showing") return progress.withheld;
        if (status !== "all" && vehicle.status !== status) return false;
        return true;
      })
      .filter(({ vehicle }) => make === "all" || vehicle.make === make)
      .filter(({ vehicle }) =>
        !needle ? true : [vehicle.title, vehicle.make, vehicle.model, vehicle.variant, vehicle.registration, vehicle.slug].some((value) => value?.toLowerCase().includes(needle)),
      )
      .map(({ vehicle }) => vehicle),
    sort,
  );
  const progressById = new Map(vehicles.map((item) => [item.vehicle.id, item.progress]));

  const menu = (vehicle: AdminVehicle): MenuAction[] => {
    const progress = progressById.get(vehicle.id)!;
    const archiveBlocked = !actions.can("stock.archive");
    const all: MenuAction[] = [
      { label: "Edit", icon: <Pencil />, onSelect: () => router.push(routes.vehicle(vehicle.id)) },
      {
        label: "View on website",
        icon: <ExternalLink />,
        onSelect: () => window.open(`${SITE_URL}/vehicles/${vehicle.slug}`, "_blank", "noopener"),
        hidden: !progress.live,
      },
      "separator",
      { label: "Publish", icon: <Send />, onSelect: () => void actions.publish(vehicle), hidden: vehicle.status !== "draft" },
      { label: vehicle.featured ? "Remove from homepage" : "Feature on homepage", icon: vehicle.featured ? <StarOff /> : <Star />, onSelect: () => void actions.feature(vehicle, !vehicle.featured), hidden: vehicle.status !== "published" },
      { label: "Reserve", icon: <TagIcon />, onSelect: () => actions.reserve(vehicle), hidden: vehicle.status !== "published" || vehicle.reserved },
      { label: "Release reservation", icon: <Unlock />, onSelect: () => void actions.release(vehicle), hidden: !vehicle.reserved || vehicle.status !== "published" },
      { label: "Mark as sold", icon: <BadgeCheck />, onSelect: () => actions.sell(vehicle), hidden: vehicle.status !== "published" },
      { label: "Put back on sale", icon: <Undo2 />, onSelect: () => void actions.undoSale(vehicle), hidden: vehicle.status !== "sold" },
      { label: "Unpublish", icon: <EyeOff />, onSelect: () => void actions.unpublish(vehicle), hidden: vehicle.status !== "published" },
      "separator",
      { label: "Duplicate", icon: <Copy />, onSelect: () => void actions.duplicate(vehicle), hidden: !actions.can("stock.edit") },
      {
        label: "Archive",
        icon: <Archive />,
        tone: "danger",
        onSelect: () => void actions.archive(vehicle),
        hidden: vehicle.status === "archived",
        disabled: archiveBlocked,
        reason: archiveBlocked ? deniedReason("stock.archive") : undefined,
      },
      {
        label: "Restore as draft",
        icon: <RotateCcw />,
        onSelect: () => void actions.restore(vehicle),
        hidden: vehicle.status !== "archived",
        disabled: archiveBlocked,
        reason: archiveBlocked ? deniedReason("stock.archive") : undefined,
      },
    ];
    // Roles without stock.edit can only open and view.
    return actions.can("stock.edit") ? all : all.filter((action) => action !== "separator" && (action.label === "Edit" || action.label === "View on website"));
  };

  const flags = (vehicle: AdminVehicle) => (
    <>
      {vehicle.reserved ? <Tag className="border-brass/60 text-brass-deep">Reserved</Tag> : null}
      {vehicle.featured ? (
        <Tag icon={<Star aria-hidden />} className="text-ink-700">
          Featured
        </Tag>
      ) : null}
    </>
  );

  const columns: Column<AdminVehicle>[] = [
    {
      id: "photo",
      header: "Photograph",
      hideHeader: true,
      className: "w-24",
      cell: (vehicle) => <Photo src={progressById.get(vehicle.id)?.cover?.src} alt="" label="Cover" className="h-12 w-[4.5rem]" />,
    },
    {
      id: "car",
      header: "Car",
      sortValue: (vehicle) => vehicleName(vehicle),
      cell: (vehicle) => (
        <div className="min-w-0">
          <GuardedLink href={routes.vehicle(vehicle.id)} className={rowLinkClass}>
            {vehicleName(vehicle)}
          </GuardedLink>
          <p className="mt-0.5 truncate text-xs text-ink-500" data-numeric>
            {[vehicle.registration, vehicle.mileage !== null ? formatMileageShort(vehicle.mileage) : null, vehicle.colour || null].filter(Boolean).join(" · ") || "Details not added yet"}
          </p>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      align: "right",
      sortValue: (vehicle) => (vehicle.priceOnApplication ? Number.MAX_SAFE_INTEGER : (vehicle.price ?? -1)),
      cell: (vehicle) =>
        vehicle.price === null && !vehicle.priceOnApplication ? (
          <span className="text-ink-500">Not set</span>
        ) : (
          <span data-numeric className="font-medium">
            {formatVehiclePrice(vehicle)}
          </span>
        ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (vehicle) => vehicle.status,
      cell: (vehicle) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <VehicleStatusBadge status={vehicle.status} live={vehicle.status === "published" ? progressById.get(vehicle.id)?.live : undefined} />
          {flags(vehicle)}
        </div>
      ),
    },
    {
      id: "listing",
      header: "Listing",
      minWidth: "lg",
      sortValue: (vehicle) => -(progressById.get(vehicle.id)?.issues.length ?? 0) * 100 + (progressById.get(vehicle.id)?.dealerPhotos ?? 0),
      cell: (vehicle) => <ListingSummary vehicle={vehicle} progress={progressById.get(vehicle.id)!} />,
    },
    {
      id: "enquiries",
      header: "Open enquiries",
      minWidth: "xl",
      align: "right",
      sortValue: (vehicle) => vehicle.openEnquiryCount,
      cell: (vehicle) => <span data-numeric className={vehicle.openEnquiryCount ? "font-medium" : "text-ink-500"}>{vehicle.openEnquiryCount || "—"}</span>,
    },
    {
      id: "updated",
      header: "Updated",
      minWidth: "xl",
      sortValue: (vehicle) => vehicle.updatedAt,
      cell: (vehicle) => <span className="text-[0.8125rem] whitespace-nowrap text-ink-500">{formatRelative(vehicle.updatedAt)}</span>,
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setMake("all");
    setStatus("all");
  };

  const statusOptions = [
    { value: "all" as const, label: "All", count: vehicles.length },
    { value: "published" as const, label: "For sale", count: count((item) => item.vehicle.status === "published") },
    { value: "draft" as const, label: "Drafts", count: count((item) => item.vehicle.status === "draft") },
    { value: "sold" as const, label: "Sold", count: count((item) => item.vehicle.status === "sold") },
    { value: "archived" as const, label: "Archived", count: count((item) => item.vehicle.status === "archived") },
    ...(count((item) => item.progress.withheld) ? [{ value: "not-showing" as const, label: "Not showing", count: count((item) => item.progress.withheld), attention: true }] : []),
  ];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Stock"
        title="Cars"
        description="Everything in stock, in every state. A car appears on the website only when it is for sale and meets every publishing rule."
        actions={
          actions.can("stock.edit") ? (
            <ButtonLink href={routes.newVehicle} variant="primary">
              <Plus aria-hidden />
              Add a car
            </ButtonLink>
          ) : null
        }
      />

      {data ? <SegmentedFilter label="Filter by status" value={status} onChange={setStatus} options={statusOptions} className="mb-4" /> : null}

      <Toolbar>
        <SearchField label="Search cars" placeholder="Make, model or registration" value={search} onChange={setSearch} />
        {makes.length > 1 ? <FilterSelect label="Filter by make" allLabel="All makes" value={make} onChange={setMake} options={makes.map((value) => ({ value, label: value }))} /> : null}
        <div className="w-full sm:w-52">
          <Select aria-label="Sort cars" value={sort} onChange={(event) => setSort(event.target.value as StockSort)}>
            {STOCK_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {data ? <ResultCount count={filtered.length} total={vehicles.length} noun={["car", "cars"]} /> : null}
      </Toolbar>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Stock could not be loaded" />
      ) : isPending ? (
        <LoadingRows label="Loading stock" />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={<Car />}
          title="No cars yet"
          body="Add the first car to start building the stock list. Save it as a draft while you gather the photographs — nothing appears on the website until you publish it."
          action={
            actions.can("stock.edit") ? (
              <ButtonLink href={routes.newVehicle} variant="primary">
                <Plus aria-hidden />
                Add a car
              </ButtonLink>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          title="No cars match"
          body={search ? `Nothing matches “${search.trim()}”${status !== "all" || make !== "all" ? " with these filters" : ""}.` : "No cars are in this state."}
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <DataTable
          caption="Cars"
          rows={filtered}
          columns={columns}
          rowKey={(vehicle) => vehicle.id}
          busy={isFetching && !isPending}
          sortable={false}
          rowClassName={(vehicle) => (vehicle.status === "archived" ? "bg-surface/60" : "")}
          actions={(vehicle) => <ActionMenu label={`Actions for ${vehicleName(vehicle)}`} actions={menu(vehicle)} />}
          renderCard={(vehicle) => {
            const progress = progressById.get(vehicle.id)!;
            return (
              <div className="flex gap-3">
                <Photo src={progress.cover?.src} alt="" label="Cover" className="h-16 w-22 shrink-0" />
                <div className="min-w-0 flex-1">
                  <GuardedLink href={routes.vehicle(vehicle.id)} className={cn(rowLinkClass, "block truncate")}>
                    {vehicleName(vehicle)}
                  </GuardedLink>
                  <p data-numeric className="mt-0.5 text-sm">
                    {vehicle.price === null && !vehicle.priceOnApplication ? <span className="text-ink-500">Price not set</span> : formatVehiclePrice(vehicle)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <VehicleStatusBadge status={vehicle.status} live={vehicle.status === "published" ? progress.live : undefined} />
                    {flags(vehicle)}
                  </div>
                  <div className="mt-2">
                    <ListingSummary vehicle={vehicle} progress={progress} />
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}

      {actions.render}
    </PageBody>
  );
}

function ListingSummary({ vehicle, progress }: { vehicle: AdminVehicle; progress: ReturnType<typeof listingProgress> }) {
  if (vehicle.status === "archived" || vehicle.status === "sold") {
    return <span className="text-xs text-ink-500" data-numeric>{progress.dealerPhotos} photographs</span>;
  }
  const ratio = Math.min(1, progress.dealerPhotos / progress.target);
  return (
    <div className="flex min-w-36 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs" data-numeric>
        {progress.issues.length ? (
          <span className="text-destructive">{progress.issues.length} to fix before publishing</span>
        ) : (
          <span className="text-ink-600">Ready to publish</span>
        )}
        <span className="text-ink-500">
          {progress.dealerPhotos}/{progress.target}+
        </span>
      </div>
      <div aria-hidden className="h-1 w-full bg-ink-150">
        <div className={cn("h-full", progress.issues.length ? "bg-ink-400" : ratio >= 1 ? "bg-success" : "bg-brass")} style={{ width: `${Math.max(ratio * 100, progress.dealerPhotos ? 4 : 0)}%` }} />
      </div>
    </div>
  );
}
