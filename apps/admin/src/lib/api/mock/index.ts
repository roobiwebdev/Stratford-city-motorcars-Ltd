import {
  ConflictError,
  DEFAULT_PAGE_SIZE,
  ForbiddenError,
  NotFoundError,
  OPEN_ENQUIRY_STATUSES,
  UnauthorisedError,
  ValidationError,
  can,
  deniedReason,
  enquiryStatusLabel,
  isOpenEnquiry,
  isValidSlug,
  listingProgress,
  publicationIssues,
  listingRecommendations,
  type AdminApi,
  type AdminVehicle,
  type Appointment,
  type AppointmentInput,
  type Capability,
  type Customer,
  type Enquiry,
  type EnquiryActivity,
  type EnquiryCounts,
  type EnquiryListQuery,
  type EnquiryStatus,
  type Overview,
  type OverviewListing,
  type Page,
  type SaveVehicleResult,
  type SessionUser,
  type TeamMember,
  type VehicleImage,
  type VehicleRecord,
} from "@Stratford-city-motorcars-Ltd/core";

import { SAMPLE_PASSWORD, type MockDb } from "./fixtures";
import { getControls, getDb, getSessionUserId, persist, setControls, setSessionUserId } from "./store";

/**
 * ============================================================================
 * SAMPLE API — in the browser, for building and reviewing the admin.
 * ============================================================================
 *
 * Implements `AdminApi` against the sample data in `fixtures.ts`. It behaves
 * the way the real API is specified to (docs/STRATFORD_ADMIN_CONTRACT.md) —
 * sessions, role checks, version conflicts, publishing rules, validation —
 * so every state the admin draws can be seen and tested before the backend
 * exists. It stores nothing outside this browser tab and sends nothing.
 */

const MINUTE = 60_000;
const DAY = 86_400_000;

