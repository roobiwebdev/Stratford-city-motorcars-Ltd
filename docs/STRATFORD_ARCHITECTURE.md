# Stratford City Motorcars — architecture

How the public website and the admin work. The admin's frontend is built and
runs on in-browser sample data; the API it needs is specified in
[STRATFORD_ADMIN_CONTRACT.md](./STRATFORD_ADMIN_CONTRACT.md), and nothing on
the website depends on it. For what is finished,
what is waiting on the client and what must be set up before launch, see
[STRATFORD_BUILD_STATUS.md](./STRATFORD_BUILD_STATUS.md). For how the legacy
site and the client intake shaped the content, see
[STRATFORD_MIGRATION_AUDIT.md](./STRATFORD_MIGRATION_AUDIT.md).

## Shape of the system

```text
apps/web            Next.js 16 (App Router). Public site, media delivery,
                    enquiry handling.
apps/admin          Next.js 16 (App Router). The dealership admin, on its own
                    origin. Sample data until the API exists.
apps/server         Hono. Better-T-Stack template API (/api/auth). Not used by
                    the website.
packages/core       The shared contract: vehicle model, publishing rules,
                    formatters, and every admin type, status and permission.
packages/db         Drizzle schema + migrations: vehicle, lead, auth tables.
packages/auth       Better-T-Stack template auth config, used only by apps/server.
packages/env        Typed environment validation.
packages/ui         Design tokens and shared primitives.
```

One Next.js app serves everything a visitor touches. There is one source of
truth for stock — the `vehicle` table — read by the public pages. The store
interface can write, ready for the admin's API.

### Two runtime modes

| | `DATABASE_URL` set | `DATABASE_URL` unset |
| --- | --- | --- |
| Inventory source | Postgres (`vehicle` table) | Read-only seed records in `src/lib/inventory/data.ts` |
| Enquiries | Stored in `lead`, plus webhook if configured | Webhook only; with no webhook the form says it could not send |

Build and runtime must use the same `DATABASE_URL`: vehicle pages are
prerendered at build time from whichever source is configured.

## Inventory

Code: `apps/web/src/lib/inventory/`.

### Two layers

- **`VehicleRecord`** (`types.ts`) is what is stored and edited. Draft fields
  are nullable (`year`, `price`, `mileage`, `fuel`, …) so a half-finished car can
  be saved. It is validated with Zod (`schema.ts`) on every write and every read
  from Postgres.
- **`PublicVehicle`** is what the public site renders. It is produced only by
  `toPublicVehicle()` in `visibility.ts`, and only for records that pass the
  publishing rules. Library/stand-in media is stripped, empty alt text is filled
  from year, title and photo category, and a cover image is resolved.

No public component receives a `VehicleRecord`.

### Publishing rules (`visibility.ts`)

A car is on the website only when **all** of these hold:

1. Status is `published` or `sold` (`draft` and `archived` never appear).
2. Price is £20,000–£1,000,000 inclusive (`PUBLIC_PRICE_RANGE`), **or** the car
   is marked price on application (POA).
3. At least one **dealer exterior** and one **dealer interior** photograph
   (`REQUIRED_DEALER_PHOTOS`). Media with `provenance: "library"` never counts.
4. Title, make, model, year, mileage, fuel, transmission, body type, colour,
   description and a valid web address (slug) are filled in.

`publicationIssues(record)` returns every unmet rule as `{code, section,
message}` in plain English, ready to show to whoever edits stock. A car marked
published but failing a rule is withheld and logged once:
`[inventory] t4 (…) is published but withheld: missing-interior-photography`.

`listingRecommendations(record)` lists advice that does **not** block
publishing: the client's 20+ photo target (`LISTING_PHOTO_TARGET`), missing alt
text, no walkaround video, and similar.

### Lifecycle

| Status | Public page | Listings, filters, homepage, related, sitemap |
| --- | --- | --- |
| `draft` | 404 | No |
| `published` | 200 | Yes |
| `sold` | 200, marked SOLD; buying actions replaced by an invitation to ask about something similar | No |
| `archived` | 404 | No |

- **Featured** is hand-picked (`featured: true`) and only ever shows unsold
  public cars. The homepage never pads the grid with other stock.
- **Reserved** is a flag on a published car; it shows a badge and stays listed.
- **New arrival** is derived: listed within the last 30 days.
- **Sorting** defaults to price high to low. POA cars sort first in
  high-to-low and last in low-to-high.
