import type { PhotoCategory, VehicleImage, VehicleRecord, VehicleStatus } from "./vehicle";
import {
  LISTING_PHOTO_TARGET,
  REQUIRED_DEALER_PHOTOS,
  isPubliclyVisible,
  listingRecommendations,
  publicBlockers,
  publicationIssues,
  resolveCover,
  type ListingRecommendation,
  type PublicationIssue,
} from "./visibility";

/**
 * Stock as the admin works with it.
 *
 * `AdminVehicle` is the website's `VehicleRecord` plus the dealership-only
 * facts that never reach the public site: who a car is reserved for, and what
 * it sold for. Keep these off `VehicleRecord` — `PublicVehicle` is derived
 * from it, and a sale price must never be able to leak into a public page.
 *
 * BACKEND NOTE: the website's `vehicleRecordSchema` strips unknown keys, so
 * `reservation` and `sale` need their own storage (columns or a sibling
 * document), not extra keys on `vehicle.record`.
 */

export interface Reservation {
  /** A customer record when the buyer is known to the system. */
  customerId: string | null;
  customerName: string;
  /** ISO. */
  reservedAt: string;
  /** Deposits are taken offline today; this records what was agreed. */
  depositNote?: string;
  note?: string;
}

export interface SaleRecord {
  /** ISO. Mirrors `VehicleRecord.soldAt`. */
  soldAt: string;
  /**
   * Whole pounds. Null when not recorded — and always null in responses to a
   * role without `stock.salePrice`; the API removes it, the admin does not.
   */
  salePrice: number | null;
  customerId: string | null;
  customerName: string | null;
  /** The enquiry that led to the sale, when there was one. */
  enquiryId: string | null;
}

export interface AdminVehicle extends VehicleRecord {
  reservation: Reservation | null;
  sale: SaleRecord | null;
  /** Enquiries about this car that are not closed. Computed by the API. */
  openEnquiryCount: number;
}

export const VEHICLE_STATUS_LABELS = [
  { value: "draft", label: "Draft", note: "Being prepared. Never on the website." },
  { value: "published", label: "For sale", note: "On the website, if every publishing rule is met." },
  { value: "sold", label: "Sold", note: "Page stays up marked SOLD; removed from listings." },
  { value: "archived", label: "Archived", note: "Withdrawn. Never on the website." },
] as const satisfies readonly { value: VehicleStatus; label: string; note: string }[];

export function vehicleStatusLabel(status: VehicleStatus): string {
  return VEHICLE_STATUS_LABELS.find((item) => item.value === status)?.label ?? status;
}

/** How close a listing is to publishable, and to the client's finished standard. */
export interface ListingProgress {
  dealerPhotos: number;
  byCategory: Record<PhotoCategory, number>;
  libraryItems: number;
  hasVideo: boolean;
  target: number;
  /** Everything stopping publication, whatever the status. */
  issues: PublicationIssue[];
  /** Everything keeping it off the site right now, including status. */
  blockers: PublicationIssue[];
  recommendations: ListingRecommendation[];
  /** On the public site at this moment. */
  live: boolean;
  /** Marked for sale but held back by a rule. */
  withheld: boolean;
  cover: VehicleImage | undefined;
}

export function listingProgress(record: VehicleRecord): ListingProgress {
  const dealer = record.media.filter(
    (item): item is VehicleImage => item.kind === "image" && item.provenance === "dealer",
  );
  const byCategory: Record<PhotoCategory, number> = { exterior: 0, interior: 0, detail: 0, documents: 0 };
  for (const image of dealer) byCategory[image.category] += 1;

  const live = isPubliclyVisible(record);
  return {
    dealerPhotos: dealer.length,
    byCategory,
    libraryItems: record.media.filter((item) => item.provenance === "library").length,
    hasVideo: record.media.some((item) => item.kind === "video" && item.provenance === "dealer"),
    target: LISTING_PHOTO_TARGET,
    issues: publicationIssues(record),
    blockers: publicBlockers(record),
    recommendations: listingRecommendations(record),
    live,
    withheld: (record.status === "published" || record.status === "sold") && !live,
    cover: resolveCover(dealer, record.coverImageId),
  };
}

export { REQUIRED_DEALER_PHOTOS };

// ---- Queries and mutations -------------------------------------------------------

export const STOCK_SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "year-desc", label: "Year: newest first" },
  { value: "title", label: "Name A–Z" },
] as const;

export type StockSort = (typeof STOCK_SORTS)[number]["value"];

/** What a save returns: the stored record and where it now stands. */
export interface SaveVehicleResult {
  vehicle: AdminVehicle;
  issues: PublicationIssue[];
  recommendations: ListingRecommendation[];
}

export interface ReserveInput {
  customerId: string | null;
  customerName: string;
  depositNote?: string;
  note?: string;
}

export interface MarkSoldInput {
  /** YYYY-MM-DD. */
  soldOn: string;
  salePrice: number | null;
  customerId: string | null;
  customerName: string | null;
  enquiryId: string | null;
}

/** Every write to a record carries the `updatedAt` it was read at. */
export interface Versioned {
  expectedUpdatedAt: string;
}
