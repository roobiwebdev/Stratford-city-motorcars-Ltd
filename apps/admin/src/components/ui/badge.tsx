import {
  APPOINTMENT_STATUSES,
  ENQUIRY_STATUSES,
  MEMBER_STATUSES,
  VALUATION_STATUSES,
  VEHICLE_STATUS_LABELS,
  type AppointmentStatus,
  type EnquiryStatus,
  type MemberStatus,
  type ValuationStatus,
  type VehicleStatus,
} from "@Stratford-city-motorcars-Ltd/core";
import type { ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * Status badges. Like the website's stock badges they are near-monochrome:
 * a state is told apart by fill, outline and dash — and always by its word —
 * never by colour alone. Brass marks the states that want attention.
 */

const shape =
  "inline-flex h-6 shrink-0 items-center gap-1.5 border px-2 font-sans text-[0.625rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase";

const tones = {
  ink: "border-ink-950 bg-ink-950 text-bone",
  brass: "border-brass bg-brass text-ink-950",
  outline: "border-ink-400 bg-surface-raised text-ink-800",
  quiet: "border-border-strong bg-ink-100 text-ink-600",
  dashed: "border-dashed border-ink-300 bg-transparent text-ink-500",
  danger: "border-destructive/50 bg-surface-raised text-destructive",
  success: "border-success/50 bg-surface-raised text-success",
} as const;

type Tone = keyof typeof tones;

export function Badge({ tone = "outline", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn(shape, tones[tone], className)}>
      {dot ? <span aria-hidden className="size-1.5 bg-current" /> : null}
      {children}
    </span>
  );
}

const label = <T extends string>(list: readonly { value: T; label: string }[], value: T) =>
  list.find((item) => item.value === value)?.label ?? value;

export function VehicleStatusBadge({ status, live, className }: { status: VehicleStatus; live?: boolean; className?: string }) {
  if (status === "published" && live === false) {
    return (
      <Badge tone="danger" className={className}>
        Not showing
      </Badge>
    );
  }
  const tone: Record<VehicleStatus, Tone> = { published: "ink", draft: "outline", sold: "quiet", archived: "dashed" };
  return (
    <Badge tone={tone[status]} dot={status === "published"} className={className}>
      {label(VEHICLE_STATUS_LABELS, status)}
    </Badge>
  );
}

export function EnquiryStatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  const tone: Record<EnquiryStatus, Tone> = {
    new: "brass",
    contacted: "outline",
    "viewing-arranged": "ink",
    sold: "quiet",
    "not-proceeding": "dashed",
  };
  return (
    <Badge tone={tone[status]} className={className}>
      {label(ENQUIRY_STATUSES, status)}
    </Badge>
  );
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const tone: Record<AppointmentStatus, Tone> = {
    requested: "brass",
    confirmed: "ink",
    completed: "quiet",
    "no-show": "danger",
    cancelled: "dashed",
  };
  return (
    <Badge tone={tone[status]} className={className}>
      {label(APPOINTMENT_STATUSES, status)}
    </Badge>
  );
}

export function ValuationBadge({ status, className }: { status: ValuationStatus; className?: string }) {
  const tone: Record<ValuationStatus, Tone> = { awaiting: "brass", offered: "outline", accepted: "success", declined: "dashed" };
  return (
    <Badge tone={tone[status]} className={className}>
      {label(VALUATION_STATUSES, status)}
    </Badge>
  );
}

export function MemberStatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  const tone: Record<MemberStatus, Tone> = { active: "outline", invited: "brass", deactivated: "dashed" };
  return (
    <Badge tone={tone[status]} className={className}>
      {label(MEMBER_STATUSES, status)}
    </Badge>
  );
}

/** A neutral chip: request type, enquiry kind, a flag on a car. */
export function Tag({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 border border-border bg-surface px-2 text-xs whitespace-nowrap text-ink-700 [&_svg]:size-3",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