- **Filters** are make and model only, as the client asked.
- **Changing a web address** appends the old slug to `previousSlugs`.
  `/vehicles/<old-slug>` and the legacy `/sales/<old-slug>` redirect (308) to
  the car's current page while it is public. (Next.js repeats the identical
  `Location` header on the page redirect; browsers and crawlers follow it.)

### Store and caching

- `store.ts` defines `InventoryStore`. `stores/postgres.ts` keeps each record as
  validated JSON in `vehicle.record`, with `slug` (unique), `status`
  (indexed) and `featured` as columns. A slug clash raises `SlugConflictError`.
  `stores/seed.ts` is read-only
  and throws `StoreNotWritableError` on writes.
- `repository.ts` is the only read path for public pages. Records are loaded
  through `unstable_cache` (tag `inventory`, 5 minute revalidate). Anything that
  writes stock must call `revalidateTag("inventory", { expire: 0 })` so the
  change is visible on the next request.
- Vehicle pages are prerendered for public cars at build time; a car published
  later is rendered on its first request.

### Seed and import

`data.ts` holds the seven legacy-site records as unfeatured **drafts** with
unknown history-check and warranty status. None is confirmed by the client.
`pnpm --filter web inventory:import-seed` copies them into Postgres (idempotent;
existing ids are left alone).

## Media

Code: `apps/web/src/lib/media/storage.ts`, `src/app/media/[...path]/route.ts`.

The admin's photo manager uploads through the API contract; the server side
of that upload is not built yet. Media is described on each record's `media`
array.

- **Photographs**: each carries a category (exterior, interior, detail,
  documents), width and height, alt text, `provenance` (`dealer` or `library`)
  and an optional credit.
- **Video**: a stored file, or a YouTube/Vimeo link. YouTube renders as a
  lightweight facade using `youtube-nocookie.com`. 360° spins are links.
- **Storage** (`storage.ts`): `MediaStorage` interface with a local-disk
  implementation under `MEDIA_ROOT` (default `apps/web/.data/media`,
  gitignored). Keys are validated against a strict pattern; path traversal
  returns 404. `MEDIA_PUBLIC_BASE_URL` is reserved for moving to object storage
  behind a CDN.
- **Delivery**: `/media/<key>` serves files with
  `Cache-Control: public, max-age=31536000, immutable` and range requests (for
  video). Photos render through `next/image` (AVIF, then WebP) with `sizes`
  matched to each layout; the first gallery image is eager with high fetch
  priority, everything else lazy.

## Enquiries

Code: `apps/web/src/lib/forms/`, `apps/web/src/lib/leads/`,
`apps/web/src/components/forms/`.