async function delay() {
  const { latency } = getControls();
  const ms = latency === "slow" ? 1500 + Math.random() * 1000 : 180 + Math.random() * 320;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail() {
  const controls = getControls();
  if (controls.failures === "off") return;
  if (controls.failures === "next") setControls({ failures: "off" });
  throw new Error("Could not reach the server. Check your connection and try again. (Simulated failure)");
}

/** Every mock call: wait, maybe fail, then run with the database. */
async function call<T>(run: (db: MockDb) => T): Promise<T> {
  await delay();
  maybeFail();
  const db = getDb();
  const result = run(db);
  persist();
  // Hand back copies so screens cannot mutate the "server".
  return result === undefined ? result : structuredClone(result);
}

// ---- Session and permissions ------------------------------------------------------------

function sessionUser(db: MockDb): SessionUser {
  const id = getSessionUserId();
  const member = db.team.find((person) => person.id === id && person.status === "active");
  if (!member) throw new UnauthorisedError();
  return { id: member.id, name: member.name, email: member.email, role: member.role };
}

function requireCapability(db: MockDb, capability: Capability): SessionUser {
  const user = sessionUser(db);
  if (!can(user.role, capability)) throw new ForbiddenError(deniedReason(capability), capability);
  return user;
}

/** A timestamp strictly after `previous`, so two quick saves never share a version. */
function stamp(previous?: string): string {
  const now = Date.now();
  const last = previous ? new Date(previous).getTime() : 0;
  return new Date(Math.max(now, last + 1)).toISOString();
}

function checkVersion(record: { updatedAt: string }, expected: string) {
  if (record.updatedAt !== expected) throw new ConflictError(undefined, record.updatedAt);
}

// ---- Stock ----------------------------------------------------------------------------------

type StoredVehicle = MockDb["vehicles"][number];

function findVehicle(db: MockDb, id: string): StoredVehicle {
  const vehicle = db.vehicles.find((item) => item.id === id);
  if (!vehicle) throw new NotFoundError("This car could not be found. It may have been removed.");
  return vehicle;
}

function vehicleBySlug(db: MockDb, slug: string | null | undefined): StoredVehicle | undefined {
  if (!slug) return undefined;
  return db.vehicles.find((item) => item.slug === slug) ?? db.vehicles.find((item) => item.previousSlugs.includes(slug));
}

function toAdminVehicle(db: MockDb, vehicle: StoredVehicle, user: SessionUser): AdminVehicle {
  const openEnquiryCount = db.enquiries.filter(
    (item) => isOpenEnquiry(item.status) && vehicleBySlug(db, item.vehicleSlug)?.id === vehicle.id,
  ).length;
  const sale =
    vehicle.sale && !can(user.role, "stock.salePrice") ? { ...vehicle.sale, salePrice: null } : vehicle.sale;
  return { ...vehicle, sale, openEnquiryCount };
}

function saveResult(db: MockDb, vehicle: StoredVehicle, user: SessionUser): SaveVehicleResult {
  return {
    vehicle: toAdminVehicle(db, vehicle, user),
    issues: publicationIssues(vehicle),
    recommendations: listingRecommendations(vehicle),
  };
}

function coverSrc(vehicle: StoredVehicle): string | null {
  return listingProgress(vehicle).cover?.src ?? null;
}

const TEXT_LIMITS: [keyof VehicleRecord, number, string][] = [
  ["title", 160, "Keep the title under 160 characters."],
  ["make", 60, "Keep the make under 60 characters."],
  ["model", 80, "Keep the model under 80 characters."],
  ["colour", 80, "Keep the colour under 80 characters."],
  ["description", 6000, "Keep the description under 6,000 characters."],
];

/** The structural checks the API runs on every save — not the publishing rules. */
function validateRecord(db: MockDb, record: VehicleRecord) {
  const fields: Record<string, string> = {};
  if (!isValidSlug(record.slug)) fields.slug = "Use lowercase letters, numbers and single hyphens only.";
  else if (db.vehicles.some((item) => item.id !== record.id && (item.slug === record.slug || item.previousSlugs.includes(record.slug)))) {
    fields.slug = "Another car already uses (or used) this web address.";
  }
  for (const [key, max, message] of TEXT_LIMITS) {
    const value = record[key];
    if (typeof value === "string" && value.length > max) fields[key] = message;
  }
  const maxYear = new Date().getFullYear() + 1;
  if (record.year !== null && (record.year < 1886 || record.year > maxYear)) fields.year = `Enter a year between 1886 and ${maxYear}.`;
  if (record.price !== null && (record.price < 0 || record.price > 100_000_000)) fields.price = "Enter a price in whole pounds.";
  if (record.mileage !== null && (record.mileage < 0 || record.mileage > 2_000_000)) fields.mileage = "Enter the mileage in whole miles.";
  if (record.seoTitle && record.seoTitle.length > 70) fields.seoTitle = "Search titles are cut off after about 70 characters.";
  if (record.seoDescription && record.seoDescription.length > 170) fields.seoDescription = "Search descriptions are cut off after about 170 characters.";
  if (record.features.some((feature) => feature.length > 80)) fields.features = "Keep each feature under 80 characters.";
  for (const item of record.media) {
    if (item.kind === "spin" && !/^https:\/\//.test(item.url)) fields[`media.${item.id}`] = "360° links must start with https://";
  }
  if (Object.keys(fields).length) throw new ValidationError(fields);
}

// ---- Enquiries ------------------------------------------------------------------------------

type StoredEnquiry = MockDb["enquiries"][number];

function findEnquiry(db: MockDb, id: string): StoredEnquiry {
  const enquiry = db.enquiries.find((item) => item.id === id);
  if (!enquiry) throw new NotFoundError("This enquiry could not be found. It may have been deleted.");
  return enquiry;
}

function toEnquiry(db: MockDb, enquiry: StoredEnquiry): Enquiry {
  const vehicle = vehicleBySlug(db, enquiry.vehicleSlug);
  return {
    ...enquiry,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          slug: vehicle.slug,
          title: vehicle.title,
          year: vehicle.year,
          status: vehicle.status,
          reserved: vehicle.reserved,
          price: vehicle.price,
          priceOnApplication: vehicle.priceOnApplication,
          coverSrc: coverSrc(vehicle),
        }
      : null,
  };
}

function log(db: MockDb, enquiryId: string, user: SessionUser | null, type: EnquiryActivity["type"], body: string): EnquiryActivity {
  const entry: EnquiryActivity = {
    id: `a-${crypto.randomUUID()}`,
    type,
    body,
    authorId: user?.id ?? null,
    authorName: user?.name ?? "Website",
    createdAt: new Date().toISOString(),
  };
  (db.activity[enquiryId] ??= []).push(entry);
  return entry;
}

function matches(needle: string, ...values: (string | null | undefined)[]) {
  const query = needle.trim().toLowerCase();
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  return values.some((value) => {
    if (!value) return false;
    if (value.toLowerCase().includes(query)) return true;
    return digits.length >= 4 && value.replace(/\D/g, "").includes(digits);
  });
}

function paginate<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const safePage = Math.max(1, page);
  return { items: items.slice((safePage - 1) * pageSize, safePage * pageSize), total: items.length, page: safePage, pageSize };
}

function filterEnquiries(db: MockDb, query: Omit<EnquiryListQuery, "status"> & { status?: EnquiryListQuery["status"] }) {
  return db.enquiries
    .map((item) => toEnquiry(db, item))
    .filter((item) => {
      if (query.status === "open" && !isOpenEnquiry(item.status)) return false;
      if (query.status && query.status !== "open" && query.status !== "all" && item.status !== query.status) return false;
      if (query.kind && query.kind !== "all" && item.kind !== query.kind) return false;
      if (query.handledBy === "unassigned" && item.handledBy) return false;
      if (query.handledBy && query.handledBy !== "all" && query.handledBy !== "unassigned" && item.handledBy !== query.handledBy) return false;
      if (query.valuation && query.valuation !== "all" && item.valuation?.status !== query.valuation) return false;
      if (query.customerId && item.customerId !== query.customerId) return false;
      if (query.vehicleId && item.vehicle?.id !== query.vehicleId) return false;
      const payloadText = item.payload.kind === "part-exchange" ? `${item.payload.registration} ${item.payload.make} ${item.payload.model}` : "";
      return matches(query.search ?? "", item.name, item.email, item.phone, item.reference, item.vehicle?.title, payloadText);
    });
}

