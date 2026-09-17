# Stratford City Motorcars — admin ↔ API contract

What the admin (`apps/admin`) expects from the backend. The admin is built and
runs today on in-browser sample data; this document is what an API must do for
it to run on real data with no screen changes.

Related: [architecture](./STRATFORD_ARCHITECTURE.md) ·
[build status](./STRATFORD_BUILD_STATUS.md) ·
[admin README](../apps/admin/README.md)

## Where the contract lives in code

| File | What it settles |
| --- | --- |
| `packages/core/src/api.ts` | `AdminApi` — every operation the admin calls |
| `packages/core/src/{stock,enquiry,appointment,customer,team,settings,overview,list}.ts` | Request and response shapes, status values and labels |
| `packages/core/src/vehicle.ts`, `visibility.ts` | The vehicle record and publishing rules, shared with the website |
| `packages/core/src/permissions.ts` | Roles and capabilities |
| `packages/core/src/errors.ts` | The error classes the admin shows, and their status codes |
| `apps/admin/src/lib/api/http.ts` | The HTTP client — the endpoints below, exactly |
| `apps/admin/src/lib/api/mock/index.ts` | A working reference implementation of every rule here |

Switch the admin to the API with `NEXT_PUBLIC_ADMIN_DATA=api` and
`NEXT_PUBLIC_ADMIN_API_URL=<origin>`. If a shape needs to change, change it in
`packages/core` — the admin, mock and client then stop compiling wherever they
disagree.

## Rules for every endpoint

- **Base path** `/api/admin`. JSON in and out, except the photo upload
  (multipart).
- **Session.** A cookie on the API origin, sent with `credentials: "include"`.
  The admin runs on its own origin, so the API must allow that origin with
  credentials (CORS), and the cookie must be `Secure`, `HttpOnly` and usable
  cross-site (`SameSite=None`, or serve both from one registrable domain and
  use `Lax`).
- **Authorisation is the API's job.** The admin hides actions a role cannot
  take; that is presentation only. Every write must check the capability in
  the tables below. Reads are open to any signed-in active member, except
  where noted (sale prices).
- **Versions.** Writes to an existing record send `expectedUpdatedAt` (the
  `updatedAt` the admin read). If the stored value differs, refuse with 409.
  Always return a new, strictly later `updatedAt` after a change.
- **No public sign-up.** Accounts exist only through invitations.
- **Nothing is sent to customers.** No endpoint here emails, texts or messages
  a customer. Team invitations are the only outbound email.
- **Logs** must not contain customer names, contact details or messages (the
  website follows the same rule).

### Errors

| Status | Class in the admin | Body |
| --- | --- | --- |
| 401 | `UnauthorisedError` — sends the user to sign in | `{ "error"? }` |
| 403 | `ForbiddenError` | `{ "error", "capability" }` |
| 404 | `NotFoundError` | `{ "error"? }` |
| 409 | `ConflictError` — "someone else saved this" | `{ "error"?, "currentUpdatedAt" }` |
| 422 | `ValidationError` — shown beside fields | `{ "error"?, "fields"?: { path: message }, "issues"?: PublicationIssue[] }` |
| other | shown as a toast | `{ "error"? }` |

