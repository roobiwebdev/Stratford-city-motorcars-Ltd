# Stratford City Motorcars — admin

The dealership's admin: stock, photographs, enquiries, part-exchange
valuations, viewings and test drives, customers, the team and business
settings. Next.js 16 (App Router), React 19, Tailwind v4, TanStack Query. Its
own app on its own origin, port 3002.

- **What the backend must provide:** [docs/STRATFORD_ADMIN_CONTRACT.md](../../docs/STRATFORD_ADMIN_CONTRACT.md)
- **How it fits with the website:** [docs/STRATFORD_ARCHITECTURE.md](../../docs/STRATFORD_ARCHITECTURE.md)

## Quick start

```bash
pnpm install
pnpm dev:admin        # http://localhost:3002
```

With no configuration it runs on **sample data** in the browser. Sign in as
`owner@example.com` or `staff@example.com`, password `stratford-sample` (the
sign-in page has buttons for both).

## Environment

See [`.env.example`](./.env.example). Everything here reaches the browser.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ADMIN_DATA` | `mock` (default) or `api` |
| `NEXT_PUBLIC_ADMIN_API_URL` | The API origin; required for `api` |
| `NEXT_PUBLIC_SITE_URL` | The website, for "view on website" links and `/media/…` photographs |
| `MEDIA_PUBLIC_BASE_URL` | Optional; a media CDN host allowed for images |

## Sample data

`src/lib/api/mock/` implements the whole API contract in the browser, with the
same rules the API must enforce: sessions, role checks, version conflicts,
publishing rules and validation. Customers are invented (example.com emails,
07700 900xxx numbers); photographs are placeholders; the seven legacy cars are
unconfirmed drafts as in the website's seed.

Changes are kept in the tab's `sessionStorage` until the tab closes. The
**Sample data** button in the header switches between the owner and staff
views, slows the network, makes requests fail, and resets everything — use it
to review loading, error and permission states. Nothing is ever sent anywhere.

## Where things live

```text
src/app/sign-in/            Sign in (outside the shell)
src/app/(admin)/            Every screen behind a session
src/components/shell/       Sidebar, top bar, drawer, routes, sample controls
src/components/ui/          The admin's UI kit (buttons, table, dialogs, forms…)
src/components/<area>/      overview, stock, enquiries, viewings, customers, team, settings
src/lib/api/                index.ts picks mock or http; http.ts is the real client
src/lib/query.ts            Query client, keys, useAdminMutation
src/lib/session.tsx         Session gate, useSession(), <Can>
src/lib/format.ts           Dates in Europe/London, relative times
```

Shared with the website, from `packages/core`: the vehicle model, publishing
rules, formatters, and every admin type, status label and permission.

## Conventions

- **Screens talk only to `api`.** No screen imports sample data. Every write
  goes through `useAdminMutation`, which refreshes all admin queries on
  success.
- **Permissions hide, the API refuses.** `can()` / `<Can>` decide what is
  offered; the API checks the same capability on every write.
- **Every list has** loading rows, an empty state, a no-matches state with
  "Clear filters", and an error state with "Try again". Paged lists keep the
  previous page visible while the next loads.
- **Forms** show field errors from the API beside the field, keep input on
  failure, warn before leaving with unsaved changes, and report conflicts
  ("someone else saved this") rather than overwriting.
- **Destructive actions** confirm first; permanent deletion also asks for the
  reference to be typed.
- **Nothing pretends to send.** The admin records what happened; contact with
  customers happens by phone, WhatsApp or email links, and screens say so.
- **Responsive:** sidebar from `lg`, top bar and drawer below; tables become
  cards below `md`; dialogs become sheets on phones; the editor keeps Save and
  Publish in a bottom bar on phones. Touch targets are 44px below `sm`.

## Design

The website's system at working size (`packages/ui/src/styles/globals.css`,
plus `src/index.css`): ink sidebar with a brass active marker, paper workspace
with white hairline panels, 2px corners, Newsreader titles, Cinzel eyebrows,
Archivo UI text with tabular figures. Status badges are told apart by fill,
outline and dash — never by colour alone — with brass for anything that wants
attention.

## Checks

```bash
pnpm --filter admin check-types
pnpm --filter admin build
```
