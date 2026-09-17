/**
 * The vehicle domain model — one shape for the public site, the admin and the
 * API.
 *
 * Two layers:
 *
 *  - `VehicleRecord` is what is stored and what the dashboard edits. A draft
 *    may be incomplete, so fields a buyer needs before a car can be listed are
 *    nullable here.
 *  - `PublicVehicle` is what the public site renders. It only exists for a
 *    record that has passed the publishing rules in `visibility.ts`, so every
 *    field a listing depends on is guaranteed present, and only the
 *    dealership's own media survives.
 *
 * Specification fields that are genuinely optional (engine, power, previous
 * owners…) stay optional in both layers. The UI renders a row only when the
 * value exists: a car whose insurance group we do not hold shows no insurance
 * row rather than a guess.
 *
 * Nothing here may be filled in from assumption. The client intake lists what
 * every listing should show; where the dealership has not supplied a value the
 * field stays empty.
 */

export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSIONS = ["Automatic", "Manual", "Semi-Automatic"] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const BODY_TYPES = [
  "Saloon",
  "Estate",
  "SUV",
  "Convertible",
  "Coupe",
  "Hatchback",
  "MPV",
] as const;
export type BodyType = (typeof BODY_TYPES)[number];

// ---- Lifecycle -------------------------------------------------------------

/**
 * Where a vehicle is in its life on the website.
 *
 *  - `draft`     being prepared; never public
 *  - `published` for sale on the website (subject to the publishing rules)
 *  - `sold`      sold; the page stays up marked SOLD (client intake), but the
 *                car leaves listings, filters, featured and related sections
 *  - `archived`  withdrawn; never public
 */