function counts(items: Enquiry[]): EnquiryCounts {
  const byStatus = { new: 0, contacted: 0, "viewing-arranged": 0, sold: 0, "not-proceeding": 0 } satisfies Record<EnquiryStatus, number>;
  for (const item of items) byStatus[item.status] += 1;
  return { byStatus, open: OPEN_ENQUIRY_STATUSES.reduce((sum, status) => sum + byStatus[status], 0), total: items.length };
}

// ---- Appointments and customers ---------------------------------------------------------------

type StoredAppointment = MockDb["appointments"][number];

function toAppointment(db: MockDb, appointment: StoredAppointment): Appointment {
  const vehicle = db.vehicles.find((item) => item.id === appointment.vehicleId);
  const enquiry = db.enquiries.find((item) => item.id === appointment.enquiryId);
  return {
    ...appointment,
    vehicleTitle: vehicle ? [vehicle.year, vehicle.title].filter(Boolean).join(" ") : null,
    enquiryReference: enquiry?.reference ?? null,
  };
}

function validateAppointment(db: MockDb, input: AppointmentInput) {
  const fields: Record<string, string> = {};
  if (!input.customerName.trim()) fields.customerName = "Add the customer's name.";
  if (Number.isNaN(new Date(input.startsAt).getTime())) fields.startsAt = "Choose a date and time.";
  if (!input.vehicleId) fields.vehicleId = "Choose the car.";
  else if (!db.vehicles.some((item) => item.id === input.vehicleId)) fields.vehicleId = "That car no longer exists.";
  if (input.customerPhone && input.customerPhone.replace(/\D/g, "").length < 10) fields.customerPhone = "Enter a valid UK phone number.";
  if (input.notes.length > 2000) fields.notes = "Keep notes under 2,000 characters.";
  if (Object.keys(fields).length) throw new ValidationError(fields);
}

function toCustomer(db: MockDb, customer: MockDb["customers"][number]): Customer {
  const enquiries = db.enquiries.filter((item) => item.customerId === customer.id);
  const appointments = db.appointments.filter((item) => item.customerId === customer.id);
  const purchases = db.vehicles.filter((item) => item.sale?.customerId === customer.id);
  const times = [
    customer.updatedAt,
    ...enquiries.map((item) => item.updatedAt),
    ...appointments.map((item) => item.startsAt).filter((iso) => new Date(iso).getTime() <= Date.now()),
    ...purchases.map((item) => item.sale!.soldAt),
  ];
  return {
    ...customer,
    enquiryCount: enquiries.length,
    openEnquiryCount: enquiries.filter((item) => isOpenEnquiry(item.status)).length,
    appointmentCount: appointments.length,
    purchaseCount: purchases.length,
    lastActivityAt: times.sort().at(-1) ?? customer.createdAt,
  };
}

// ---- Photographs ---------------------------------------------------------------------------

const MIN_WIDTH = 1200;
const MIN_HEIGHT = 800;

/**
 * Stands in for the API's image processing: checks the real size, then keeps
 * a reduced copy in the browser so the sample stays within storage limits.
 */