Write `error` and field messages for the dealership, not a developer ("Another
car already uses this web address."). Field paths match the record's keys
(`slug`, `price`, `hours.closes`, `media.<id>`).

### Lists

Enquiries and customers are paged by the server: `page` (1-based), `pageSize`
(admin sends 25, or up to 500 for pickers), response
`{ items, total, page, pageSize }`. Query parameters with the value `all` or
empty are omitted by the admin. Stock and team lists are returned whole.

## Roles

| Capability | Owner | Staff | Used by |
| --- | --- | --- | --- |
| `stock.edit` | ✓ | ✓ | create, save, publish, unpublish, feature, reserve, sell, duplicate, upload |
| `stock.archive` | ✓ | | archive, restore |
| `stock.salePrice` | ✓ | | see and record `sale.salePrice` (null it in responses otherwise) |
| `enquiries.edit` | ✓ | ✓ | status, handler, notes, valuation |
| `enquiries.delete` | ✓ | | delete enquiry |
| `appointments.edit` | ✓ | ✓ | create, update appointments |
| `customers.edit` | ✓ | ✓ | update customer |
| `team.manage` | ✓ | | invite, change role, deactivate |
| `settings.edit` | ✓ | | update business details |

There must always be at least one active owner.

## Endpoints

### Session

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/session` | | `SessionUser` (401 when signed out — the admin treats it as `null`) |
| POST | `/session` | `{ email, password }` | `SessionUser`; 422 with one generic message for any wrong email or password; 429 when rate limited |
| DELETE | `/session` | | 204 |

A deactivated or invited member cannot sign in.

### Overview

| Method | Path | Response |
| --- | --- | --- |
| GET | `/overview` | `Overview` (`overview.ts`) |

Computed from stored records only — there is no visitor tracking. `stock.live`
counts published cars that pass the publishing rules; `withheld` are published
cars that fail them; `needsReply` is new enquiries oldest first (max 6);
`appointments.today` is in Europe/London.

### Stock

| Method | Path | Capability | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/vehicles` | | | `AdminVehicle[]`, every status |
| GET | `/vehicles/:id` | | | `AdminVehicle` |
| POST | `/vehicles` | stock.edit | | new empty draft `AdminVehicle` (a unique placeholder slug) |
| PUT | `/vehicles/:id` | stock.edit | `{ record: VehicleRecord, expectedUpdatedAt }` | `SaveVehicleResult` |
| POST | `/vehicles/:id/publish` | stock.edit | `{ expectedUpdatedAt }` | `SaveVehicleResult`; 422 with `issues` from `publicationIssues()` |
| POST | `/vehicles/:id/unpublish` | stock.edit | `{ expectedUpdatedAt }` | back to draft, `featured: false` |
| POST | `/vehicles/:id/featured` | stock.edit | `{ featured, expectedUpdatedAt }` | only published cars can be featured |
| POST | `/vehicles/:id/reservation` | stock.edit | `ReserveInput & { expectedUpdatedAt }` | `reserved: true`; only published cars |
| DELETE | `/vehicles/:id/reservation` | stock.edit | `{ expectedUpdatedAt }` | `reserved: false`, `reservation: null` |
| POST | `/vehicles/:id/sale` | stock.edit | `MarkSoldInput & { expectedUpdatedAt }` | status `sold`, `soldAt` set, reservation cleared, not featured; a linked enquiry becomes `sold` with an activity entry. `salePrice` kept only with stock.salePrice |
| DELETE | `/vehicles/:id/sale` | stock.edit | `{ expectedUpdatedAt }` | back to `published`, sale removed |
| POST | `/vehicles/:id/archive` | stock.archive | `{ expectedUpdatedAt }` | status `archived`, not featured or reserved |
| POST | `/vehicles/:id/restore` | stock.archive | `{ expectedUpdatedAt }` | back to `draft` |
| POST | `/vehicles/:id/duplicate` | stock.edit | | new draft copy: no media, registration, MOT history, slug history, sale or reservation |
| POST | `/vehicles/:id/media` | stock.edit | multipart `file`, `category`, `alt` | `VehicleImage` |

**Saving** (`PUT /vehicles/:id`):

- Validate with the website's `vehicleRecordSchema` (structure only — drafts
  may be incomplete).
- Keep `status`, `reserved`, `featured`, `listedAt`, `soldAt` and `createdAt`
  as stored; they change only through their own endpoints.
- Accept only image media whose ids are already stored for this car (uploads),
  so a crafted request cannot attach arbitrary URLs. Video and 360° links may
  be added. Delete stored files for images removed from `media`.
- A slug clash with another car's `slug` or `previousSlugs` is 422 on `slug`.
- If the slug changes on a car that has ever been listed, append the old slug
  to `previousSlugs` (the website redirects it).
- After any stock change, revalidate the website's `inventory` cache tag (see
  "Website cache" below).

**Uploading** (`POST /vehicles/:id/media`): accept JPEG, PNG, WebP or AVIF up
to 25 MB; refuse images smaller than 1200 × 800 (422 on `file`); re-encode,
strip metadata (GPS), store through `MediaStorage` under a generated key, and
record real width and height. **Append the image to the car's `media` without
changing `updatedAt`** — an editor may be open, and a photo taken on a phone
must not be lost if the editor is abandoned. The next save sets its category,
description, order and cover.

**`reservation` and `sale` are not part of `VehicleRecord`.** The website's
schema strips unknown keys and `PublicVehicle` is derived from the record, so
store them separately (columns on `vehicle`, or a sibling table). A sale price
must never be able to reach a public page.

`openEnquiryCount` is computed: enquiries whose `vehicleSlug` matches the car's
slug or a previous slug, with status `new`, `contacted` or `viewing-arranged`.

### Enquiries

| Method | Path | Capability | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | `/enquiries` | | `EnquiryListQuery` as query parameters | `Page<Enquiry>` |
| GET | `/enquiries/counts` | | `kind`? | `EnquiryCounts` |
| GET | `/enquiries/:id` | | | `{ enquiry, activity (newest first), appointments (by start) }` |
| PATCH | `/enquiries/:id/status` | enquiries.edit | `{ status, closedReason?, expectedUpdatedAt }` | `Enquiry` |
| PATCH | `/enquiries/:id/handler` | enquiries.edit | `{ memberId \| null, expectedUpdatedAt }` | `Enquiry`; member must be active |
| POST | `/enquiries/:id/notes` | enquiries.edit | `{ body }` (1–2000 chars) | `EnquiryActivity` |
| PUT | `/enquiries/:id/valuation` | enquiries.edit | `ValuationInput & { expectedUpdatedAt }` | `Enquiry`; part exchanges only; `amount` required unless `awaiting` |
| DELETE | `/enquiries/:id` | enquiries.delete | `{ reason: "spam" \| "erasure-request" }` | 204; removes the enquiry and its activity, unlinks appointments |