Forms: vehicle enquiry (general question, viewing request, part exchange,
finance — the request type is preselected from the car page's buttons),
finance enquiry, part-exchange valuation, contact.

```text
form → server action → Zod validation → spam checks → deliverLead()
                                                        ├─ insert into `lead` (if DATABASE_URL)
                                                        └─ LeadNotifier[] (webhook if LEADS_WEBHOOK_URL)
```

- **No fake success.** The customer sees a reference number only if the
  enquiry was stored **or** a notifier accepted it. Otherwise the form says it
  could not send and offers the phone and WhatsApp.
- **Spam**: hidden honeypot field (answered as "unavailable", never as
  success), rejection of messages with more than two links, and a per-IP limit
  of 6 submissions per 10 minutes. The limit is in memory, per server process.
- **Privacy in logs**: logs carry form kind, reference and channel outcome only.
  Names, emails, phone numbers and messages are never logged. The honeypot value
  is not forwarded to the webhook.
- **Viewings are requests, not bookings.** The success message says so.
- **Notifications**: the client wants email and SMS. No provider is chosen, so
  none is wired. The webhook (`LEADS_WEBHOOK_URL`, optional bearer
  `LEADS_WEBHOOK_TOKEN`) can be pointed at Zapier/Make/n8n today. A new channel
  is a `LeadNotifier` added to `configuredNotifiers()` in `notify.ts`.
- **Reading stored enquiries**: the admin's enquiry screens are built against
  the contract; until the API exists, stored enquiries are in the `lead` table
  with a `status` column defaulting to `new`.

## SEO

Code: `apps/web/src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`,
`next.config.ts`.

- Per-page titles, descriptions, canonicals and Open Graph/Twitter cards via
  `pageMetadata()`. The default share image is `public/brand/og-default.jpg`;
  vehicle pages use their cover photograph.
- JSON-LD: `AutoDealer` + `WebSite` graph on every public page; `Car` on
  vehicle pages with an `Offer` only when the car has a price (POA cars have
  none). Availability is `InStock`, `LimitedAvailability` (reserved) or
  `SoldOut`.
- `/vehicles` with any query string is `noindex, follow` and canonicalises to
  `/vehicles`.
- `sitemap.xml` lists the public pages and public unsold vehicles with image
  entries and `lastModified`. Legal placeholders, sold, draft and archived cars
  are excluded.
- Legacy URLs: `/sales` and `/used-cars-stratford` → `/vehicles`, `/mission` →
  `/about` (permanent). `/sales/<slug>` → the car's
  current page when it is public, otherwise `/vehicles` (308). `/hire` stays a
  404 — hire is not part of the business.
- Real 404 status with one `<title>` and `noindex`.

## Security headers

Set in `next.config.ts` for every route: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
a limited `Content-Security-Policy` (`frame-ancestors 'none'; base-uri 'self';
form-action 'self'; object-src 'none'`), `Permissions-Policy` denying camera,
microphone, geolocation, payment and USB, and HSTS (two years,
`includeSubDomains`). `X-Powered-By` is off. A full script/style CSP is not in
place (Next.js inline scripts would need nonces).

## Business facts and gated features

`apps/web/src/lib/site.ts` is the single place for name, address, phone,
WhatsApp, hours, company number and registered office, directions, and the
switches for features that need client or provider sign-off:

| Switch | Default | Turns on |
| --- | --- | --- |
| `finance.statusStatement` | `null` | Representative finance examples on vehicle pages and the FCA reference number |
| `reservations.enabled` + `depositGbp` + `RESERVATION_CHECKOUT_URL` (https) | off | "Reserve this car" link to a provider-hosted checkout |
| `compliance.vatNumber` | `null` | VAT number in the footer |

Nothing behind a switch renders until every part of it is set.

## Regression checks

- `pnpm --filter web check-content` scans source (and optionally built HTML)
  for copy the client rejected: hire, fabricated reviews, old hours and
  postcode, finance approval/broker claims, included warranty, blanket HPI,
  unqualified 24-hour or same-day promises, preparation guarantees, retired
  positioning, legacy contact details, stock-photo hosts.
- `pnpm --filter web check-inventory` runs 26 checks against the publishing
  rules, POA, featured selection, sold and archived handling, alt text and the
  legacy slugs. It fails if the price floor, the photography requirement or the
  featured rule is weakened.

## Shared contract

Code: `packages/core/src/`.

`vehicle.ts` (the record and public shapes), `visibility.ts` (publishing rules)
and `format.ts` moved here from the web app so the admin shows exactly the
rules the website enforces. `apps/web/src/lib/inventory/types.ts`,
`visibility.ts` and `apps/web/src/lib/format.ts` re-export them, so website
imports and `check-inventory` are unchanged. `visibility.ts` must keep to
type-only imports: the inventory check loads it with Node's type stripping.

The rest of the package is the admin's contract: stock, enquiries,
appointments, customers, team, settings, the overview, roles and capabilities,
list paging, errors and the `AdminApi` interface. The web app's form schemas
include a compile-time check that a stored enquiry payload still matches the
shape the admin reads.

## Admin

Code: `apps/admin/`. Details: [apps/admin/README.md](../apps/admin/README.md);
backend requirements: [STRATFORD_ADMIN_CONTRACT.md](./STRATFORD_ADMIN_CONTRACT.md).

```text
screen → TanStack Query → AdminApi ─┬─ mock (in-browser sample data, default)
                                    └─ http (/api/admin/*, NEXT_PUBLIC_ADMIN_DATA=api)
```

- **Separate app, separate origin** (port 3002), never indexed, never framed.
  It needs an API that owns sessions, roles and writes; it never reads the
  database itself.
- **Security** lives in the API. The admin hides what a role cannot do
  (`can()`), and the API refuses it on every request. Roles: owner and staff.
- **Screens**: overview; stock list and editor (publishing panel, photo
  manager, reserve, sell, archive); enquiries and detail (status, handler,
  notes, valuation, delete); part-exchange queue; viewings and test drives
  diary; customers; team; settings.
- **Honest by design**: no screen claims to contact a customer. Replies happen
  through call, WhatsApp and email links; the admin records what happened.
- **Concurrency**: every write carries the `updatedAt` it read; a mismatch is
  shown as "someone else saved this", never silently overwritten.
- **Website cache**: stock changes must revalidate the website's `inventory`
  tag through a secret-protected route on the website (not built yet).

