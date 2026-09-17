import type {
  PhotoCategory,
  PublicVehicle,
  VehicleImage,
  VehicleRecord,
  VehicleSpin,
  VehicleVideo,
} from "./vehicle";

/**
 * Publishing rules: what decides whether a vehicle may appear on the public
 * site, what the dashboard tells the dealership is missing, and which cars the
 * homepage features.
 *
 * `status: "published"` is the dealership's intent to list a car. It is
 * necessary but not sufficient — the car must also pass every blocking check
 * below, so switching one setting on an unfinished record can never put it in
 * front of buyers. The repository applies `toPublicVehicle()` to everything it
 * reads, so listings, pages, facets, static params, featured and related cars
 * and the sitemap all inherit these rules.
 *
 * Only type imports here, so `apps/web/scripts/check-inventory.mjs` can load
 * this file (through the web app's re-export) with Node's TypeScript type
 * stripping. Keep it that way: a runtime import breaks that check.
 */

/**
 * The client's stock range (intake: "From £20,000 to £1,000,000"), inclusive.
 * A price outside it is treated as a data error, not a listing. This is also
 * what keeps the previous site's £12,000 ML63 AMG and £16,000 Jaguar XF off the
 * site. POA cars have no price and are exempt.
 */
export const PUBLIC_PRICE_RANGE = { min: 20_000, max: 1_000_000 } as const;

/**
 * Minimum dealer photography before a car can be published. The client wants
 * cars hidden until they are properly photographed, interiors always. Library
 * stand-ins never count.
 */
export const REQUIRED_DEALER_PHOTOS: Readonly<Partial<Record<PhotoCategory, number>>> = {
  exterior: 1,
  interior: 1,
};

/**
 * The finished-listing standard the client asked for ("20+ — everything
 * including detail shots"). A recommendation shown in the dashboard, not a
 * publishing requirement.
 */
export const LISTING_PHOTO_TARGET = 20;

/** A listing counts as a new arrival for this many days after it goes on sale. */
export const NEW_ARRIVAL_DAYS = 30;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export type PublicationIssueCode =
  | "not-published"
  | "invalid-slug"
  | "missing-title"
  | "missing-make"
  | "missing-model"
  | "missing-year"
  | "missing-mileage"
  | "missing-fuel"
  | "missing-transmission"
  | "missing-body-type"
  | "missing-colour"
  | "missing-description"
  | "missing-price"
  | "price-out-of-range"
  | `missing-${PhotoCategory}-photography`;

export interface PublicationIssue {
  code: PublicationIssueCode;
  /** The editor section the dealership should go to. */
  section: "identity" | "price" | "specification" | "description" | "media" | "visibility";
  /** Written for the dealership, not a developer. */
  message: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length <= 120;
}

function dealerImages(record: VehicleRecord): VehicleImage[] {
  return record.media.filter(
    (item): item is VehicleImage => item.kind === "image" && item.provenance === "dealer",
  );
}

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  exterior: "exterior",
  interior: "interior",
  detail: "detail",
  documents: "documents",
};

/**
 * Everything that stops this record being published, regardless of its current
 * status. An empty list means it is ready to publish.
 */
export function publicationIssues(record: VehicleRecord): PublicationIssue[] {
  const issues: PublicationIssue[] = [];
  const add = (code: PublicationIssueCode, section: PublicationIssue["section"], message: string) =>
    issues.push({ code, section, message });

  if (!isValidSlug(record.slug)) {
    add(
      "invalid-slug",
      "visibility",
      "The web address can only use lowercase letters, numbers and hyphens.",
    );
  }

  if (!record.title.trim()) add("missing-title", "identity", "Add a listing title.");
  if (!record.make.trim()) add("missing-make", "identity", "Add the make.");
  if (!record.model.trim()) add("missing-model", "identity", "Add the model.");

  const maxYear = new Date().getFullYear() + 1;
  if (record.year === null || !Number.isInteger(record.year) || record.year < 1900 || record.year > maxYear) {
    add("missing-year", "identity", "Add the year the car was made.");
  }

  if (record.mileage === null || !Number.isFinite(record.mileage) || record.mileage < 0) {
    add("missing-mileage", "specification", "Add the mileage.");
  }
  if (!record.fuel) add("missing-fuel", "specification", "Choose the fuel type.");
  if (!record.transmission) add("missing-transmission", "specification", "Choose the gearbox.");
  if (!record.bodyType) add("missing-body-type", "specification", "Choose the body style.");
  if (!record.colour.trim()) add("missing-colour", "specification", "Add the colour.");

  if (!record.description.trim()) {
    add("missing-description", "description", "Write a description of the car.");
  }

  if (!record.priceOnApplication) {
    if (record.price === null || !Number.isFinite(record.price)) {
      add("missing-price", "price", "Add the cash price, or mark the car as POA.");
    } else if (record.price < PUBLIC_PRICE_RANGE.min || record.price > PUBLIC_PRICE_RANGE.max) {
      add(
        "price-out-of-range",
        "price",
        `The price must be between ${gbp.format(PUBLIC_PRICE_RANGE.min)} and ${gbp.format(PUBLIC_PRICE_RANGE.max)}. ` +
          `${gbp.format(record.price)} is outside the range the website lists.`,
      );
    }
  }

  const photos = dealerImages(record);
  for (const [category, minimum] of Object.entries(REQUIRED_DEALER_PHOTOS) as [PhotoCategory, number][]) {
    const count = photos.filter((image) => image.category === category).length;
    if (count < minimum) {
      add(
        `missing-${category}-photography`,
        "media",
        `Add at least ${minimum} ${CATEGORY_LABEL[category]} photograph${minimum === 1 ? "" : "s"} taken by you.`,
      );
    }
  }

  return issues;
}

