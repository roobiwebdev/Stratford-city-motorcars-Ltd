import type {
  AdminVehicle,
  Appointment,
  Customer,
  Enquiry,
  EnquiryActivity,
  EnquiryPayload,
  PhotoCategory,
  Settings,
  TeamMember,
  VehicleMedia,
} from "@Stratford-city-motorcars-Ltd/core";

/**
 * SAMPLE DATA — invented for building and reviewing the admin.
 *
 * Nobody here is a real customer. Names are made up, emails use example.com
 * (reserved for documentation) and phone numbers are in Ofcom's 07700 900xxx
 * drama range, which is never allocated. Registrations read "SAMPLE".
 * Photographs are placeholders: the dealership has not supplied any.
 *
 * The seven legacy cars from the old website appear as unconfirmed drafts, as
 * they are in the website's own seed. Everything else is invented to show the
 * admin in every state a car, an enquiry or a viewing can be in.
 *
 * Times are relative to when the sample is created, so the overview always
 * has something waiting today.
 */

export interface MockDb {
  version: number;
  createdAt: string;
  team: TeamMember[];
  /** email → password, sample sign-in only. */
  vehicles: Omit<AdminVehicle, "openEnquiryCount">[];
  enquiries: Omit<Enquiry, "vehicle">[];
  activity: Record<string, EnquiryActivity[]>;
  appointments: Omit<Appointment, "vehicleTitle" | "enquiryReference">[];
  customers: Omit<Customer, "enquiryCount" | "openEnquiryCount" | "appointmentCount" | "purchaseCount" | "lastActivityAt">[];
  settings: Settings;
}