async function processImage(file: File, onProgress?: (fraction: number) => void): Promise<{ src: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ValidationError({ file: `“${file.name}” could not be read as an image.` }));
      element.src = url;
    });
    const { naturalWidth: width, naturalHeight: height } = image;
    const landscape = width >= height;
    const shortSide = landscape ? height : width;
    const longSide = landscape ? width : height;
    if (longSide < MIN_WIDTH || shortSide < MIN_HEIGHT) {
      throw new ValidationError(
        { file: `“${file.name}” is ${width}×${height}. Photographs need to be at least ${MIN_WIDTH}×${MIN_HEIGHT} to look sharp on the website.` },
        "This photograph is too small.",
      );
    }
    for (const step of [0.2, 0.45, 0.7, 0.9]) {
      await new Promise((resolve) => setTimeout(resolve, 140));
      onProgress?.(step);
    }
    const scale = Math.min(1, 960 / longSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    onProgress?.(1);
    return { src: canvas.toDataURL("image/jpeg", 0.72), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- The API ----------------------------------------------------------------------------------

export function createMockApi(): AdminApi {
  return {
    session: {
      get: () =>
        call((db) => {
          try {
            return sessionUser(db);
          } catch {
            return null;
          }
        }),
      signIn: ({ email, password }) =>
        call((db) => {
          const member = db.team.find((person) => person.email.toLowerCase() === email.trim().toLowerCase());
          // One message for a wrong address and a wrong password.
          if (!member || password !== SAMPLE_PASSWORD) {
            throw new ValidationError({}, "That email address and password do not match an account.");
          }
          if (member.status !== "active") {
            throw new ValidationError({}, "That email address and password do not match an account.");
          }
          member.lastActiveAt = new Date().toISOString();
          setSessionUserId(member.id);
          return { id: member.id, name: member.name, email: member.email, role: member.role };
        }),
      signOut: () =>
        call(() => {
          setSessionUserId(null);
        }),
    },

    overview: {
      get: () =>
        call((db): Overview => {
          sessionUser(db);
          const now = Date.now();
          const progress = db.vehicles.map((vehicle) => ({ vehicle, progress: listingProgress(vehicle) }));
          const listing = ({ vehicle, progress: p }: (typeof progress)[number]): OverviewListing => ({
            id: vehicle.id,
            title: vehicle.title,
            year: vehicle.year,
            status: vehicle.status,
            coverSrc: p.cover?.src ?? null,
            dealerPhotos: p.dealerPhotos,
            hasVideo: p.hasVideo,
            issues: p.issues,
            recommendationCount: p.recommendations.length,
          });

          const live = progress.filter((item) => item.vehicle.status === "published" && item.progress.live);
          const drafts = progress.filter((item) => item.vehicle.status === "draft");
          const priced = live.filter((item) => !item.vehicle.priceOnApplication && item.vehicle.price !== null);

          const enquiries = db.enquiries.map((item) => toEnquiry(db, item));
          const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(now));
          const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));
          const active = db.appointments
            .filter((item) => item.status === "requested" || item.status === "confirmed")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((item) => toAppointment(db, item));

          return {
            generatedAt: new Date(now).toISOString(),
            stock: {
              live: live.length,
              drafts: drafts.length,
              readyToPublish: drafts.filter((item) => item.progress.issues.length === 0).length,
              reserved: live.filter((item) => item.vehicle.reserved).length,
              featured: live.filter((item) => item.vehicle.featured).length,
              soldRecently: db.vehicles.filter((item) => item.status === "sold" && item.soldAt && now - new Date(item.soldAt).getTime() < 30 * DAY).length,
              stockValue: priced.reduce((sum, item) => sum + (item.vehicle.price ?? 0), 0),
              poaCount: live.length - priced.length,
              withheld: progress.filter((item) => item.progress.withheld).map(listing),
              needsWork: progress
                .filter((item) => (item.vehicle.status === "draft" || item.vehicle.status === "published") && (item.progress.issues.length > 0 || item.progress.recommendations.length > 0))
                .sort((a, b) => b.progress.issues.length - a.progress.issues.length || a.progress.dealerPhotos - b.progress.dealerPhotos)
                .slice(0, 6)
                .map(listing),
            },
            enquiries: {
              ...counts(enquiries),
              needsReply: enquiries.filter((item) => item.status === "new").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 6),
              recent: [...enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
              awaitingValuation: enquiries.filter((item) => item.valuation?.status === "awaiting").length,
            },
            appointments: {
              today: active.filter((item) => dayOf(item.startsAt) === today),
              upcoming: active.filter((item) => dayOf(item.startsAt) > today && new Date(item.startsAt).getTime() < now + 8 * DAY).slice(0, 6),
              toConfirm: active.filter((item) => item.status === "requested" && new Date(item.startsAt).getTime() > now - 30 * MINUTE).length,
            },
          };
        }),
    },

    stock: {
      list: () =>
        call((db) => {
          const user = sessionUser(db);
          return db.vehicles.map((vehicle) => toAdminVehicle(db, vehicle, user));
        }),

      get: (id) =>
        call((db) => {
          const user = sessionUser(db);
          return toAdminVehicle(db, findVehicle(db, id), user);
        }),

      create: () =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const now = new Date().toISOString();
          const id = `s-${crypto.randomUUID().slice(0, 8)}`;
          const vehicle: StoredVehicle = {
            id,
            slug: `new-car-${id.slice(2)}`,
            previousSlugs: [],
            status: "draft",
            reserved: false,
            featured: false,
            title: "",
            make: "",
            model: "",
            year: null,
            price: null,
            priceOnApplication: false,
            mileage: null,
            fuel: null,
            transmission: null,
            bodyType: null,
            colour: "",
            motHistory: [],
            hpiStatus: "unknown",
            warranty: { available: null },
            ulezCompliant: null,
            description: "",
            features: [],
            media: [],
            createdAt: now,
            updatedAt: now,
            reservation: null,
            sale: null,
          };
          db.vehicles.unshift(vehicle);
          return toAdminVehicle(db, vehicle, user);
        }),

      save: (record, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, record.id);
          checkVersion(stored, expectedUpdatedAt);
          validateRecord(db, record);

          // Only media already stored for this car may be kept or reordered.
          const known = new Map(stored.media.map((item) => [item.id, item]));
          const media = record.media.filter((item) => known.has(item.id) || item.kind !== "image");

          const previousSlugs =
            record.slug !== stored.slug && stored.listedAt && !stored.previousSlugs.includes(stored.slug)
              ? [...stored.previousSlugs, stored.slug]
              : stored.previousSlugs;

          Object.assign(stored, {
            ...record,
            // Status, lifecycle and history are changed only by their own actions.
            status: stored.status,
            reserved: stored.reserved,
            featured: stored.featured,
            listedAt: stored.listedAt,
            soldAt: stored.soldAt,
            createdAt: stored.createdAt,
            previousSlugs,
            media,
            updatedAt: stamp(stored.updatedAt),
          });
          return saveResult(db, stored, user);
        }),

      publish: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          if (stored.status === "archived") throw new ValidationError({}, "Restore this car before publishing it.");
          const issues = publicationIssues(stored);
          if (issues.length) {
            throw new ValidationError({}, "This car cannot go on the website yet.", issues);
          }
          stored.status = "published";
          stored.listedAt ??= new Date().toISOString();
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      unpublish: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          stored.status = "draft";
          stored.featured = false;
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      setFeatured: (id, featured, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          if (featured && stored.status !== "published") {
            throw new ValidationError({}, "Only cars for sale can be featured on the homepage.");
          }
          stored.featured = featured;
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      reserve: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          if (stored.status !== "published") throw new ValidationError({}, "Only cars for sale can be reserved.");
          if (!input.customerName.trim()) throw new ValidationError({ customerName: "Add who the car is reserved for." });
          stored.reserved = true;
          stored.reservation = { ...input, customerName: input.customerName.trim(), reservedAt: new Date().toISOString() };
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      releaseReservation: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          stored.reserved = false;
          stored.reservation = null;
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      markSold: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          if (stored.status !== "published") throw new ValidationError({}, "Only cars for sale can be marked sold.");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(input.soldOn) || new Date(input.soldOn).getTime() > Date.now()) {
            throw new ValidationError({ soldOn: "Choose today or an earlier date." });
          }
          const soldAt = new Date(`${input.soldOn}T12:00:00Z`).toISOString();
          stored.status = "sold";
          stored.soldAt = soldAt;
          stored.reserved = false;
          stored.featured = false;
          stored.reservation = null;
          stored.sale = {
            soldAt,
            salePrice: can(user.role, "stock.salePrice") ? input.salePrice : null,
            customerId: input.customerId,
            customerName: input.customerName,
            enquiryId: input.enquiryId,
          };
          stored.updatedAt = stamp(stored.updatedAt);
          if (input.enquiryId) {
            const enquiry = db.enquiries.find((item) => item.id === input.enquiryId);
            if (enquiry && enquiry.status !== "sold") {
              log(db, enquiry.id, user, "status", `Status changed from ${enquiryStatusLabel(enquiry.status)} to Sold (${stored.title}).`);
              enquiry.status = "sold";
              enquiry.closedReason = null;
              enquiry.updatedAt = stamp(enquiry.updatedAt);
            }
          }
          return saveResult(db, stored, user);
        }),

      undoSale: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          stored.status = "published";
          stored.soldAt = undefined;
          stored.sale = null;
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      archive: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.archive");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          stored.status = "archived";
          stored.featured = false;
          stored.reserved = false;
          stored.reservation = null;
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      restore: (id, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "stock.archive");
          const stored = findVehicle(db, id);
          checkVersion(stored, expectedUpdatedAt);
          stored.status = "draft";
          stored.updatedAt = stamp(stored.updatedAt);
          return saveResult(db, stored, user);
        }),

      duplicate: (id) =>
        call((db) => {
          const user = requireCapability(db, "stock.edit");
          const source = findVehicle(db, id);
          const now = new Date().toISOString();
          const newId = `s-${crypto.randomUUID().slice(0, 8)}`;
          let slug = `${source.slug}-copy`;
          for (let n = 2; db.vehicles.some((item) => item.slug === slug); n += 1) slug = `${source.slug}-copy-${n}`;
          const copy: StoredVehicle = {
            ...structuredClone(source),
            id: newId,
            slug,
            previousSlugs: [],
            title: `${source.title} (copy)`,
            status: "draft",
            reserved: false,
            featured: false,
            registration: undefined,
            media: [],
            coverImageId: undefined,
            motHistory: [],
            createdAt: now,
            updatedAt: now,
            listedAt: undefined,
            soldAt: undefined,
            reservation: null,
            sale: null,
          };
          db.vehicles.unshift(copy);
          return toAdminVehicle(db, copy, user);
        }),

      uploadImage: async (id, file, input, onProgress) => {
        await delay();
        maybeFail();
        const db = getDb();
        requireCapability(db, "stock.edit");
        const stored = findVehicle(db, id);
        if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
          throw new ValidationError({ file: `“${file.name}” is not a JPEG, PNG, WebP or AVIF photograph.` }, "This file type is not supported.");
        }
        if (file.size > 25 * 1024 * 1024) {
          throw new ValidationError({ file: `“${file.name}” is larger than 25 MB.` }, "This photograph is too large.");
        }
        const processed = await processImage(file, onProgress);
        const image: VehicleImage = {
          id: `m-${crypto.randomUUID().slice(0, 12)}`,
          kind: "image",
          src: processed.src,
          width: processed.width,
          height: processed.height,
          alt: input.alt,
          category: input.category,
          provenance: "dealer",
        };
        // Attached straight away, without a new version, so a photograph taken
        // on a phone is never lost to an unsaved editor (see the contract).
        stored.media.push(image);
        persist();
        return structuredClone(image);
      },
    },

    enquiries: {
      list: (query) =>
        call((db) => {
          sessionUser(db);
          const items = filterEnquiries(db, query).sort((a, b) =>
            query.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
          );
          return paginate(items, query.page, query.pageSize);
        }),

      counts: (query = {}) =>
        call((db) => {
          sessionUser(db);
          return counts(filterEnquiries(db, { kind: query.kind }));
        }),

      get: (id) =>
        call((db) => {
          sessionUser(db);
          const enquiry = findEnquiry(db, id);
          return {
            enquiry: toEnquiry(db, enquiry),
            activity: [...(db.activity[id] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            appointments: db.appointments
              .filter((item) => item.enquiryId === id)
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((item) => toAppointment(db, item)),
          };
        }),

      updateStatus: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "enquiries.edit");
          const enquiry = findEnquiry(db, id);
          checkVersion(enquiry, expectedUpdatedAt);
          if (input.status === "not-proceeding" && !input.closedReason) {
            throw new ValidationError({ closedReason: "Choose why this enquiry is not going ahead." });
          }
          if (input.status !== enquiry.status) {
            log(db, id, user, "status", `Status changed from ${enquiryStatusLabel(enquiry.status)} to ${enquiryStatusLabel(input.status)}.`);
          }
          if (enquiry.status === "new" && input.status !== "new") enquiry.firstRepliedAt ??= new Date().toISOString();
          enquiry.status = input.status;
          enquiry.closedReason = input.status === "not-proceeding" ? (input.closedReason ?? null) : null;
          if (!enquiry.handledBy && input.status !== "new") {
            enquiry.handledBy = user.id;
            log(db, id, user, "assigned", `Assigned to ${user.name}.`);
          }
          enquiry.updatedAt = stamp(enquiry.updatedAt);
          return toEnquiry(db, enquiry);
        }),

      assign: (id, memberId, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "enquiries.edit");
          const enquiry = findEnquiry(db, id);
          checkVersion(enquiry, expectedUpdatedAt);
          const member = memberId ? db.team.find((person) => person.id === memberId && person.status === "active") : null;
          if (memberId && !member) throw new ValidationError({ handledBy: "Choose an active member of the team." });
          enquiry.handledBy = member?.id ?? null;
          log(db, id, user, "assigned", member ? `Assigned to ${member.name}.` : "No longer assigned to anyone.");
          enquiry.updatedAt = stamp(enquiry.updatedAt);
          return toEnquiry(db, enquiry);
        }),

      addNote: (id, body) =>
        call((db) => {
          const user = requireCapability(db, "enquiries.edit");
          const enquiry = findEnquiry(db, id);
          const text = body.trim();
          if (!text) throw new ValidationError({ body: "Write a note first." });
          if (text.length > 2000) throw new ValidationError({ body: "Keep notes under 2,000 characters." });
          enquiry.updatedAt = stamp(enquiry.updatedAt);
          return log(db, id, user, "note", text);
        }),

      updateValuation: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          const user = requireCapability(db, "enquiries.edit");
          const enquiry = findEnquiry(db, id);
          checkVersion(enquiry, expectedUpdatedAt);
          if (enquiry.kind !== "part-exchange") throw new ValidationError({}, "Only part-exchange enquiries have a valuation.");
          if (input.status !== "awaiting" && (input.amount === null || input.amount <= 0)) {
            throw new ValidationError({ amount: "Enter the valuation in whole pounds." });
          }
          enquiry.valuation = { status: input.status, amount: input.amount, note: input.note?.trim() || undefined, updatedAt: new Date().toISOString() };
          const money = input.amount === null ? "" : ` · £${input.amount.toLocaleString("en-GB")}`;
          log(db, id, user, "valuation", `Valuation: ${input.status === "awaiting" ? "awaiting" : input.status}${money}${input.note ? ` — ${input.note.trim()}` : ""}`);
          if (enquiry.status === "new") {
            enquiry.status = "contacted";
            enquiry.firstRepliedAt ??= new Date().toISOString();
          }
          enquiry.updatedAt = stamp(enquiry.updatedAt);
          return toEnquiry(db, enquiry);
        }),

      remove: (id) =>
        call((db) => {
          requireCapability(db, "enquiries.delete");
          findEnquiry(db, id);
          db.enquiries = db.enquiries.filter((item) => item.id !== id);
          delete db.activity[id];
          for (const appointment of db.appointments) {
            if (appointment.enquiryId === id) appointment.enquiryId = null;
          }
        }),
    },

    appointments: {
      list: (query) =>
        call((db) => {
          sessionUser(db);
          return db.appointments
            .filter((item) => {
              if (query.from && item.startsAt < query.from) return false;
              if (query.to && item.startsAt >= query.to) return false;
              if (query.status === "active" && item.status !== "requested" && item.status !== "confirmed") return false;
              if (query.status && query.status !== "active" && query.status !== "all" && item.status !== query.status) return false;
              if (query.type && query.type !== "all" && item.type !== query.type) return false;
              if (query.vehicleId && item.vehicleId !== query.vehicleId) return false;
              if (query.customerId && item.customerId !== query.customerId) return false;
              return true;
            })
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((item) => toAppointment(db, item));
        }),

      create: (input) =>
        call((db) => {
          const user = requireCapability(db, "appointments.edit");
          validateAppointment(db, input);
          const now = new Date().toISOString();
          const appointment: StoredAppointment = {
            ...input,
            customerName: input.customerName.trim(),
            startsAt: new Date(input.startsAt).toISOString(),
            id: `ap-${crypto.randomUUID().slice(0, 8)}`,
            createdAt: now,
            updatedAt: now,
          };
          db.appointments.push(appointment);
          if (input.enquiryId) {
            const enquiry = db.enquiries.find((item) => item.id === input.enquiryId);
            if (enquiry) {
              const when = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(appointment.startsAt));
              log(db, enquiry.id, user, "appointment", `${input.type === "test-drive" ? "Test drive" : "Viewing"} arranged for ${when}.`);
              // Arranging a viewing moves an open enquiry along; it never reopens a closed one.
              if (enquiry.status === "new" || enquiry.status === "contacted") {
                log(db, enquiry.id, user, "status", `Status changed from ${enquiryStatusLabel(enquiry.status)} to Viewing arranged.`);
                if (enquiry.status === "new") enquiry.firstRepliedAt ??= now;
                enquiry.status = "viewing-arranged";
              }
              enquiry.updatedAt = stamp(enquiry.updatedAt);
            }
          }
          return toAppointment(db, appointment);
        }),

      update: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          requireCapability(db, "appointments.edit");
          const stored = db.appointments.find((item) => item.id === id);
          if (!stored) throw new NotFoundError("This appointment could not be found.");
          checkVersion(stored, expectedUpdatedAt);
          validateAppointment(db, input);
          Object.assign(stored, { ...input, customerName: input.customerName.trim(), startsAt: new Date(input.startsAt).toISOString(), updatedAt: stamp(stored.updatedAt) });
          return toAppointment(db, stored);
        }),
    },

    customers: {
      list: (query) =>
        call((db) => {
          sessionUser(db);
          const items = db.customers
            .map((customer) => toCustomer(db, customer))
            .filter((customer) => {
              if (query.filter === "open-enquiries" && customer.openEnquiryCount === 0) return false;
              if (query.filter === "buyers" && customer.purchaseCount === 0) return false;
              return matches(query.search ?? "", customer.name, customer.email, customer.phone);
            })
            .sort((a, b) => (query.sort === "name" ? a.name.localeCompare(b.name) : b.lastActivityAt.localeCompare(a.lastActivityAt)));
          return paginate(items, query.page, query.pageSize);
        }),

      get: (id) =>
        call((db) => {
          const user = sessionUser(db);
          const customer = db.customers.find((item) => item.id === id);
          if (!customer) throw new NotFoundError("This customer could not be found.");
          return {
            customer: toCustomer(db, customer),
            enquiries: db.enquiries
              .filter((item) => item.customerId === id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((item) => toEnquiry(db, item)),
            appointments: db.appointments
              .filter((item) => item.customerId === id)
              .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
              .map((item) => toAppointment(db, item)),
            purchases: db.vehicles
              .filter((item) => item.sale?.customerId === id)
              .map((item) => ({
                vehicleId: item.id,
                title: item.title,
                year: item.year,
                soldAt: item.sale!.soldAt,
                salePrice: can(user.role, "stock.salePrice") ? item.sale!.salePrice : null,
              })),
          };
        }),

      update: (id, input, { expectedUpdatedAt }) =>
        call((db) => {
          requireCapability(db, "customers.edit");
          const stored = db.customers.find((item) => item.id === id);
          if (!stored) throw new NotFoundError("This customer could not be found.");
          checkVersion(stored, expectedUpdatedAt);
          const fields: Record<string, string> = {};
          if (input.name.trim().length < 2) fields.name = "Add the customer's name.";
          if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) fields.email = "That doesn't look like an email address.";
          if (input.phone && input.phone.replace(/\D/g, "").length < 10) fields.phone = "Enter a valid UK phone number.";
          if (!input.email?.trim() && !input.phone?.trim()) fields.phone = "Keep at least one way to contact them.";
          if (input.notes.length > 4000) fields.notes = "Keep notes under 4,000 characters.";
          if (Object.keys(fields).length) throw new ValidationError(fields);
          Object.assign(stored, {
            name: input.name.trim(),
            email: input.email?.trim() || null,
            phone: input.phone?.trim() || null,
            notes: input.notes,
            updatedAt: stamp(stored.updatedAt),
          });
          return toCustomer(db, stored);
        }),
    },

    team: {
      list: () =>
        call((db) => {
          sessionUser(db);
          return db.team;
        }),

      invite: (input) =>
        call((db) => {
          requireCapability(db, "team.manage");
          const fields: Record<string, string> = {};
          const email = input.email.trim().toLowerCase();
          if (input.name.trim().length < 2) fields.name = "Add their name.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "That doesn't look like an email address.";
          else if (db.team.some((person) => person.email.toLowerCase() === email)) fields.email = "Someone on the team already uses this email address.";
          if (Object.keys(fields).length) throw new ValidationError(fields);
          const member: TeamMember = {
            id: `u-${crypto.randomUUID().slice(0, 8)}`,
            name: input.name.trim(),
            email,
            role: input.role,
            status: "invited",
            createdAt: new Date().toISOString(),
            lastActiveAt: null,
          };
          db.team.push(member);
          return member;
        }),

      update: (id, input) =>
        call((db) => {
          const user = requireCapability(db, "team.manage");
          const member = db.team.find((person) => person.id === id);
          if (!member) throw new NotFoundError("This person is no longer on the team.");
          const next = { ...member, ...input };
          const owners = db.team.filter((person) => (person.id === id ? next : person)).filter((person) => person.role === "owner" && person.status === "active");
          if (owners.length === 0) {
            throw new ValidationError({}, "There must always be at least one active owner.");
          }
          if (id === user.id && input.status === "deactivated") {
            throw new ValidationError({}, "You cannot deactivate your own account.");
          }
          Object.assign(member, input);
          if (input.status === "deactivated") {
            for (const enquiry of db.enquiries) {
              if (enquiry.handledBy === id && isOpenEnquiry(enquiry.status)) {
                enquiry.handledBy = null;
                log(db, enquiry.id, user, "assigned", `${member.name} was deactivated; no longer assigned.`);
              }
            }
          }
          return member;
        }),

      resendInvite: (id) =>
        call((db) => {
          requireCapability(db, "team.manage");
          const member = db.team.find((person) => person.id === id);
          if (!member || member.status !== "invited") throw new ValidationError({}, "Only pending invitations can be sent again.");
        }),
    },

    settings: {
      get: () =>
        call((db) => {
          sessionUser(db);
          return db.settings;
        }),

      updateBusiness: (input, { expectedUpdatedAt }) =>
        call((db) => {
          requireCapability(db, "settings.edit");
          checkVersion(db.settings, expectedUpdatedAt);
          const fields: Record<string, string> = {};
          if (input.name.trim().length < 2) fields.name = "Add the business name.";
          if (!/^\+44\d{9,10}$/.test(input.phoneE164)) fields.phoneE164 = "Use the international format, e.g. +447700900123.";
          if (!/^44\d{9,10}$/.test(input.whatsappNumber)) fields.whatsappNumber = "Use digits only, starting 44, e.g. 447700900123.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) fields.email = "That doesn't look like an email address.";
          if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(input.postcode.trim())) fields.postcode = "Enter a valid UK postcode.";
          if (!/^\d{2}:\d{2}$/.test(input.hours.opens)) fields["hours.opens"] = "Use 24-hour time, e.g. 12:00.";
          if (!/^\d{2}:\d{2}$/.test(input.hours.closes)) fields["hours.closes"] = "Use 24-hour time, e.g. 17:00.";
          else if (input.hours.closes <= input.hours.opens) fields["hours.closes"] = "Closing time must be after opening time.";
          if (input.hours.days.length === 0) fields["hours.days"] = "Choose at least one opening day.";
          if (Object.keys(fields).length) throw new ValidationError(fields);
          db.settings.business = { ...input, postcode: input.postcode.trim().toUpperCase() };
          db.settings.updatedAt = stamp(db.settings.updatedAt);
          return db.settings;
        }),
    },
  };
}