export const VEHICLE_STATUSES = ["draft", "published", "sold", "archived"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/**
 * History-check outcome for this specific car, as confirmed by the dealership
 * (checks are run through the Autotrader portal and are not downloadable).
 * `unknown` means nobody has confirmed it and the site says "ask us" — it never
 * implies either a clear or a failed check. Most cars are checked, not all.
 */
export const HPI_STATUSES = ["clear", "not-checked", "unknown"] as const;
export type HpiStatus = (typeof HPI_STATUSES)[number];

// ---- Media -----------------------------------------------------------------

/** What a photograph shows. The publishing gate counts dealer photographs by category. */
export const PHOTO_CATEGORIES = ["exterior", "interior", "detail", "documents"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

/** Where a piece of media came from. */
export type MediaProvenance =
  /** Taken by the dealership — the only kind that shows the actual car. */
  | "dealer"
  /**
   * A correctly-identified image of the same model from elsewhere. Kept for
   * reference only: library media never satisfies the publishing gate and is
   * never rendered on the public site.
   */
  | "library";

export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export interface VehicleImage {
  id: string;
  kind: "image";
  src: string;
  /** Intrinsic pixel size, recorded at upload so layout space is always reserved. */
  width: number;
  height: number;
  alt: string;
  category: PhotoCategory;
  provenance: MediaProvenance;
  credit?: ImageCredit;
}

export type VideoSource =
  /** A file held in media storage. */
  | { type: "file"; src: string; mimeType: string; width?: number; height?: number }
  /** An unlisted YouTube video, loaded only when the buyer presses play. */
  | { type: "youtube"; videoId: string }
  | { type: "vimeo"; videoId: string };

/** A walkaround video. The client wants a short one on every listing. */
export interface VehicleVideo {
  id: string;
  kind: "video";
  title: string;
  source: VideoSource;
  /** Still image shown before playback. */
  poster?: string;
  durationSeconds?: number;
  provenance: MediaProvenance;
}

/** An externally hosted 360° spin, linked rather than embedded. Optional. */
export interface VehicleSpin {
  id: string;
  kind: "spin";
  title: string;
  url: string;
  provenance: MediaProvenance;
}

export type VehicleMedia = VehicleImage | VehicleVideo | VehicleSpin;

// ---- History, warranty, finance ------------------------------------------------

export interface MotTestRecord {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  result: "pass" | "fail";
  mileage?: number;
  /** Advisories or failure items, as recorded on the test. */
  notes?: string;
}

/**
 * Warranty is sold separately through a third-party provider (client intake);
 * it is never included in the price. `available: null` means the dealership
 * has not said whether cover can be arranged on this car.
 */
export interface VehicleWarranty {
  available: boolean | null;
  /** Longest term offered on this car, in months, when the dealership states one. */
  termMonths?: number;
  notes?: string;
}

/**
 * A representative finance example for this car.
 *
 * A monthly figure is a financial promotion. It is shown only when every part
 * of the representative example is present AND the site-level finance
 * promotion switch is on (see `site.finance`), which requires approved FCA
 * status wording and a lender. The client has no lender panel yet, so no
 * example exists today.
 */
export interface RepresentativeFinanceExample {
  product: "HP" | "PCP";
  lender: string;
  monthlyPayment: number;
  termMonths: number;
  deposit: number;
  /** Representative APR, percent. */
  apr: number;
  /** Fixed annual interest rate, percent. */
  fixedRate: number;
  totalCredit: number;
  totalAmountPayable: number;
  /** PCP only. */
  optionalFinalPayment?: number;
}

// ---- The record ------------------------------------------------------------------

export interface VehicleRecord {
  id: string;
  /** URL segment, e.g. `mercedes-benz-sl63-amg-2016`. Unique. */
  slug: string;
  /**
   * Earlier URL segments for this car — legacy-site slugs and any slug the
   * dealership has since changed — so old links redirect instead of breaking.
   */
  previousSlugs: string[];

  status: VehicleStatus;
  /** Being held for a buyer. Only meaningful while published. */
  reserved: boolean;
  /** Hand-picked for the homepage. Nothing else is promoted there. */
  featured: boolean;

  // Identity
  /** Listing headline exactly as the dealership words it. */
  title: string;
  make: string;
  model: string;
  variant?: string;
  year: number | null;
  registration?: string;
  /** Date of first registration, YYYY-MM-DD. */
  registrationDate?: string;

  // Price
  /** Cash price in whole pounds. Null when not yet set, or when POA. */
  price: number | null;
  /** Price on application — requested by the client for rare classics. */
  priceOnApplication: boolean;
  /** Admin, documentation or delivery fee, when one applies to this car. */
  adminFee?: number;
  financeExample?: RepresentativeFinanceExample;

  // Specification
  mileage: number | null;
  fuel: FuelType | null;
  transmission: Transmission | null;
  bodyType: BodyType | null;
  /** Exterior colour as the dealership describes it. */
  colour: string;
  /** Engine as described, e.g. "5.5L Biturbo V8". */
  engine?: string;
  engineSizeCc?: number;
  power?: string;
  doors?: number;
  seats?: number;
  interior?: string;
  previousOwners?: number;
  insuranceGroup?: string;
  roadTaxBand?: string;

  // History and checks
  /** Service history summary, e.g. "Full Porsche service history". */
  serviceHistory?: string;
  /** YYYY-MM-DD. */
  motExpiry?: string;
  motHistory: MotTestRecord[];
  /** V5C and documentation summary, as the dealership states it. */
  documentation?: string;
  hpiStatus: HpiStatus;
  warranty: VehicleWarranty;
  /**
   * ULEZ status is never asserted from year and fuel — the Euro rating is what
   * counts. `null` means "ask us", which is what the vehicle page says.
   */
  ulezCompliant: boolean | null;

  // Content
  description: string;
  features: string[];

  // Media, in display order
  media: VehicleMedia[];
  /** Explicit cover photograph. Falls back to the first dealer exterior. */
  coverImageId?: string;

  // SEO overrides
  seoTitle?: string;
  seoDescription?: string;

  // Timestamps (ISO)
  createdAt: string;
  updatedAt: string;
  /** When the car first went on sale on the website. */
  listedAt?: string;
  soldAt?: string;
}

// ---- Public shape ------------------------------------------------------------------

/**
 * A record that has passed the publishing rules, with presentation fields
 * resolved. Only dealer media is present.
 */
export interface PublicVehicle
  extends Omit<
    VehicleRecord,
    "year" | "mileage" | "fuel" | "transmission" | "bodyType" | "media" | "status"
  > {
  status: "published" | "sold";
  year: number;
  mileage: number;
  fuel: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  /** Dealer photographs, cover first. Never empty. */
  images: VehicleImage[];
  cover: VehicleImage;
  videos: VehicleVideo[];
  spins: VehicleSpin[];
  isSold: boolean;
  isNewArrival: boolean;
}

// ---- Search, filter and sort -----------------------------------------------------

/** The default comes first so the select opens on it. */
export const SORT_OPTIONS = [
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "newest", label: "Latest arrivals" },
  { value: "year-desc", label: "Year: newest first" },
  { value: "mileage-asc", label: "Mileage: lowest first" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/**
 * The client's requested default ordering. Used by URL parsing, URL building,
 * the search itself and the sort control, so the default is never left in the
 * URL as `?sort=price-desc`.
 */
export const DEFAULT_SORT: SortOption = "price-desc";

/**
 * The client asked for stock to be filtered by make and model. The listing
 * deliberately offers nothing else, so it never feels hard to navigate.
 */
export interface VehicleQuery {
  make?: string[];
  model?: string[];
  sort?: SortOption;
}

export interface FacetValue {
  value: string;
  label: string;
  /** How many vehicles would remain if this value were selected. */
  count: number;
}

export interface VehicleFacets {
  make: FacetValue[];
  model: FacetValue[];
}
