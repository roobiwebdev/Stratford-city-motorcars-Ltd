# Stratford City Motorcars — build status

Branch `feat/phase-1-9-build`, September 2026. Not merged, pushed or deployed.

Related: [architecture](./STRATFORD_ARCHITECTURE.md) ·
[admin contract](./STRATFORD_ADMIN_CONTRACT.md) ·
[migration audit](./STRATFORD_MIGRATION_AUDIT.md) ·
[web app README](../apps/web/README.md)

Everything under **Completed** was exercised against a production build
(`next build` + `next start`), not only type-checked. Results are in
[Verification record](#verification-record).

> **Admin rebuilt as its own app (frontend).** The Phase 9 dashboard inside the
> web app was removed on request. A new admin now lives in `apps/admin`
> (branch `feat/admin-dashboard`): every screen is built and runs on
> in-browser sample data. The API it needs is specified in
> [STRATFORD_ADMIN_CONTRACT.md](./STRATFORD_ADMIN_CONTRACT.md) and is not
> built. The website still has no `/login`, `/dashboard` or `/admin` routes.

---

## Completed

### Content and positioning (Phase 1)

- Client intake and legacy-site forensic audit, with every legacy page, claim,
  URL, image and vehicle classified KEEP / REWRITE / REPLACE / DELETE / CLIENT
  CONFIRMATION REQUIRED (`docs/STRATFORD_MIGRATION_AUDIT.md`).
- Copy follows the intake: a small family-owned business trading in sports and
  luxury cars, with the client's own line kept verbatim on About.
- Part-exchange turnaround is shown only as "usually within 24 hours on
  weekdays"; no same-day, preparation, HPI, warranty, finance-approval,
  broker/lender, prestige/classic-specialist or hire claims; no testimonials.
- Company name, number 15481206 and registered office (21–25 Romford Road,
  E15 4LJ) in the footer, checked against Companies House.

### One inventory source (Phase 2)

- `vehicle` table (Postgres) as the single source of truth, with a read-only
  seed fallback when no database is configured.
- Editable `VehicleRecord` and strict `PublicVehicle`; the public site can only
  receive the latter.
- Publishing rules enforced in one place: status, £20k–£1M or POA, dealer
  exterior + interior photos, required details. Draft / published / sold /
  archived lifecycle, reserved, hand-picked featured, POA sorting, make/model
  filters, price high-to-low default.
- The seven legacy records imported as unconfirmed drafts; old slugs preserved.

### Admin frontend

- `apps/admin`: separate Next.js app (port 3002), noindex, security headers,
  on the website's design system at working size.
- Screens: sign in; overview (new enquiries, today's viewings, cars held off the
  website, listings to finish, stock figures); stock list with status tabs,
  search, make filter, sort and lifecycle actions; vehicle editor with seven
  sections, live publishing panel linked to the website's own rules, photo
  manager (upload with progress and size check, categories, descriptions,
  cover, reorder, remove, YouTube/Vimeo and 360° links), reserve, mark sold,
  archive, duplicate; enquiries with status tabs, filters, search and paging;
  enquiry detail with contact links, submission by form type, status and
  reason, handler, notes timeline, part-exchange valuation, arrange a viewing,
  delete for spam or erasure; part-exchange queue; viewings and test drives
  week diary and phone agenda; customers and customer history; team with
  invite, role change and deactivation; settings with business details, hours,
  notification and compliance status.
- Owner and staff roles, shown and hidden per capability.
- `packages/core`: shared contract; website re-exports keep its imports.
- Sample data implements the whole contract in the browser, including
  sessions, role refusals, version conflicts and validation, with controls for
  slow and failing requests.

### Public site (Phase 3)

- Home, stock list, vehicle page, finance, part exchange, about, contact,
  privacy/terms/cookies placeholders, 404 and error pages.
- Vehicle page: gallery with keyboard lightbox, price panel (POA, sold,
  reserved, admin fee), WhatsApp/call/book-a-viewing, specification, history
  and checks (HPI, warranty, service, MOT history, V5C, ULEZ — shown only when
  recorded), walkaround video, features, enquiry form with request types,
  prefilled part-exchange and finance links, related cars, mobile action bar.
- Representative finance example and "reserve this car" are built but switched
  off until the client and providers are confirmed (`site.ts`).

### Public content (content population)

- Homepage: hero with View cars / Book a viewing / WhatsApp and four confirmed
  facts; a deliberate current-stock panel when nothing is listed; why buy from
  us; the browse → enquire → view → buy journey with ways to pay; finance
  products and terms; part exchange; an About band with the client's verbatim
  line; the showroom; a homepage FAQ; closing CTA.
- Stock page: empty-state panel, viewing/finance/part-exchange next steps and
  buying FAQs. Car pages: a "Buying this car" section.
- Finance: comparison, terms explained without figures, how a finance enquiry
  works, other ways to pay, finance FAQs.
- Part exchange: confirmed four-step process, part-exchange FAQs.
- About: rewritten around the client's positioning, how we work, where the
  cars come from, buying journey, showroom.
- Contact: Book a viewing section with hours, directions and visiting FAQs.
- Address shown as the client gives it (21–25 Romford Road, London E15 4LJ);
  hours Monday–Friday 12:00–17:00, Saturday–Sunday appointment only, bank
  holidays and closures by appointment.
- Content decisions are recorded in section 10 of the migration audit.

### Media (Phase 4)

- Media model on each car: photo categories, alt text, cover, dealer vs
  library provenance, video file or YouTube/Vimeo link, 360° link.
- `next/image` with AVIF/WebP and per-layout `sizes`; eager, high-priority first
  gallery image; `/media/*` served with immutable caching and range requests.
- No upload tool (removed with the dashboard).
- Retired brand assets replaced (Open Graph card, favicon and app icons with the
  new positioning).

### SEO and legacy redirects (Phase 5)

- Per-page metadata and canonicals, AutoDealer/WebSite/Car/Breadcrumb JSON-LD
  (no `Offer` for POA), sitemap with vehicle images, robots rules.
- Permanent redirects for `/sales`, `/used-cars-stratford`, `/mission` and
  `/sales/<legacy-slug>`. Renamed cars redirect from their old
  `/vehicles/<slug>`.
- Filtered stock views are `noindex` with a canonical to `/vehicles`; real 404s.

### Enquiries (Phase 6)

- Four forms (vehicle enquiry with request type, finance, part exchange,
  contact), server-side Zod validation, field errors with focus management.
- Enquiries stored in the `lead` table and/or sent to a webhook; success is
  shown only when one of those worked. Honest failure otherwise.
- Honeypot, link-count rejection, per-IP throttle; no personal data in logs.

### Responsiveness and accessibility (Phase 7)

- No horizontal overflow at 1440, 1280, 1024, 834, 768, 430, 390 and 375px.
- Touch targets of at least 44px for controls; focus-trapped dialogs (lightbox,
  filters, mobile nav, confirmations) that return focus; skip link.
- Content visible without JavaScript; reveal animation only below the fold and
  inert under reduced motion.

### Performance and hardening (Phase 8)

- Security headers (nosniff, referrer policy, frame denial, limited CSP,
  permissions policy, HSTS), no `X-Powered-By`, error boundaries that do not
  leak details.

---

## Client confirmation required

Nothing here is published until the client confirms it. Items 1–17 match the
register in the migration audit.

1. Which cars go online first, with prices or POA. None of the seven legacy
   records is confirmed.
2. Correct prices for the Rolls-Royce Dawn and Corniche, or POA.
3. Order and wording of the three promises (trust and transparency, quality
   standards, personal service).
4. Public wording for vehicle preparation (service and MOT), if any.
5. Whether to promise a response time.
6. FCA status wording (credit broker, lender or introducer) and FRN display.
7. Lender panel, representative APR and representative example.
8. Whether a finance calculator and soft-search check are wanted, and with
   which provider.
9. Reservation deposit amount (£100–£500), refund terms and payment provider.
10. Admin, documentation and delivery fees: amounts and when they apply.
11. Warranty provider, availability and term ranges per car.
12. Approved privacy policy, terms and conditions (including distance sales),
    complaints procedure and cookie policy.
13. Whether "Ltd" should appear in customer-facing copy beyond the footer.
14. Trading-history wording (trading since 2019 vs incorporated 2024).
15. Instagram and TikTok handles, if they should be linked.
16. Contact form enquiry types.
17. Canonical domain (`www.stratfordcitymotorcars.com`) and who holds the
    registrar/DNS login.
18. That one dealer exterior plus one dealer interior photograph is the right
    minimum to publish (the 20+ target is advisory).
19. The £20,000–£1,000,000 public price range, and how to treat a genuine car
    outside it.
20. Per-car HPI status, service history, MOT history and V5C details — entered
    only from the client's records.
21. Test drives: how they are arranged (insurance, licence checks) — the site
    only says requests are confirmed individually.
22. Finance figures removed from the product descriptions ("deposit from 10%",
    "terms up to 5 years", "fixed interest rates"): restore only with the chosen
    lender's terms.
23. Part-exchange conditions from the old terms ("valid MOT and roadworthy",
    "we reserve the right to decline"): removed pending confirmation.
24. "No obligation" and "competitive prices set from the market" wording on the
    part-exchange, homepage and About pages.

## External setup required

None of these are configured, and no credentials or providers have been
assumed.

| Item | Needed for | Notes |
| --- | --- | --- |
| Admin API | Stock, photos, enquiries, viewings, customers, team and settings from the admin | Frontend built on sample data; API specified in the admin contract, not built |
| Production Postgres | Inventory, enquiries | Run `pnpm --filter @Stratford-city-motorcars-Ltd/db db:migrate` (the root `pnpm db:migrate` goes through turbo, which needs an interactive terminal), then optionally `pnpm --filter web inventory:import-seed` |
| Persistent media storage | Vehicle photos and video | Local disk today (`MEDIA_ROOT`). Needs a host with a persistent volume, or an object-storage implementation of `MediaStorage` |
| Hosting | Everything | A long-running Node server (`next start`) is assumed. Serverless hosting needs object storage and a shared rate limiter first |
| Email and SMS notifications | Telling the business about enquiries | Webhook (`LEADS_WEBHOOK_URL`) to Zapier/Make/n8n works today; or a provider-specific `LeadNotifier` |
| Domain and DNS | Launch | Set `NEXT_PUBLIC_SITE_URL`; redirect the apex and any `.co.uk` to the canonical host |
| Finance provider and FCA wording | Monthly figures, soft search | Then set `site.finance.statusStatement` |
| Payment provider | Online reservations | Hosted checkout URL in `RESERVATION_CHECKOUT_URL`, then enable in `site.ts` |
| Registration lookup (e.g. DVLA/MOT history API) | Faster data entry | Not built; fields are entered manually |
| Analytics with consent | Measurement | Not built; would need a cookie banner and policy |
| Google Business Profile | Local search, reviews | Client-side task |
| CAPTCHA or shared rate limiting | Spam at scale | Current throttle is in memory per process |

## Launch blockers

The site should not go live until these are resolved:

1. **No way to manage stock yet.** The admin's screens exist but run on sample
   data until its API is built (see the admin contract).
2. **No confirmed stock.** Every record is a draft and no car has dealer
   photography, so the public site would show no cars.
3. **Legal pages are placeholders.** The forms collect names, emails and phone
   numbers; an approved privacy notice must exist before they go live.
4. **Production database** is not provisioned.
5. **Persistent media storage** is not provisioned.
6. **No enquiry notification.** Without a webhook or provider, enquiries sit in
   the database unseen and nobody is alerted.
7. **Canonical domain and DNS** are not configured.
8. **Finance page wording** should be reviewed against the firm's confirmed FCA
   status before launch (no figures or approval claims are shown today).

---

## Known risks and limitations

- **Rate limiting is in memory.** It resets on restart and is not shared across
  instances.
- **Media** is on local disk; video is served as stored (no transcoding or
  poster generation).
- **CSP** does not restrict scripts or styles (Next.js inline scripts would need
  nonces).
- **Dependency audit:** `pnpm audit --prod` reports one moderate advisory
  (esbuild dev server, GHSA-67mh-4wv8-2f99) reached through `drizzle-kit`, a
  development tool not shipped to the browser or run in production serving.
- **History:** commit `b581ff3` does not build on its own (`6e243a6` completes
  it). Both were superseded by the dashboard removal.
- **Home page LCP** is the H1 text; Lighthouse attributes most of it to web-font
  render delay (see results below).
- **Page redirects for renamed cars** carry the same `Location` header twice
  (Next.js behaviour); browsers follow it, verified in Chromium.
- `apps/server` and `packages/auth` are Better-T-Stack template code, restored
  to their original form; the website does not use them.

---

## Verification record

Run on Linux (Node 26.8.1, pnpm 11.3.0, Chromium via puppeteer-core, axe-core,
Lighthouse), against local Postgres 18 (PGlite) with test fixtures that exist
only in the local test database.

### Admin frontend (September 2026, macOS, Node 24, Chromium via playwright-core, axe-core)

Run against the admin dev server on sample data, and production builds of both
apps.

| Check | Result |
| --- | --- |
| `pnpm check-types` (core, ui, web, admin, server) | Pass |
| `next build` — admin and web | Pass; web route table unchanged |
| `check-content` (source and built HTML), `check-inventory` | Pass; 26/26 |
| Journeys: sign-in redirects and errors, create → validate → upload (undersized refused) → publish, unsaved-changes guard, enquiry status/note/viewing/not-proceeding/delete, reserve and sell with enquiry link, failed load and failed save recovery, staff restrictions, mobile drawer | 28/28 |
| Horizontal overflow at 390px, 10 screens | None |
| axe-core (WCAG 2.1 AA + best practice), 13 screens at 1280 and 390 | No violations |
| Console errors during journeys | None |

Not verified: the HTTP client against a real API (none exists), Safari and
Firefox, real devices, screen readers beyond axe.

### After removing the dashboard (current state)

| Check | Result |
| --- | --- |
| `pnpm check-types` | Pass |
| `pnpm --filter web check-content` (source and built HTML) | Pass |
| `pnpm --filter web check-inventory` | 26/26 pass |
| `next build` with and without `DATABASE_URL` | Pass; route table lists only public routes, `/media/*` and `/sales/[slug]` |
| Public routes (database mode) | All 200; hidden car 404; legacy redirects 308 |
| `/login`, `/dashboard`, `/dashboard/inventory`, `/admin`, `/api/auth/*`, `/api/dashboard/media` | 404 |
| `robots.txt` | Allows everything; sitemap listed |
| Horizontal overflow, 8 widths × public pages | None |
| axe-core, public pages at 1280 and 390 | No violations |
| Keyboard (lightbox, filter sheet, mobile nav, skip link) | 11/11 |
| Forms (validation, focus, success, viewing rules, honeypot, links, throttle, prefill) | 13/13; webhook received every successful submission |
| Security headers on `/` | All six present |
| No-JavaScript render of home | All content visible |
| Console errors on public pages | None (except the expected 404 resource on `/hire`) |

### Earlier results for the public site (before the removal)

These covered website code the removal did not change.

| Check | Result |
| --- | --- |
| Mutation: price floor lowered / photo minimum disabled | check-inventory fails, as intended |
| `drizzle-kit migrate` on an empty database | Creates `account`, `lead`, `session`, `user`, `vehicle`, `verification` |
| `inventory:import-seed`, run twice | 7 drafts imported, none featured; second run skips all 7 |
| Server log PII scan after form tests | 0 matches for test names, emails and phones |
| Renamed car (old slug in `previousSlugs`) | Old `/vehicles/` and `/sales/` URLs 308 to the current page |
| Unknown, draft and malformed vehicle slugs | 404 |
| Image sizing (home, stock, vehicle; 390@3x and 1440@2x) | CLS 0; vehicle photos ≤1.31× rendered size; logo 1.77× (5 KB) |

Lighthouse (mobile emulation, local production server):

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 92 | 100 | 100 | 100 | 3.4 s | 0 | 42 ms |
| Stock | 90 | 100 | 100 | 100 | 3.5 s | 0.023 | 53 ms |
| Vehicle | 93 | 100 | 100 | 100 | 3.2 s | 0 | 59 ms |
| Contact | 93 | 100 | 100 | 100 | 3.2 s | 0 | 68 ms |

Local results with simulated mobile throttling; production numbers depend on
hosting, CDN and real photographs.

### Not verified

- Real devices (tested in Chromium emulation only), Safari and Firefox.
- Deployment to any hosting provider and real DNS.
- Real email/SMS delivery (only a local webhook receiver).
- Load and screen readers beyond axe-core automated checks.