export const MOCK_DB_VERSION = 3;
export const SAMPLE_PASSWORD = "stratford-sample";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function createFixtures(now = Date.now()): MockDb {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  /** A London wall-clock time `days` from today, e.g. at(1, 14, 30). */
  const at = (days: number, hour: number, minute = 0) => {
    const base = new Date(now + days * DAY);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(base);
    const guess = new Date(`${key}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
    const local = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
    return new Date(guess.getTime() - (local.getTime() - utc.getTime())).toISOString();
  };

  // ---- Team ------------------------------------------------------------------------

  const team: TeamMember[] = [
    { id: "u-owner", name: "Daniel Reyes", email: "owner@example.com", role: "owner", status: "active", createdAt: ago(120 * DAY), lastActiveAt: ago(2 * HOUR) },
    { id: "u-staff", name: "Priya Shah", email: "staff@example.com", role: "staff", status: "active", createdAt: ago(60 * DAY), lastActiveAt: ago(26 * HOUR) },
    { id: "u-invited", name: "Marcus Bell", email: "marcus.bell@example.com", role: "staff", status: "invited", createdAt: ago(3 * DAY), lastActiveAt: null },
    { id: "u-former", name: "Leah Grant", email: "leah.grant@example.com", role: "staff", status: "deactivated", createdAt: ago(200 * DAY), lastActiveAt: ago(75 * DAY) },
  ];

  // ---- Media -----------------------------------------------------------------------

  let mediaSeq = 0;
  const photos = (slug: string, counts: Partial<Record<PhotoCategory, number>>, title: string): VehicleMedia[] =>
    (Object.entries(counts) as [PhotoCategory, number][]).flatMap(([category, count]) =>
      Array.from({ length: count }, (_, i) => ({
        id: `${slug}-${category}-${(mediaSeq += 1)}`,
        kind: "image" as const,
        src: `sample:${category}`,
        width: 2400,
        height: 1600,
        // A few deliberately blank, so the "missing description" advice shows.
        alt: i === count - 1 && category === "detail" ? "" : `${title}, ${category} photograph ${i + 1}`,
        category,
        provenance: "dealer" as const,
      })),
    );

  const walkaround = (slug: string, title: string): VehicleMedia => ({
    id: `${slug}-video`,
    kind: "video",
    title: `${title} walkaround`,
    source: { type: "youtube", videoId: "SAMPLEvideo" },
    durationSeconds: 94,
    provenance: "dealer",
  });

  // ---- Stock -------------------------------------------------------------------------

  type V = MockDb["vehicles"][number];
  const base = (overrides: Partial<V> & Pick<V, "id" | "slug" | "title" | "make" | "model">): V => ({
    previousSlugs: [],
    status: "draft",
    reserved: false,
    featured: false,
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
    createdAt: ago(40 * DAY),
    updatedAt: ago(40 * DAY),
    reservation: null,
    sale: null,
    ...overrides,
  });

  const vehicles: V[] = [
    base({
      id: "s-911",
      slug: "porsche-911-carrera-4s-2019",
      status: "published",
      featured: true,
      title: "Porsche 911 Carrera 4S",
      make: "Porsche",
      model: "911",
      variant: "Carrera 4S PDK",
      year: 2019,
      registration: "SAMPLE 01",
      registrationDate: "2019-06-14",
      price: 84950,
      mileage: 21400,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      colour: "GT Silver Metallic",
      engine: "3.0L Twin-Turbo Flat-Six",
      power: "450 PS",
      doors: 2,
      seats: 4,
      interior: "Black leather with Bordeaux stitching",
      previousOwners: 2,
      insuranceGroup: "50",
      roadTaxBand: "M",
      serviceHistory: "Full Porsche main dealer history",
      motExpiry: "2027-06-10",
      motHistory: [
        { date: "2026-06-11", result: "pass", mileage: 20900 },
        { date: "2025-06-09", result: "pass", mileage: 16200, notes: "Advisory: front tyres wearing close to legal limit" },
      ],
      documentation: "V5C present, two keys, handbooks",
      hpiStatus: "clear",
      warranty: { available: true, termMonths: 12, notes: "Third-party cover, sold separately" },
      ulezCompliant: true,
      description:
        "A beautifully specified 992-generation Carrera 4S in GT Silver with the Bordeaux-stitched interior. Sport Chrono, sports exhaust and rear-axle steering. Two owners and a full Porsche history.",
      features: ["Sport Chrono Package", "Sports exhaust", "Rear-axle steering", "Bose surround sound", "Heated seats", "20/21-inch Carrera S wheels"],
      media: [...photos("s-911", { exterior: 9, interior: 7, detail: 5, documents: 1 }, "Porsche 911 Carrera 4S"), walkaround("s-911", "Porsche 911")],
      createdAt: ago(35 * DAY),
      updatedAt: ago(3 * DAY),
      listedAt: ago(33 * DAY),
    }),
    base({
      id: "s-huracan",
      slug: "lamborghini-huracan-evo-2020",
      status: "published",
      featured: true,
      title: "Lamborghini Huracán EVO",
      make: "Lamborghini",
      model: "Huracán",
      variant: "EVO",
      year: 2020,
      registration: "SAMPLE 02",
      registrationDate: "2020-03-02",
      price: 184995,
      mileage: 9800,
      fuel: "Petrol",
      transmission: "Semi-Automatic",
      bodyType: "Coupe",
      colour: "Grigio Titans",
      engine: "5.2L V10",
      power: "640 PS",
      doors: 2,
      seats: 2,
      interior: "Nero Ade Alcantara",
      previousOwners: 1,
      insuranceGroup: "50",
      roadTaxBand: "M",
      serviceHistory: "Full Lamborghini history",
      motExpiry: "2027-03-01",
      hpiStatus: "clear",
      warranty: { available: true, termMonths: 12 },
      ulezCompliant: true,
      description:
        "One owner, under 10,000 miles, and specified with the lifting system, sports seats and full carbon interior pack. Presented in Grigio Titans with bronze forged wheels.",
      features: ["Front lift system", "Carbon interior pack", "Sports seats", "Rear camera", "Forged wheels"],
      media: [...photos("s-huracan", { exterior: 10, interior: 6, detail: 6 }, "Lamborghini Huracán EVO"), walkaround("s-huracan", "Lamborghini Huracán")],
      createdAt: ago(12 * DAY),
      updatedAt: ago(1 * DAY),
      listedAt: ago(10 * DAY),
    }),
    base({
      id: "s-bentley",
      slug: "bentley-continental-gt-v8-2018",
      status: "published",
      reserved: true,
      title: "Bentley Continental GT V8",
      make: "Bentley",
      model: "Continental GT",
      variant: "V8 Mulliner",
      year: 2018,
      registration: "SAMPLE 03",
      price: 72500,
      mileage: 31200,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      colour: "Beluga Black",
      engine: "4.0L Twin-Turbo V8",
      previousOwners: 3,
      serviceHistory: "Full Bentley history",
      motExpiry: "2027-01-20",
      hpiStatus: "clear",
      warranty: { available: null },
      description: "Mulliner specification with the diamond-quilted hide, rotating display and Naim audio.",
      features: ["Mulliner Driving Specification", "Naim audio", "Rotating display", "Massage seats"],
      media: photos("s-bentley", { exterior: 8, interior: 6, detail: 3 }, "Bentley Continental GT V8"),
      createdAt: ago(28 * DAY),
      updatedAt: ago(2 * DAY),
      listedAt: ago(26 * DAY),
      reservation: {
        customerId: "c-ade",
        customerName: "Adebayo Okafor",
        reservedAt: ago(2 * DAY),
        depositNote: "£500 taken by card in the showroom",
        note: "Collecting after finance paperwork is signed",
      },
    }),
    base({
      id: "s-svr",
      slug: "range-rover-sport-svr-2020",
      status: "published",
      title: "Range Rover Sport SVR",
      make: "Land Rover",
      model: "Range Rover Sport",
      variant: "SVR",
      year: 2020,
      registration: "SAMPLE 04",
      price: 61000,
      mileage: 38900,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "SUV",
      colour: "Carpathian Grey",
      engine: "5.0L Supercharged V8",
      previousOwners: 2,
      hpiStatus: "not-checked",
      description: "The 575 PS SVR with carbon bonnet, panoramic roof and the full-length carbon interior trim.",
      features: ["Carbon fibre bonnet", "Panoramic roof", "Meridian audio", "Head-up display"],
      media: photos("s-svr", { exterior: 7, interior: 4, detail: 1 }, "Range Rover Sport SVR"),
      createdAt: ago(20 * DAY),
      updatedAt: ago(6 * DAY),
      listedAt: ago(19 * DAY),
    }),
    base({
      id: "s-pagoda",
      slug: "mercedes-benz-280sl-pagoda-1969",
      status: "published",
      title: "Mercedes-Benz 280 SL Pagoda",
      make: "Mercedes-Benz",
      model: "280 SL",
      year: 1969,
      registration: "SAMPLE 05",
      priceOnApplication: true,
      mileage: 78000,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Convertible",
      colour: "Signal Red",
      engine: "2.8L Straight-Six",
      serviceHistory: "Restoration file with invoices",
      hpiStatus: "not-checked",
      ulezCompliant: null,
      description: "A right-hand-drive Pagoda with both the hard top and soft top, restored and kept in dry storage.",
      features: ["Hard top and soft top", "Becker radio", "Chrome wire wheels"],
      media: photos("s-pagoda", { exterior: 6, interior: 3, detail: 4, documents: 2 }, "Mercedes-Benz 280 SL"),
      createdAt: ago(60 * DAY),
      updatedAt: ago(9 * DAY),
      listedAt: ago(58 * DAY),
    }),
    base({
      id: "s-db11",
      slug: "aston-martin-db11-v8-2018",
      status: "published",
      title: "Aston Martin DB11 V8",
      make: "Aston Martin",
      model: "DB11",
      variant: "V8",
      year: 2018,
      registration: "SAMPLE 06",
      price: 79995,
      mileage: 24100,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      colour: "Magnetic Silver",
      engine: "4.0L Twin-Turbo V8",
      hpiStatus: "unknown",
      description: "Magnetic Silver over Obsidian Black leather, with the Bang & Olufsen system and 360° cameras.",
      features: ["Bang & Olufsen audio", "360° cameras", "Ventilated seats"],
      // Published, but no interior photographs yet — withheld from the website.
      media: photos("s-db11", { exterior: 5 }, "Aston Martin DB11"),
      createdAt: ago(5 * DAY),
      updatedAt: ago(4 * HOUR),
      listedAt: ago(4 * DAY),
    }),
    base({
      id: "s-570s",
      slug: "mclaren-570s-2017",
      status: "draft",
      title: "McLaren 570S",
      make: "McLaren",
      model: "570S",
      year: 2017,
      registration: "SAMPLE 07",
      price: 96500,
      mileage: 14700,
      fuel: "Petrol",
      transmission: "Semi-Automatic",
      bodyType: "Coupe",
      colour: "Ventura Orange",
      engine: "3.8L Twin-Turbo V8",
      hpiStatus: "clear",
      description: "Ventura Orange with the Luxury Pack, electrochromic glass roof and Bowers & Wilkins audio.",
      features: ["Luxury Pack", "Bowers & Wilkins audio", "Vehicle lift", "Parking sensors"],
      media: photos("s-570s", { exterior: 6, interior: 4, detail: 2 }, "McLaren 570S"),
      createdAt: ago(3 * DAY),
      updatedAt: ago(20 * HOUR),
    }),
    base({
      id: "s-m4",
      slug: "bmw-m4-competition-2021",
      status: "sold",
      title: "BMW M4 Competition",
      make: "BMW",
      model: "M4",
      variant: "Competition xDrive",
      year: 2021,
      registration: "SAMPLE 08",
      price: 52995,
      mileage: 18300,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      colour: "Isle of Man Green",
      engine: "3.0L Twin-Turbo Straight-Six",
      hpiStatus: "clear",
      description: "Isle of Man Green with carbon bucket seats and the M Carbon exterior pack.",
      features: ["M Carbon bucket seats", "M Carbon exterior pack", "Harman Kardon audio"],
      media: photos("s-m4", { exterior: 8, interior: 5, detail: 4 }, "BMW M4 Competition"),
      createdAt: ago(70 * DAY),
      updatedAt: ago(12 * DAY),
      listedAt: ago(68 * DAY),
      soldAt: ago(12 * DAY),
      sale: { soldAt: ago(12 * DAY), salePrice: 51000, customerId: "c-tom", customerName: "Tomasz Nowak", enquiryId: "e-m4" },
    }),
    base({
      id: "s-granturismo",
      slug: "maserati-granturismo-sport-2014",
      status: "archived",
      title: "Maserati GranTurismo Sport",
      make: "Maserati",
      model: "GranTurismo",
      year: 2014,
      price: 32000,
      mileage: 51000,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      colour: "Nero Carbonio",
      description: "Withdrawn: returned to the trade.",
      media: photos("s-granturismo", { exterior: 3, interior: 2 }, "Maserati GranTurismo"),
      createdAt: ago(150 * DAY),
      updatedAt: ago(45 * DAY),
    }),

    // ---- The seven legacy records: unconfirmed drafts, as in the website's seed ----
    base({
      id: "v006",
      slug: "rolls-royce-dawn-2016",
      previousSlugs: ["rolls-royce-dawn"],
      title: "Rolls-Royce Dawn",
      make: "Rolls-Royce",
      model: "Dawn",
      year: 2016,
      price: 30000,
      mileage: 28000,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Convertible",
      colour: "Arctic White",
      engine: "6.6L Twin-Turbo V12",
      interior: "Cream leather with navy hood",
      description:
        "An open-top four-seater in arctic white with a navy hood and cream leather. Price to be confirmed by the client — the legacy £30,000 is an error.",
      features: ["6.6L Twin-Turbo V12", "Bespoke Audio System", "Starlight Headliner"],
      media: [
        {
          id: "rolls-royce-dawn-2016-library-front",
          kind: "image",
          src: "/sample/rolls-royce-dawn-library.webp",
          alt: "Rolls-Royce Dawn convertible in white with a navy hood, front three-quarter view",
          width: 1023,
          height: 639,
          category: "exterior",
          provenance: "library",
          credit: {
            author: "crash71100",
            license: "CC0 1.0",
            licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
            sourceUrl: "https://www.flickr.com/photos/152930510@N02/45293854451",
          },
        },
      ],
      createdAt: ago(8 * DAY),
      updatedAt: ago(8 * DAY),
    }),
    base({ id: "v004", slug: "rolls-royce-corniche-1999", previousSlugs: ["rolls-royce-corniche"], title: "Rolls-Royce Corniche", make: "Rolls-Royce", model: "Corniche", year: 1999, price: 60000, mileage: 42000, fuel: "Petrol", transmission: "Automatic", bodyType: "Convertible", colour: "Silver Seraph", description: "Legacy record. Price to be confirmed by the client.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
    base({ id: "v003", slug: "mercedes-benz-sl63-amg-2016", previousSlugs: ["mercedes-benz-sl63-amg"], title: "Mercedes-Benz SL63 AMG", make: "Mercedes-Benz", model: "SL63 AMG", year: 2016, price: 40000, mileage: 38000, fuel: "Petrol", transmission: "Automatic", bodyType: "Convertible", colour: "Obsidian Black", engine: "5.5L Biturbo V8", description: "Legacy record, not yet confirmed as in stock.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
    base({ id: "v007", slug: "porsche-macan-s-2014", previousSlugs: ["porsche-macan-s"], title: "Porsche Macan S", make: "Porsche", model: "Macan", variant: "S", year: 2014, price: 25000, mileage: 62000, fuel: "Petrol", transmission: "Automatic", bodyType: "SUV", colour: "Jet Black Metallic", engine: "3.0L Twin-Turbo V6", description: "Legacy record, not yet confirmed as in stock.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
    base({ id: "v005", slug: "rolls-royce-silver-shadow-1978", previousSlugs: ["rolls-royce-silver-shadow"], title: "Rolls-Royce Silver Shadow", make: "Rolls-Royce", model: "Silver Shadow", year: 1978, price: 20000, mileage: 58000, fuel: "Petrol", transmission: "Automatic", bodyType: "Saloon", colour: "Silver", description: "Legacy record, not yet confirmed as in stock.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
    base({ id: "v001", slug: "jaguar-xf-2012", previousSlugs: ["jaguar-xf"], title: "Jaguar XF", make: "Jaguar", model: "XF", year: 2012, price: 16000, mileage: 68000, fuel: "Diesel", transmission: "Automatic", bodyType: "Saloon", colour: "Midnight Black", description: "Legacy record. Below the £20,000 website range.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
    base({ id: "v002", slug: "mercedes-benz-ml63-amg-2006", previousSlugs: ["mercedes-benz-ml63-amg"], title: "Mercedes-Benz ML63 AMG", make: "Mercedes-Benz", model: "ML63 AMG", year: 2006, price: 12000, mileage: 95000, fuel: "Petrol", transmission: "Automatic", bodyType: "SUV", colour: "Silver", engine: "6.3L V8", description: "Legacy record. Below the £20,000 website range.", createdAt: ago(8 * DAY), updatedAt: ago(8 * DAY) }),
  ];

  // ---- Customers ------------------------------------------------------------------------

  type C = MockDb["customers"][number];
  const person = (id: string, name: string, phoneSuffix: string, createdMs: number, notes = ""): C => ({
    id,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    phone: `07700 900${phoneSuffix}`,
    notes,
    createdAt: ago(createdMs),
    updatedAt: ago(createdMs),
  });

  const customers: C[] = [
    person("c-ade", "Adebayo Okafor", "118", 9 * DAY, "Prefers WhatsApp. Buying the Bentley on finance."),
    person("c-tom", "Tomasz Nowak", "204", 30 * DAY, "Bought the M4. Interested in something larger next year."),
    person("c-hannah", "Hannah Whitfield", "311", 40 * MINUTE),
    person("c-omar", "Omar Haddad", "427", 5 * HOUR),
    person("c-grace", "Grace Mensah", "539", 26 * HOUR),
    person("c-james", "James Fairbrother", "642", 3 * DAY),
    person("c-sofia", "Sofia Marchetti", "755", 2 * DAY),
    person("c-ravi", "Ravi Chandra", "863", 4 * DAY),
    person("c-ellie", "Ellie Brennan", "971", 6 * DAY),
    person("c-kwame", "Kwame Asante", "085", 7 * DAY),
    person("c-lucy", "Lucy Harrington", "192", 10 * DAY),
    person("c-nikhil", "Nikhil Rao", "276", 14 * DAY),
    person("c-chloe", "Chloe Dupont", "388", 18 * DAY),
    { ...person("c-noemail", "Frank Ellison", "499", 20 * HOUR), email: null, notes: "Walked in; no email given." },
  ];

  const byId = new Map(customers.map((customer) => [customer.id, customer]));

  // ---- Enquiries -------------------------------------------------------------------------

  type E = MockDb["enquiries"][number];
  const refs = ["SCM-4Q7KDM", "SCM-8F2K4Q", "SCM-J3N6RT", "SCM-V9C2HX", "SCM-P5W8LB", "SCM-T2G7ZE", "SCM-M8R3YU", "SCM-K6D9NA", "SCM-X4B5QJ", "SCM-H7L2WC", "SCM-Z3F8PK", "SCM-R9T4MV", "SCM-C5N7GS", "SCM-W2Y6DH", "SCM-Q8J3LF", "SCM-B6X9RE", "SCM-N4K2TA", "SCM-G7P5ZC", "SCM-L3V8HM", "SCM-Y5D2QW", "SCM-E9M6KP", "SCM-U4H7XB"];
  let refIndex = 0;

  const enquiry = (
    id: string,
    customerId: string | null,
    createdMs: number,
    payloadFor: (contact: { name: string; email: string; phone: string }) => EnquiryPayload,
    rest: Partial<E> = {},
  ): E => {
    const customer = customerId ? byId.get(customerId) : undefined;
    const contact = {
      name: customer?.name ?? "Unknown",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
    };
    const payload = payloadFor(contact);
    return {
      id,
      reference: refs[refIndex++ % refs.length]!,
      kind: payload.kind,
      status: "new",
      closedReason: null,
      name: payload.name,
      email: payload.email || null,
      phone: ("phone" in payload && payload.phone) || null,
      vehicleSlug: "vehicleSlug" in payload && payload.vehicleSlug ? payload.vehicleSlug : null,
      customerId,
      handledBy: null,
      valuation: null,
      payload,
      createdAt: ago(createdMs),
      updatedAt: ago(createdMs),
      firstRepliedAt: null,
      ...rest,
    };
  };

  const carEnquiry =
    (slug: string, title: string, requestType: "question" | "viewing" | "test-drive", extra: Partial<Extract<EnquiryPayload, { kind: "vehicle-enquiry" }>> = {}) =>
    (contact: { name: string; email: string; phone: string }): EnquiryPayload => ({
      kind: "vehicle-enquiry",
      requestType,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || undefined,
      vehicleSlug: slug,
      vehicleTitle: title,
      interestedInFinance: false,
      hasPartExchange: false,
      ...extra,
    });

  const enquiries: E[] = [
    enquiry("e-hannah", "c-hannah", 40 * MINUTE, carEnquiry("lamborghini-huracan-evo-2020", "Lamborghini Huracán EVO", "viewing", {
      preferredDate: new Date(now + 2 * DAY).toISOString().slice(0, 10),
      preferredTime: "Weekday, 2pm–5pm",
      message: "Could I see it on Friday afternoon? I'd also like to understand the service history.",
      interestedInFinance: true,
    })),
    enquiry("e-omar", "c-omar", 5 * HOUR, (c) => ({
      kind: "part-exchange",
      name: c.name,
      email: c.email,
      phone: c.phone,
      registration: "SAMPLE PX1",
      make: "Audi",
      model: "RS6 Avant",
      year: 2019,
      mileage: 46200,
      serviceHistory: "Full service history",
      motStatus: "Current MOT",
      keys: "2",
      condition: "Good",
      conditionNotes: "Small kerb mark on the rear offside wheel.",
      outstandingFinance: true,
      interestedIn: "Porsche 911 Carrera 4S",
      vehicleSlug: "porsche-911-carrera-4s-2019",
    }), { valuation: { status: "awaiting", amount: null, updatedAt: ago(5 * HOUR) } }),
    enquiry("e-noemail", "c-noemail", 20 * HOUR, (c) => ({
      kind: "contact",
      name: c.name,
      email: "",
      phone: c.phone,
      enquiryType: "Buying a car",
      message: "Looking for a convertible for the summer, budget around £45k. Happy to wait for the right one.",
    }), { email: null }),
    enquiry("e-grace", "c-grace", 26 * HOUR, carEnquiry("aston-martin-db11-v8-2018", "Aston Martin DB11 V8", "question", {
      message: "Are there more photos of the interior? And is the price negotiable for a cash buyer?",
    })),
    enquiry("e-sold-car", "c-sofia", 2 * DAY, carEnquiry("bmw-m4-competition-2021", "BMW M4 Competition", "test-drive", {
      preferredTime: "Weekend, by appointment",
      message: "Saw this on the website last month — is it still available?",
    })),

    enquiry("e-james", "c-james", 3 * DAY, (c) => ({
      kind: "finance",
      name: c.name,
      email: c.email,
      phone: c.phone,
      vehicle: "Range Rover Sport SVR",
      vehicleSlug: "range-rover-sport-svr-2020",
      deposit: 15000,
      monthlyBudget: 900,
      hasPartExchange: false,
    }), { status: "contacted", handledBy: "u-staff", firstRepliedAt: ago(3 * DAY - 2 * HOUR) }),
    enquiry("e-ravi", "c-ravi", 4 * DAY, carEnquiry("porsche-macan-s", "Porsche Macan S", "question", {
      message: "Old link from Google — do you still have the Macan?",
    }), { status: "contacted", handledBy: "u-owner", firstRepliedAt: ago(4 * DAY - 40 * MINUTE) }),
    enquiry("e-ellie", "c-ellie", 6 * DAY, (c) => ({
      kind: "part-exchange",
      name: c.name,
      email: c.email,
      phone: c.phone,
      registration: "SAMPLE PX2",
      make: "Mercedes-Benz",
      model: "C63 AMG",
      year: 2016,
      mileage: 58300,
      serviceHistory: "Partial service history",
      motStatus: "MOT due within 3 months",
      keys: "1",
      condition: "Average",
      outstandingFinance: false,
    }), { status: "contacted", handledBy: "u-owner", firstRepliedAt: ago(6 * DAY - 3 * HOUR), valuation: { status: "offered", amount: 21500, note: "Subject to inspection; second key missing.", updatedAt: ago(5 * DAY) } }),
    enquiry("e-kwame", "c-kwame", 7 * DAY, carEnquiry("ferrari-f430-spider-2008", "Ferrari F430 Spider", "viewing", {
      message: "Is the F430 still with you?",
    }), { status: "contacted", handledBy: "u-staff", firstRepliedAt: ago(7 * DAY - 5 * HOUR) }),

    enquiry("e-ade", "c-ade", 9 * DAY, carEnquiry("bentley-continental-gt-v8-2018", "Bentley Continental GT V8", "test-drive", {
      preferredTime: "Weekday, 12pm–2pm",
      interestedInFinance: true,
      hasPartExchange: false,
    }), { status: "viewing-arranged", handledBy: "u-owner", firstRepliedAt: ago(9 * DAY - HOUR) }),
    enquiry("e-lucy", "c-lucy", 10 * DAY, carEnquiry("mercedes-benz-280sl-pagoda-1969", "Mercedes-Benz 280 SL Pagoda", "viewing", {
      message: "Would love to see the Pagoda. What is the price?",
    }), { status: "viewing-arranged", handledBy: "u-staff", firstRepliedAt: ago(10 * DAY - 4 * HOUR) }),
    enquiry("e-nikhil", "c-nikhil", 14 * DAY, (c) => ({
      kind: "part-exchange",
      name: c.name,
      email: c.email,
      phone: c.phone,
      registration: "SAMPLE PX3",
      make: "Porsche",
      model: "Cayenne S",
      year: 2017,
      mileage: 64000,
      serviceHistory: "Full service history",
      motStatus: "Current MOT",
      keys: "2",
      condition: "Excellent",
      outstandingFinance: false,
      interestedIn: "McLaren 570S",
    }), { status: "viewing-arranged", handledBy: "u-owner", firstRepliedAt: ago(14 * DAY - HOUR), valuation: { status: "accepted", amount: 29000, updatedAt: ago(12 * DAY) } }),

    enquiry("e-m4", "c-tom", 30 * DAY, carEnquiry("bmw-m4-competition-2021", "BMW M4 Competition", "viewing"), {
      status: "sold",
      handledBy: "u-owner",
      firstRepliedAt: ago(30 * DAY - HOUR),
      updatedAt: ago(12 * DAY),
    }),
    enquiry("e-tom-finance", "c-tom", 29 * DAY, (c) => ({
      kind: "finance",
      name: c.name,
      email: c.email,
      phone: c.phone,
      vehicle: "BMW M4",
      vehicleSlug: "bmw-m4-competition-2021",
      deposit: 10000,
      monthlyBudget: 650,
      hasPartExchange: false,
    }), { status: "sold", handledBy: "u-owner", firstRepliedAt: ago(29 * DAY - HOUR) }),

    enquiry("e-chloe", "c-chloe", 18 * DAY, (c) => ({
      kind: "part-exchange",
      name: c.name,
      email: c.email,
      phone: c.phone,
      registration: "SAMPLE PX4",
      make: "Tesla",
      model: "Model S",
      year: 2018,
      mileage: 88000,
      serviceHistory: "Not sure",
      motStatus: "Current MOT",
      keys: "2",
      condition: "Good",
      outstandingFinance: true,
    }), { status: "not-proceeding", closedReason: "price", handledBy: "u-staff", firstRepliedAt: ago(18 * DAY - 2 * HOUR), valuation: { status: "declined", amount: 18000, note: "Customer expected £24k.", updatedAt: ago(16 * DAY) } }),
    enquiry("e-grace-old", "c-grace", 25 * DAY, (c) => ({
      kind: "contact",
      name: c.name,
      email: c.email,
      enquiryType: "Something else",
      message: "Do you buy cars outright without a part exchange?",
    }), { status: "not-proceeding", closedReason: "no-reply", handledBy: "u-owner", firstRepliedAt: ago(25 * DAY - HOUR) }),
    enquiry("e-spam", null, 11 * DAY, () => ({
      kind: "contact",
      name: "SEO Services",
      email: "growth@example.com",
      enquiryType: "Something else",
      message: "We can get your website to page one of Google in 7 days, guaranteed.",
    }), { status: "not-proceeding", closedReason: "spam", firstRepliedAt: ago(11 * DAY - 10 * MINUTE) }),
    enquiry("e-kwame-finance", "c-kwame", 13 * DAY, (c) => ({
      kind: "finance",
      name: c.name,
      email: c.email,
      phone: c.phone,
      deposit: 5000,
      monthlyBudget: 500,
      hasPartExchange: true,
    }), { status: "not-proceeding", closedReason: "bought-elsewhere", handledBy: "u-staff", firstRepliedAt: ago(13 * DAY - 6 * HOUR) }),
  ];

  const activity: Record<string, EnquiryActivity[]> = {};
  let activitySeq = 0;
  const note = (enquiryId: string, body: string, authorId: string | null, ms: number, type: EnquiryActivity["type"] = "note") => {
    const author = team.find((member) => member.id === authorId);
    (activity[enquiryId] ??= []).push({
      id: `a-${(activitySeq += 1)}`,
      type,
      body,
      authorId,
      authorName: author?.name ?? "Website",
      createdAt: ago(ms),
    });
  };

  for (const item of enquiries) {
    const created = now - new Date(item.createdAt).getTime();
    note(item.id, "Enquiry received from the website.", null, created, "created");
    if (item.firstRepliedAt && item.handledBy) {
      const replied = now - new Date(item.firstRepliedAt).getTime();
      const member = team.find((person) => person.id === item.handledBy);
      note(item.id, `Assigned to ${member?.name}.`, item.handledBy, replied + MINUTE, "assigned");
      note(item.id, "Status changed from New to Contacted.", item.handledBy, replied, "status");
    }
  }
  note("e-james", "Called — wants to see the SVR next week. Sent the history by email.", "u-staff", 3 * DAY - 90 * MINUTE);
  note("e-ravi", "Replied on WhatsApp: the Macan is not confirmed in stock yet. Offered to call when it is.", "u-owner", 4 * DAY - 30 * MINUTE);
  note("e-ellie", "Initial guide £21,500, subject to inspection. Missing second key.", "u-owner", 5 * DAY, "valuation");
  note("e-kwame", "The F430 was sold before this site went live. Suggested the Huracán.", "u-staff", 7 * DAY - 4 * HOUR);
  note("e-ade", "Test drive booked. Licence copy received by email.", "u-owner", 9 * DAY - 50 * MINUTE);
  note("e-ade", "Status changed from Contacted to Viewing arranged.", "u-owner", 9 * DAY - 45 * MINUTE, "status");
  note("e-m4", "Status changed to Sold. Collected on the day.", "u-owner", 12 * DAY, "status");
  note("e-spam", "Closed as spam.", "u-owner", 11 * DAY - 10 * MINUTE, "status");

  // ---- Appointments ----------------------------------------------------------------------

  type A = MockDb["appointments"][number];
  const appointment = (a: Pick<A, "id" | "type" | "status" | "startsAt"> & Partial<A>): A => ({
    durationMinutes: 45,
    vehicleId: null,
    customerId: null,
    customerName: "",
    customerPhone: null,
    enquiryId: null,
    handledBy: "u-owner",
    notes: "",
    checks: { licenceSeen: false, insuranceConfirmed: false },
    createdAt: ago(2 * DAY),
    updatedAt: ago(2 * DAY),
    ...a,
  });

  const appointments: A[] = [
    appointment({ id: "ap-ade", type: "test-drive", status: "confirmed", startsAt: at(0, 13, 30), durationMinutes: 60, vehicleId: "s-bentley", customerId: "c-ade", customerName: "Adebayo Okafor", customerPhone: "07700 900118", enquiryId: "e-ade", checks: { licenceSeen: true, insuranceConfirmed: false }, notes: "Bring the finance paperwork to sign." }),
    appointment({ id: "ap-lucy", type: "viewing", status: "requested", startsAt: at(0, 16, 0), vehicleId: "s-pagoda", customerId: "c-lucy", customerName: "Lucy Harrington", customerPhone: "07700 900192", enquiryId: "e-lucy", handledBy: "u-staff", notes: "Asked to confirm by text in the morning." }),
    appointment({ id: "ap-james", type: "viewing", status: "confirmed", startsAt: at(1, 12, 30), vehicleId: "s-svr", customerId: "c-james", customerName: "James Fairbrother", customerPhone: "07700 900642", enquiryId: "e-james", handledBy: "u-staff" }),
    appointment({ id: "ap-nikhil", type: "test-drive", status: "confirmed", startsAt: at(3, 11, 0), durationMinutes: 60, vehicleId: "s-570s", customerId: "c-nikhil", customerName: "Nikhil Rao", customerPhone: "07700 900276", enquiryId: "e-nikhil", notes: "Out of hours — owner meeting him. Bringing the Cayenne for inspection." }),
    appointment({ id: "ap-walkin", type: "viewing", status: "requested", startsAt: at(5, 14, 0), vehicleId: "s-911", customerName: "Frank Ellison", customerId: "c-noemail", customerPhone: "07700 900499", notes: "Rang the showroom; wants to see the 911." }),
    appointment({ id: "ap-tom", type: "test-drive", status: "completed", startsAt: at(-13, 14, 0), vehicleId: "s-m4", customerId: "c-tom", customerName: "Tomasz Nowak", customerPhone: "07700 900204", enquiryId: "e-m4", checks: { licenceSeen: true, insuranceConfirmed: true } }),
    appointment({ id: "ap-chloe", type: "viewing", status: "no-show", startsAt: at(-15, 15, 30), vehicleId: "s-911", customerId: "c-chloe", customerName: "Chloe Dupont", customerPhone: "07700 900388", enquiryId: "e-chloe", handledBy: "u-staff" }),
    appointment({ id: "ap-cancelled", type: "viewing", status: "cancelled", startsAt: at(2, 12, 0), vehicleId: "s-huracan", customerId: "c-kwame", customerName: "Kwame Asante", customerPhone: "07700 900085", enquiryId: "e-kwame", handledBy: "u-staff", notes: "Customer cancelled — travelling." }),
  ];

  // ---- Settings -----------------------------------------------------------------------------
  // The dealership's published business facts, as in apps/web/src/lib/site.ts.

  const settings: Settings = {
    business: {
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
    },
    integrations: {
      storage: "connected",
      notifications: [
        { channel: "webhook", configured: false },
        { channel: "email", configured: false },
        { channel: "sms", configured: false },
      ],
      media: "local-disk",
    },
    compliance: {
      financePromotions: {
        enabled: false,
        detail: "Needs the firm's approved FCA status wording and a lender before any monthly figure can be shown.",
      },
      reservations: {
        enabled: false,
        depositGbp: null,
        detail: "Needs a payment provider, a confirmed deposit amount and approved refund terms.",
      },
      vatNumber: null,
      companyNumber: "15481206",
    },
    updatedAt: ago(10 * DAY),
  };

  return {
    version: MOCK_DB_VERSION,
    createdAt: new Date(now).toISOString(),
    team,
    vehicles,
    enquiries,
    activity,
    appointments,
    customers,
    settings,
  };
}
