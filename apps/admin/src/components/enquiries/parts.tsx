"use client";

import {
  enquiryKindLabel,
  enquirySubject,
  type Enquiry,
  type EnquiryKind,
  type TeamMember,
} from "@Stratford-city-motorcars-Ltd/core";
import { Car, CircleHelp, Mail, MessageCircle, Phone, PoundSterling, Repeat2 } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { EnquiryStatusBadge, Tag } from "@/components/ui/badge";
import { routes } from "@/components/shell/routes";
import { GuardedLink } from "@/components/ui/unsaved";
import { formatRelative, formatWaiting, initials, isWaitingLong } from "@/lib/format";

const kindIcon: Record<EnquiryKind, typeof Car> = {
  "vehicle-enquiry": Car,
  finance: PoundSterling,
  "part-exchange": Repeat2,
  contact: CircleHelp,
};

export function KindTag({ kind, className }: { kind: EnquiryKind; className?: string }) {
  const Icon = kindIcon[kind];
  return (
    <Tag icon={<Icon aria-hidden />} className={className}>
      {enquiryKindLabel(kind)}
    </Tag>
  );
}

/** "Waiting 3 hours", brass-marked once it passes a day. */
export function Waiting({ since, className }: { since: string; className?: string }) {
  const long = isWaitingLong(since);
  return (
    <span data-numeric className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", long ? "font-medium text-brass-deep" : "text-ink-600", className)}>
      {long ? <span aria-hidden className="size-1.5 bg-brass" /> : null}
      Waiting {formatWaiting(since)}
    </span>
  );
}

/** Phone numbers are stored as typed; links need digits. UK numbers become +44 for WhatsApp. */
export function contactLinks(enquiry: Pick<Enquiry, "phone" | "email" | "name">, context?: string) {
  const digits = enquiry.phone?.replace(/\D/g, "") ?? "";
  const international = digits.startsWith("0") ? `44${digits.slice(1)}` : digits;
  const firstName = enquiry.name.split(/\s+/)[0] ?? "";
  const greeting = `Hi ${firstName}, it's Stratford City Motorcars${context ? ` about ${context}` : ""}.`;
  return {
    tel: digits ? `tel:+${international}` : null,
    whatsapp: digits ? `https://wa.me/${international}?text=${encodeURIComponent(greeting)}` : null,
    mailto: enquiry.email ? `mailto:${enquiry.email}?subject=${encodeURIComponent(`Your enquiry${context ? ` about ${context}` : ""}`)}` : null,
  };
}

/** Call, WhatsApp and email as quiet icon links. Nothing is sent from the admin itself. */
export function ContactActions({ enquiry, context, size = "md" }: { enquiry: Pick<Enquiry, "phone" | "email" | "name">; context?: string; size?: "sm" | "md" }) {
  const links = contactLinks(enquiry, context);
  const box = cn(
    "relative z-10 inline-flex items-center justify-center border border-border bg-surface-raised text-ink-700 transition-colors hover:border-ink-900 hover:bg-ink-950 hover:text-bone",
    size === "sm" ? "size-11 sm:size-8" : "size-11 sm:size-10",
  );
  return (
    <div className="flex items-center gap-1.5">
      {links.tel ? (
        <a href={links.tel} className={box} aria-label={`Call ${enquiry.name}`} title="Call">
          <Phone className="size-4" aria-hidden />
        </a>
      ) : null}
      {links.whatsapp ? (
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={cn(box, "hover:border-whatsapp hover:bg-whatsapp")} aria-label={`Message ${enquiry.name} on WhatsApp (opens WhatsApp)`} title="WhatsApp">
          <MessageCircle className="size-4" aria-hidden />
        </a>
      ) : null}
      {links.mailto ? (
        <a href={links.mailto} className={box} aria-label={`Email ${enquiry.name}`} title="Email">
          <Mail className="size-4" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

export function MemberInitials({ member, className }: { member: Pick<TeamMember, "name"> | undefined; className?: string }) {
  if (!member) {
    return <span className={cn("text-xs text-ink-500", className)}>Unassigned</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-2 text-[0.8125rem] text-ink-700", className)} title={member.name}>
      <span aria-hidden className="flex size-6 shrink-0 items-center justify-center bg-ink-100 text-[0.625rem] font-medium text-ink-700">
        {initials(member.name)}
      </span>
      <span className="truncate">{member.name.split(" ")[0]}</span>
    </span>
  );
}

/** A compact enquiry row for panels (overview, customer, car). */
export function EnquiryLine({ enquiry, showStatus = true, showWaiting = false }: { enquiry: Enquiry; showStatus?: boolean; showWaiting?: boolean }) {
  return (
    <GuardedLink
      href={routes.enquiry(enquiry.id)}
      className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-ink-50 sm:px-5"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium group-hover:underline group-hover:decoration-brass group-hover:underline-offset-4">{enquiry.name}</span>
          <span className="text-xs text-ink-500" data-numeric>
            {enquiry.reference}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-600">{enquirySubject(enquiry)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {showWaiting ? <Waiting since={enquiry.createdAt} /> : <span className="text-xs text-ink-500">{formatRelative(enquiry.createdAt)}</span>}
        {showStatus ? <EnquiryStatusBadge status={enquiry.status} /> : null}
      </span>
    </GuardedLink>
  );
}
