/**
 * Business settings.
 *
 * Today these facts are code in apps/web/src/lib/site.ts. Editing them from
 * the admin needs them stored, and the website reading them from storage.
 *
 * Compliance switches are deliberately read-only here. Finance promotions
 * need the firm's approved FCA status wording and a lender; reservations need
 * a payment provider, a deposit amount and approved refund terms. Those are
 * set by a developer once the client supplies them, never from a form.
 */

export interface OpeningHours {
  /** e.g. ["Monday", …, "Friday"]. */
  days: string[];
  /** 24-hour "HH:MM". */
  opens: string;
  closes: string;
  weekendNote: string;
  bankHolidayNote: string;
  outOfHoursNote: string;
}

export interface BusinessDetails {
  name: string;
  phoneDisplay: string;
  /** E.164, e.g. +447700900123. */
  phoneE164: string;
  /** International digits, no +, as wa.me needs. */
  whatsappNumber: string;
  email: string;
  street: string;
  locality: string;
  postcode: string;
  parking: string;
  hours: OpeningHours;
}

export interface IntegrationStatus {
  /** Whether stock and enquiries are stored. Without it the website is read-only. */
  storage: "connected" | "not-connected";
  /** Who is told about a new enquiry. Empty means nobody is. */
  notifications: { channel: "webhook" | "email" | "sms"; configured: boolean }[];
  media: "local-disk" | "object-storage";
}

export interface ComplianceSwitch {
  enabled: boolean;
  /** Plain-English reason it is on or off. */
  detail: string;
}

export interface ComplianceStatus {
  financePromotions: ComplianceSwitch;
  reservations: ComplianceSwitch & { depositGbp: number | null };
  vatNumber: string | null;
  companyNumber: string;
}

export interface Settings {
  business: BusinessDetails;
  integrations: IntegrationStatus;
  compliance: ComplianceStatus;
  updatedAt: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Whether a local date and time falls in the regular opening hours. Used to
 * warn — never to block — when arranging a viewing: weekends and evenings are
 * by appointment, which is allowed.
 */
export function isWithinOpeningHours(date: Date, hours: Pick<OpeningHours, "days" | "opens" | "closes">): boolean {
  if (!hours.days.includes(DAY_NAMES[date.getDay()]!)) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const toMinutes = (value: string) => {
    const [h = "0", m = "0"] = value.split(":");
    return Number(h) * 60 + Number(m);
  };
  return minutes >= toMinutes(hours.opens) && minutes < toMinutes(hours.closes);
}