/** Every reason this record is not on the public site right now. Empty means it is. */
export function publicBlockers(record: VehicleRecord): PublicationIssue[] {
  const blockers = publicationIssues(record);
  if (record.status !== "published" && record.status !== "sold") {
    blockers.unshift({
      code: "not-published",
      section: "visibility",
      message:
        record.status === "archived"
          ? "This car is archived."
          : "This car is a draft. Publish it to put it on the website.",
    });
  }
  return blockers;
}

export function isPubliclyVisible(record: VehicleRecord): boolean {
  return publicBlockers(record).length === 0;
}

export interface ListingRecommendation {
  section: PublicationIssue["section"] | "history";
  message: string;
}

/**
 * Non-blocking gaps between a publishable listing and the finished standard the
 * client described. Shown in the dashboard as a checklist.
 */
export function listingRecommendations(record: VehicleRecord): ListingRecommendation[] {
  const tips: ListingRecommendation[] = [];
  const photos = dealerImages(record);

  if (photos.length < LISTING_PHOTO_TARGET) {
    tips.push({
      section: "media",
      message: `${photos.length} of ${LISTING_PHOTO_TARGET}+ photographs. Aim for everything, including detail shots.`,
    });
  }
  const missingAlt = photos.filter((image) => !image.alt.trim()).length;
  if (missingAlt) {
    tips.push({
      section: "media",
      message: `${missingAlt} photograph${missingAlt === 1 ? " has" : "s have"} no description. Describe the car and the angle for screen readers and Google Images.`,
    });
  }
  if (!photos.some((image) => image.category === "detail")) {
    tips.push({ section: "media", message: "No detail shots yet (badges, wheels, stitching, dials)." });
  }
  if (!record.media.some((item) => item.kind === "video" && item.provenance === "dealer")) {
    tips.push({ section: "media", message: "No walkaround video yet." });
  }
  if (!record.registrationDate) tips.push({ section: "identity", message: "Registration date is missing." });
  if (record.previousOwners === undefined) {
    tips.push({ section: "specification", message: "Number of previous owners is missing." });
  }
  if (!record.serviceHistory) tips.push({ section: "history", message: "Service history summary is missing." });
  if (!record.motExpiry) tips.push({ section: "history", message: "MOT expiry date is missing." });
  if (record.hpiStatus === "unknown") {
    tips.push({ section: "history", message: "History check status is not set — the page will say “ask us”." });
  }
  if (record.warranty.available === null) {
    tips.push({ section: "history", message: "Warranty availability is not set." });
  }
  if (!record.insuranceGroup) tips.push({ section: "specification", message: "Insurance group is missing." });
  if (!record.roadTaxBand) tips.push({ section: "specification", message: "Road tax band is missing." });

  return tips;
}

/** The cover photograph: the explicit choice if valid, else the first dealer exterior. */
export function resolveCover(images: VehicleImage[], coverImageId?: string): VehicleImage | undefined {
  return (
    images.find((image) => image.id === coverImageId) ??
    images.find((image) => image.category === "exterior") ??
    images[0]
  );
}

/**
 * The public view of a record, or `null` if it must not be shown. This is the
 * only way a record reaches the public site.
 */
export function toPublicVehicle(record: VehicleRecord, now: number = Date.now()): PublicVehicle | null {
  if (!isPubliclyVisible(record)) return null;

  const name = [record.year, record.title].filter(Boolean).join(" ");
  // Every public photograph needs meaningful alt text; if the dealership left
  // it blank, describe the car and what the photograph shows.
  const photos = dealerImages(record).map((image) =>
    image.alt.trim() ? image : { ...image, alt: `${name}, ${CATEGORY_LABEL[image.category]} photograph` },
  );
  const cover = resolveCover(photos, record.coverImageId);
  if (!cover) return null;

  const { media: _media, ...rest } = record;
  const listed = record.listedAt ? new Date(record.listedAt).getTime() : Number.NaN;
  const isSold = record.status === "sold";

  return {
    ...rest,
    status: isSold ? "sold" : "published",
    // Narrowed by publicationIssues().
    year: record.year as number,
    mileage: record.mileage as number,
    fuel: record.fuel!,
    transmission: record.transmission!,
    bodyType: record.bodyType!,
    images: [cover, ...photos.filter((image) => image.id !== cover.id)],
    cover,
    videos: record.media.filter(
      (item): item is VehicleVideo => item.kind === "video" && item.provenance === "dealer",
    ),
    spins: record.media.filter(
      (item): item is VehicleSpin => item.kind === "spin" && item.provenance === "dealer",
    ),
    isSold,
    isNewArrival:
      !isSold && !record.reserved && Number.isFinite(listed) && now - listed < NEW_ARRIVAL_DAYS * 86_400_000,
  };
}

/**
 * The homepage shows only cars the dealership has hand-picked, never other
 * stock to fill the grid. Fewer than `limit`, or none, is a valid result.
 * Sold cars are not featured.
 */
export function selectFeatured<T extends Pick<PublicVehicle, "featured" | "isSold">>(
  vehicles: T[],
  limit: number,
): T[] {
  return vehicles.filter((vehicle) => vehicle.featured && !vehicle.isSold).slice(0, limit);
}
