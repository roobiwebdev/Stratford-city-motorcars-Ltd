const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-GB");

/** £40,000 — dealership prices are always whole pounds. */
export function formatPrice(value: number): string {
  return gbp.format(value);
}

/** "£40,000", or "POA" for a car whose price is on application. */
export function formatVehiclePrice(vehicle: { price: number | null; priceOnApplication: boolean }): string {
  if (vehicle.priceOnApplication || vehicle.price === null) return "POA";
  return formatPrice(vehicle.price);
}

/** 38,000 miles */
export function formatMileage(value: number): string {
  return `${decimal.format(value)} miles`;
}

/** Compact form for dense spec strips: 38,000 mi */
export function formatMileageShort(value: number): string {
  return `${decimal.format(value)} mi`;
}

export function formatNumber(value: number): string {
  return decimal.format(value);
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Dates are stored as calendar dates (YYYY-MM-DD) or UTC instants; formatting
  // in UTC stops a date shifting by a day on servers in other time zones.
  timeZone: "UTC",
});

/** "14 March 2027" from "2027-03-14" or an ISO timestamp. */
export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** "March 2016" — used for first registration, where the day adds nothing. */
export function formatMonthYear(iso: string): string {
  return monthYear.format(new Date(iso));
}

/** "5,461cc" */
export function formatEngineSize(cc: number): string {
  return `${decimal.format(cc)}cc`;
}

/** "Rolls-Royce Dawn" → "rolls-royce-dawn" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
