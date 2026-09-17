import type { ListQuery } from "./list";
import type { VehicleStatus } from "./vehicle";

/**
 * Website enquiries, as the admin works them.
 *
 * The website stores each submission in the `lead` table (reference, kind,
 * name, contact details, car and the validated form as `payload`). The admin
 * adds the follow-up: a status, who is handling it, notes, the link to a
 * customer and, for part exchanges, a valuation.
 *
 * BACKEND NOTE: `lead.status` is `new | contacted | closed` today. Existing
 * `closed` rows need mapping (suggested: `not-proceeding` with reason `other`).
 */

export const ENQUIRY_KINDS = [
  { value: "vehicle-enquiry", label: "Car enquiry" },
  { value: "finance", label: "Finance" },
  { value: "part-exchange", label: "Part exchange" },
  { value: "contact", label: "General" },
] as const;

export type EnquiryKind = (typeof ENQUIRY_KINDS)[number]["value"];

export const ENQUIRY_STATUSES = [
  { value: "new", label: "New", note: "Not replied to yet" },
  { value: "contacted", label: "Contacted", note: "In conversation" },
  { value: "viewing-arranged", label: "Viewing arranged", note: "Coming to see a car" },
  { value: "sold", label: "Sold", note: "Bought a car" },
  { value: "not-proceeding", label: "Not proceeding", note: "Closed without a sale" },
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]["value"];

/** Statuses that still need someone to act. */
export const OPEN_ENQUIRY_STATUSES: readonly EnquiryStatus[] = ["new", "contacted", "viewing-arranged"];

export function isOpenEnquiry(status: EnquiryStatus): boolean {
  return OPEN_ENQUIRY_STATUSES.includes(status);
}