**List filters:** `status` (`open` = new, contacted, viewing arranged; or one
status), `kind`, `handledBy` (member id or `unassigned`), `valuation`,
`customerId`, `vehicleId`, `sort` (`newest` default, `oldest`), and `search`
across name, email, phone (digits), reference, car title and part-exchange
registration, make and model.

**Statuses:** `new → contacted → viewing-arranged → sold`, or `not-proceeding`
with a `closedReason` (`bought-elsewhere`, `price`, `car-sold`, `no-reply`,
`not-suitable`, `spam`, `other`). Any status may be set from any other.
Leaving `new` sets `firstRepliedAt` once. A status change on an unassigned
enquiry assigns it to the member making it.

**Activity:** record an entry (with author) for every status change, handler
change, valuation, note and appointment. The first entry is "Enquiry received
from the website." with no author.

**`vehicle`** is resolved from `vehicleSlug` against current and previous
slugs; `null` when no car matches (the admin says the car is no longer in
stock).

**Migrating the existing `lead` table:** `status` is `new | contacted | closed`
today. Map `closed` to `not-proceeding` with reason `other`. Add `handledBy`,
`closedReason`, `customerId`, `valuation`, `updatedAt`, `firstRepliedAt` and an
activity table. Keep the website's insert as it is and create the first
activity entry and customer link at that point.

### Viewings and test drives

| Method | Path | Capability | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | `/appointments` | | `from`, `to` (ISO, `to` exclusive), `status` (`active` = requested or confirmed), `type`, `vehicleId`, `customerId` | `Appointment[]` by start time |
| POST | `/appointments` | appointments.edit | `AppointmentInput` | `Appointment` |
| PUT | `/appointments/:id` | appointments.edit | `AppointmentInput & { expectedUpdatedAt }` | `Appointment` |

Required: `customerName`, a valid `startsAt`, and an existing `vehicleId`.
Times outside opening hours are allowed (weekends are by appointment); the admin
only warns. Creating one with an `enquiryId` adds an activity entry to that
enquiry and moves it from `new` or `contacted` to `viewing-arranged` — never
reopens a closed enquiry. `vehicleTitle` and `enquiryReference` are resolved
for display. Test-drive `checks` are record-keeping only; the client has not
confirmed how test drives are arranged (build status item 21).

### Customers

| Method | Path | Capability | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | `/customers` | | `search` (name, email, phone digits), `filter` (`open-enquiries`, `buyers`), `sort` (`recent`, `name`) | `Page<Customer>` |
| GET | `/customers/:id` | | | `CustomerDetail`; `salePrice` null without stock.salePrice |
| PUT | `/customers/:id` | customers.edit | `CustomerInput & { expectedUpdatedAt }` | `Customer`; at least one of email or phone |

The website has no customer record. Group enquiries into customers when they
arrive — suggested: match normalised email, then phone digits. The grouping is
imperfect (shared phones, several emails), so plan for correcting it later.
Counts and `lastActivityAt` are computed.

### Team

| Method | Path | Capability | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/team` | | | `TeamMember[]` |
| POST | `/team` | team.manage | `InviteMemberInput` | `TeamMember` (status `invited`); sends the invitation email with a single-use link to set a password; 422 if the email is already used |
| PATCH | `/team/:id` | team.manage | `{ role? , status?: "active" \| "deactivated" }` | `TeamMember`; 422 if it would leave no active owner, or a member deactivates themselves |
| POST | `/team/:id/invitation` | team.manage | | 204; only for `invited` members |

Deactivating a member ends their sessions and unassigns open enquiries they
were handling (with an activity entry). Role changes apply from their next
request.

### Settings

| Method | Path | Capability | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/settings` | | | `Settings` |
| PUT | `/settings/business` | settings.edit | `{ business: BusinessDetails, expectedUpdatedAt }` | `Settings` |

Validation: `phoneE164` `+44…`, `whatsappNumber` digits starting `44`, a UK
postcode, `HH:MM` times with closing after opening, at least one open day.

Business details are code in `apps/web/src/lib/site.ts` today. For edits to
reach the website, store them and have `site.ts` (and the structured data in
`seo.ts`) read from storage. `integrations` and `compliance` are read-only
reports; the finance and reservation switches stay developer-controlled
because they are regulated.

## Website cache

The website caches stock under the `inventory` tag. The admin cannot reach it
(another origin), so after every stock change the API should call a
revalidation route on the website, protected by a shared secret, that runs
`revalidateTag("inventory", { expire: 0 })`. That route does not exist yet.

## Not covered by the admin yet

- Password reset flow screens (the sign-in screen tells people to ask the owner
  for a new invitation).
- Two-factor authentication.
- Merging or splitting customers.
- Video file uploads (walkarounds are YouTube or Vimeo links).
- Email or SMS notification setup (reported in Settings, configured by a
  developer).
