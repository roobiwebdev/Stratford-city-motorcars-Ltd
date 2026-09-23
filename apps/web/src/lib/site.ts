/**
 * Single source of truth for the dealership's business facts.
 *
 * The client intake (September 2026) is authoritative. Values from the previous
 * website are kept only where the intake does not contradict them, and nothing
 * is invented. Where a fact is not confirmed it is marked `null` and the UI
 * omits it rather than guessing.
 *
 * The geo coordinates are the one deliberate correction: the previous site
 * published 51.5365 / 0.0040, which sits roughly 650m from the showroom. The
 * values below were resolved from the E15 4LJ postcode via postcodes.io and
 * cross-checked against OpenStreetMap.
 */

import type { BusinessDetails } from "@Stratford-city-motorcars-Ltd/core/settings";

// ---- Opening hours ----------------------------------------------------------
//
// Confirmed by the client: Monday to Friday 12–5pm; Saturday and Sunday by
// appointment only; bank holidays and closures, viewings by appointment;
// out-of-hours viewings arranged by WhatsApp or text. The business details
// below are the only place these facts are defined — every string and the
// structured data in `seo.ts` derive from them, so the header, footer, contact
// page and schema cannot disagree.
//
// The owner can change them from the admin's Settings screen; `getSite()` in
// `settings.ts` rebuilds this object from the stored values, falling back to
// the confirmed facts below whenever nothing is stored.

export const DEFAULT_BUSINESS: BusinessDetails = {
  name: "Stratford City Motorcars",
  phoneDisplay: "+44 7722 116355",
  phoneE164: "+447722116355",
  whatsappNumber: "447722116355",
  email: "stratfordcitymotorcars@gmail.com",
  street: "21–25 Romford Road",
  locality: "London",
  postcode: "E15 4LJ",
  parking: "Free parking on site.",
  hours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "12:00",
    closes: "17:00",
    weekendNote: "Appointment only",
    bankHolidayNote: "By appointment",
    outOfHoursNote: "To arrange a viewing outside these hours, message us on WhatsApp or send a text.",
  },
};

/** The dealership's facts, ready for the page. See `site` and `getSite()`. */
export type Site = ReturnType<typeof buildSite>;

/**
 * Builds the site facts from the business details. Everything derived — the
 * hours strings, the one-line address, the tel: link — is derived here once.
 */
