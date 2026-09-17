"use client";

import { formatDate, type AdminVehicle, type ListingProgress, type VehicleRecord } from "@Stratford-city-motorcars-Ltd/core";
import { useState } from "react";
import { Check, ChevronDown, CircleAlert, ExternalLink } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { SITE_URL } from "@/lib/api";

export const SECTIONS = [
  { id: "identity", label: "The car" },
  { id: "price", label: "Price" },
  { id: "specification", label: "Specification" },
  { id: "history", label: "History & checks" },
  { id: "description", label: "Description & features" },
  { id: "media", label: "Photographs & video" },
  { id: "visibility", label: "Web address & search" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Where this car stands on the website, what stops it being published — each
 * item a link to the section that fixes it — and what would make the listing
 * complete. Reflects the form as it is now, saved or not.
 *
 * Collapses to a summary strip on narrower screens.
 */
export function PublishingPanel({
  vehicle,
  draft,
  progress,
  dirty,
  canEdit,
}: {
  vehicle: AdminVehicle;
  draft: VehicleRecord;
  progress: ListingProgress;
  dirty: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const issueSections = new Set<string>(progress.issues.map((issue) => issue.section));

  const headline = (() => {
    if (vehicle.status === "archived") return { tone: "muted", text: "Archived — not on the website" };
    if (vehicle.status === "sold") return { tone: "muted", text: "Sold — page kept, marked SOLD" };
    if (vehicle.status === "published") {
      return progress.issues.length
        ? { tone: "danger", text: dirty ? "These changes would take it off the website" : "Marked for sale but not showing" }
        : { tone: "live", text: dirty ? "Live — save to update the website" : "Live on the website" };
    }
    return progress.issues.length ? { tone: "muted", text: `Draft — ${progress.issues.length} to fix before publishing` } : { tone: "ready", text: "Draft — ready to publish" };
  })();

  return (
    <div className="border border-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left xl:pointer-events-none xl:cursor-default"
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0",
            headline.tone === "live" && "bg-success",
            headline.tone === "ready" && "bg-brass",
            headline.tone === "danger" && "bg-destructive",
            headline.tone === "muted" && "bg-ink-300",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="admin-eyebrow block text-ink-600">Publishing</span>
          <span className="mt-0.5 block text-sm font-medium">{headline.text}</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 text-ink-500 transition-transform xl:hidden", open && "rotate-180")} />
      </button>

      <div className={cn("border-t border-border", open ? "block" : "hidden xl:block")}>
        {vehicle.status === "published" && progress.live && !dirty ? (
          <a href={`${SITE_URL}/vehicles/${vehicle.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[0.8125rem] text-ink-700 hover:bg-ink-50">
            <span className="truncate">/vehicles/{vehicle.slug}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-label="Opens the car's page on the website" />
          </a>
        ) : null}

        {vehicle.reservation ? (
          <div className="border-b border-border px-4 py-3 text-[0.8125rem]">
            <p className="font-medium">Reserved for {vehicle.reservation.customerName}</p>
            <p className="mt-0.5 text-ink-600">
              Since {formatDate(vehicle.reservation.reservedAt)}
              {vehicle.reservation.depositNote ? ` · ${vehicle.reservation.depositNote}` : ""}
            </p>
            {vehicle.reservation.note ? <p className="mt-1 text-ink-600">{vehicle.reservation.note}</p> : null}
          </div>
        ) : null}

        {vehicle.status !== "archived" && vehicle.status !== "sold" ? (
          <div className="px-4 py-3.5">
            <p className="admin-label">{progress.issues.length ? "Before it can go on the website" : "Publishing rules"}</p>
            {progress.issues.length ? (
              <ul className="mt-2 space-y-1">
                {progress.issues.map((issue) => (
                  <li key={issue.code}>
                    <button type="button" onClick={() => jump(issue.section)} className="flex w-full gap-2 py-1 text-left text-[0.8125rem] leading-snug text-ink-800 hover:underline hover:decoration-brass hover:underline-offset-4">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex gap-2 text-[0.8125rem] text-ink-700">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                Every rule is met{canEdit && vehicle.status === "draft" ? ". Publish when you are ready." : "."}
              </p>
            )}
          </div>
        ) : null}

        {progress.recommendations.length && vehicle.status !== "archived" ? (
          <div className="border-t border-border px-4 py-3">
            <button type="button" onClick={() => setShowTips((value) => !value)} aria-expanded={showTips} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="admin-label">To finish the listing · {progress.recommendations.length}</span>
              <ChevronDown aria-hidden className={cn("size-3.5 text-ink-500 transition-transform", showTips && "rotate-180")} />
            </button>
            {showTips ? (
              <ul className="mt-2 space-y-1">
                {progress.recommendations.map((tip) => (
                  <li key={tip.message}>
                    <button type="button" onClick={() => jump(tip.section)} className="flex w-full gap-2 py-1 text-left text-[0.8125rem] leading-snug text-ink-700 hover:underline hover:decoration-brass hover:underline-offset-4">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-brass" />
                      {tip.message}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-ink-500">Not required to publish — the client&rsquo;s standard for a finished listing.</p>
            )}
          </div>
        ) : null}

        <nav aria-label="Sections" className="hidden border-t border-border px-2 py-2 xl:block">
          <ol>
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <button type="button" onClick={() => jump(section.id)} className="flex h-9 w-full items-center gap-3 px-2 text-left text-[0.8125rem] text-ink-700 transition-colors hover:bg-ink-50 hover:text-foreground">
                  <span data-numeric className="w-5 text-xs text-ink-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{section.label}</span>
                  {issueSections.has(section.id) ? <span aria-label="Needs attention" className="size-1.5 bg-destructive" /> : null}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p className="border-t border-border px-4 py-2.5 text-xs text-ink-500">
          Created {formatDate(draft.createdAt)}
          {vehicle.listedAt ? ` · first listed ${formatDate(vehicle.listedAt)}` : ""}
        </p>
      </div>
    </div>
  );
}