export const CLOSED_REASONS = [
  { value: "bought-elsewhere", label: "Bought elsewhere" },
  { value: "price", label: "Price" },
  { value: "car-sold", label: "The car was sold" },
  { value: "no-reply", label: "No reply from customer" },
  { value: "not-suitable", label: "Car not suitable" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
] as const;

export type ClosedReason = (typeof CLOSED_REASONS)[number]["value"];

/** Mirrors the website's request types (apps/web/src/lib/forms/options.ts). */
export const REQUEST_TYPES = [
  { value: "question", label: "Question" },
  { value: "viewing", label: "Viewing request" },
  { value: "test-drive", label: "Test drive request" },
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number]["value"];

// ---- What the customer submitted ---------------------------------------------------
//
// The stored payload is the website form's validated output minus the honeypot.
// apps/web/src/lib/forms/schemas.ts has a compile-time check that its output
// stays assignable to these shapes.

export interface VehicleEnquiryPayload {
  kind: "vehicle-enquiry";
  requestType: RequestType;
  name: string;
  email: string;
  phone?: string;
  /** YYYY-MM-DD. */
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
  vehicleSlug: string;
  /** The car's title when the customer sent the form. */
  vehicleTitle: string;
  interestedInFinance: boolean;
  hasPartExchange: boolean;
}

export interface FinancePayload {
  kind: "finance";
  name: string;
  email: string;
  phone: string;
  /** Free text: the car the customer typed. */
  vehicle?: string;
  vehicleSlug?: string;
  deposit?: number;
  monthlyBudget?: number;
  hasPartExchange: boolean;
}

export interface PartExchangePayload {
  kind: "part-exchange";
  name: string;
  email: string;
  phone: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  serviceHistory: string;
  motStatus: string;
  keys: string;
  condition: string;
  conditionNotes?: string;
  outstandingFinance: boolean;
  interestedIn?: string;
  vehicleSlug?: string;
}

export interface ContactPayload {
  kind: "contact";
  name: string;
  email: string;
  phone?: string;
  enquiryType: string;
  message: string;
}

export type EnquiryPayload = VehicleEnquiryPayload | FinancePayload | PartExchangePayload | ContactPayload;

// ---- Part-exchange valuation --------------------------------------------------------

export const VALUATION_STATUSES = [
  { value: "awaiting", label: "Awaiting valuation" },
  { value: "offered", label: "Offer made" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;

export type ValuationStatus = (typeof VALUATION_STATUSES)[number]["value"];

export interface Valuation {
  status: ValuationStatus;
  /** Whole pounds; the initial guide, subject to inspection. */
  amount: number | null;
  note?: string;
  /** ISO. */
  updatedAt: string;
}

// ---- The record ----------------------------------------------------------------------

/** The car an enquiry is about, resolved by the API from `vehicleSlug` (current or previous slug). */
export interface EnquiryVehicle {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  status: VehicleStatus;
  reserved: boolean;
  price: number | null;
  priceOnApplication: boolean;
  coverSrc: string | null;
}

export interface Enquiry {
  id: string;
  /** Quoted to the customer, e.g. SCM-8F2K4Q. */
  reference: string;
  kind: EnquiryKind;
  status: EnquiryStatus;
  closedReason: ClosedReason | null;
  name: string;
  email: string | null;
  phone: string | null;
  /** As submitted. May no longer match a car. */
  vehicleSlug: string | null;
  /** Null when there is no car, or the car it named no longer exists. */
  vehicle: EnquiryVehicle | null;
  customerId: string | null;
  /** Team member id. */
  handledBy: string | null;
  valuation: Valuation | null;
  payload: EnquiryPayload;
  /** ISO. */
  createdAt: string;
  updatedAt: string;
  /** When it first left `new`. Drives "waiting" times. */
  firstRepliedAt: string | null;
}

export const ACTIVITY_TYPES = ["created", "note", "status", "assigned", "valuation", "appointment"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface EnquiryActivity {
  id: string;
  type: ActivityType;
  /** Note text, or a sentence describing the change. */
  body: string;
  /** Null for events recorded by the website itself. */
  authorId: string | null;
  authorName: string;
  /** ISO. */
  createdAt: string;
}

// ---- Queries and mutations ------------------------------------------------------------

export const ENQUIRY_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

export type EnquirySort = (typeof ENQUIRY_SORTS)[number]["value"];

export interface EnquiryListQuery extends ListQuery<EnquirySort> {
  /** `open` = new, contacted and viewing arranged. Search matches name, email, phone, reference and car. */
  status?: EnquiryStatus | "open" | "all";
  kind?: EnquiryKind | "all";
  /** A team member id, or `unassigned`. */
  handledBy?: string | "unassigned" | "all";
  valuation?: ValuationStatus | "all";
  customerId?: string;
  vehicleId?: string;
}

export interface EnquiryCounts {
  byStatus: Record<EnquiryStatus, number>;
  open: number;
  total: number;
}

export interface UpdateEnquiryStatusInput {
  status: EnquiryStatus;
  /** Required when status is `not-proceeding`. */
  closedReason?: ClosedReason | null;
}

export interface ValuationInput {
  status: ValuationStatus;
  amount: number | null;
  note?: string;
}

export function enquiryStatusLabel(status: EnquiryStatus): string {
  return ENQUIRY_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function enquiryKindLabel(kind: EnquiryKind): string {
  return ENQUIRY_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

/** A one-line description of what the customer asked about. */
export function enquirySubject(enquiry: Pick<Enquiry, "payload" | "vehicle">): string {
  const { payload } = enquiry;
  switch (payload.kind) {
    case "vehicle-enquiry": {
      const type = REQUEST_TYPES.find((item) => item.value === payload.requestType)?.label ?? "Enquiry";
      return `${type} · ${enquiry.vehicle?.title ?? payload.vehicleTitle}`;
    }
    case "finance":
      return `Finance${payload.vehicle || enquiry.vehicle ? ` · ${enquiry.vehicle?.title ?? payload.vehicle}` : ""}`;
    case "part-exchange":
      return `Part exchange · ${payload.year} ${payload.make} ${payload.model}`;
    case "contact":
      return payload.enquiryType;
  }
}