export function buildSite(business: BusinessDetails = DEFAULT_BUSINESS) {
  const openDays = business.hours.days.length ? business.hours.days : DEFAULT_BUSINESS.hours.days;
  const firstDay = openDays[0]!;
  const lastDay = openDays[openDays.length - 1]!;
  /** 24-hour clock, as the showroom states its hours: "12:00–17:00". */
  const openTimes = `${business.hours.opens}–${business.hours.closes}`;
  const addressFull = `${business.street}, ${business.locality} ${business.postcode}`;

  return {
    /** Brand name as it is set in the logo ("MOTORCARS", one word). */
    name: business.name,
    /** Used where a longer, more formal reading suits the sentence. */
    longName: business.name,
    /**
     * The client's own positioning: "Small family owned business trading in
     * sports and luxury cars." Not a specialist in any one marque, not a dealer
     * group, and no commission or preparation promises the intake does not make.
     */
    tagline: "Sports and luxury cars from a small family-owned business in Stratford, East London",

    /**
     * Canonical origin. Override per environment with NEXT_PUBLIC_SITE_URL —
     * the client currently trades on the .com; their old markup referenced a
     * .co.uk that does not resolve.
     */
    url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.stratfordcitymotorcars.com").replace(/\/$/, ""),

    phone: {
      display: business.phoneDisplay,
      href: `tel:${business.phoneE164}`,
      e164: business.phoneE164,
    },

    whatsapp: {
      /** International format, no leading + or spaces — required by wa.me. */
      number: business.whatsappNumber,
      display: business.phoneDisplay,
    },

    email: business.email,

    /** Exactly as the client gave it: 21–25 Romford Road, London, E15 4LJ. */
    address: {
      street: business.street,
      locality: business.locality,
      postcode: business.postcode,
      country: "GB",
      /** Single-line form for links, map queries and schema. */
      full: addressFull,
      /** The area, for running copy ("in Stratford, East London"). */
      area: "Stratford, East London",
    },

    geo: {
      latitude: 51.542405,
      longitude: 0.005234,
    },

    hours: {
      /**
       * The regular opening hours — the only hours published as structured data.
       * Appointment-only times have no Schema.org equivalent and are not encoded.
       */
      open: { days: openDays, opens: business.hours.opens, closes: business.hours.closes },

      /** Rows for the footer and the showroom panel. */
      summary: [
        { label: `${firstDay} – ${lastDay}`, value: openTimes },
        { label: "Saturday – Sunday", value: business.hours.weekendNote },
        { label: "Bank holidays & closures", value: business.hours.bankHolidayNote },
      ],

      /** One line for tight spaces: header strip, mobile drawer, contact card. */
      compact: `${firstDay.slice(0, 3)}–${lastDay.slice(0, 3)} ${openTimes} · Weekends by appointment`,

      /** Weekday hours only, for the header strip where `compact` would wrap. */
      short: `${firstDay.slice(0, 3)}–${lastDay.slice(0, 3)} ${openTimes}`,

      /** Full sentence for metadata and running copy. */
      sentence: `We're open ${firstDay} to ${lastDay}, ${openTimes}. Weekends, bank holidays and closure days are by appointment.`,

      outOfHours: business.hours.outOfHoursNote,
    },

    parking: business.parking,

    /**
     * Written directions — the client asked for them alongside the map. The
     * sat-nav note records the client's own experience: E15 4LJ is the correct
     * postcode, but some sat navs stop short of or past the showroom.
     */
    directions: {
      satNav:
        "Use E15 4LJ. Some sat navs stop a little before or after us — look for numbers 21–25.",
      onFoot: "From Stratford station, walk to The Broadway and continue east onto Romford Road.",
      byCar: "Romford Road is the A118, off the A11 and A12. Free parking on site.",
    },

    transport: {
      rail: {
        label: "Stratford Station",
        detail: "Central line, Jubilee line, DLR, Elizabeth line and National Rail",
      },
      bus: {
        label: "Bus routes",
        detail: "25, 86, 238 and 276 all stop on Romford Road",
      },
    },

    /**
     * Confirmed by the client: warranties are not included in the price and are
     * sold separately through a third-party provider. The provider is not named,
     * and whether cover is offered on every car is unconfirmed — so the site says
     * neither.
     */
    warranty: {
      label: "Sold separately",
      statement:
        "Warranty is not included in the vehicle price. Third-party warranty cover is sold separately.",
    },

    /**
     * Legal entity. Company name, number, place of registration and registered
     * office must appear on a UK company's website. The number comes from the
     * client intake; the registered office was checked on the Companies House
     * register (15 September 2026) and is the showroom address the client
     * confirmed.
     */
    company: {
      legalName: "Stratford City Motorcars Ltd",
      number: "15481206",
      registeredIn: "England and Wales",
      registeredOffice: "21–25 Romford Road, London, E15 4LJ",
    },

    /**
     * Finance promotion switch.
     *
     * The site explains HP, PCP and personal loans (client-confirmed wording) but
     * makes no finance offer. A monthly figure or a finance calculator is a
     * financial promotion: it needs the firm's approved FCA status statement, a
     * lender and a full representative example. The client has no lender panel
     * yet and is still confirming whether it acts as a broker, lender or
     * introducer, so this stays off. Set `statusStatement` to the approved
     * wording (from the client's compliance adviser) to enable per-car monthly
     * figures — never write it here yourself.
     */
    finance: {
      statusStatement: null as string | null,
      /** FCA firm reference number from the intake. Shown only with the status statement. */
      firmReferenceNumber: "1042347",
    },

    /**
     * Online reservation switch. The client wants buyers to reserve a car with a
     * card deposit of £100–£500. That needs a payment provider, a confirmed
     * deposit amount and approved refund terms, none of which exist yet, so the
     * reserve panel is built but not rendered.
     */
    reservations: {
      enabled: false,
      depositGbp: null as number | null,
    },

    compliance: {
      partExchangeSubjectToInspection:
        "All valuations are an initial guide and are confirmed only after a physical inspection and document check.",
      /** Only if the business is VAT registered — not supplied. */
      vatNumber: null as string | null,
    },
  } as const;
}

/**
 * The confirmed facts, for metadata and anywhere a page cannot await storage.
 * Pages that show business details use `getSite()` instead, so the owner's
 * saved settings reach them.
 */
export const site = buildSite();

/** Google Maps deep links, built from the address rather than hardcoded URLs. */
export function mapLinksFor(address: string) {
  return {
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    embed: `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`,
  };
}

export const mapLinks = mapLinksFor(site.address.full);
