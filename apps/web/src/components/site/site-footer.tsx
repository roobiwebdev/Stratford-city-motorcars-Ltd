import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { WhatsAppIcon } from "@/components/ui/icons";
import { getAvailableVehicles } from "@/lib/inventory/repository";
import type { PublicVehicle } from "@/lib/inventory/types";
import { getMapLinks, getSite } from "@/lib/settings";
import { whatsappLinks } from "@/lib/whatsapp";

type FooterHref = React.ComponentProps<typeof Link>["href"];

/** The most common values of a field across published stock, most frequent first. */
function topValues(vehicles: PublicVehicle[], pick: (vehicle: PublicVehicle) => string, limit: number) {
  const counts = new Map<string, number>();
  for (const vehicle of vehicles) counts.set(pick(vehicle), (counts.get(pick(vehicle)) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

/**
 * Stock shortcuts are derived from the cars actually for sale, so the footer
 * never links to a make with nothing behind it. With no stock only
 * "All vehicles" and "Book a viewing" remain.
 */
async function getStockLinks(): Promise<{ href: FooterHref; label: string }[]> {
  const vehicles = await getAvailableVehicles();

  return [
    { href: "/vehicles", label: "All vehicles" },
    ...topValues(vehicles, (vehicle) => vehicle.make, 4).map((make) => ({
      href: { pathname: "/vehicles", query: { make } },
      label: make,
    })),
    { href: "/contact#book-a-viewing", label: "Book a viewing" },
  ];
}

const serviceLinks = [
  { href: "/finance", label: "Car finance" },
  { href: "/part-exchange", label: "Part exchange" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
] as const;

export async function SiteFooter() {
  const [site, mapLinks] = await Promise.all([getSite(), getMapLinks()]);
  const stockLinks = await getStockLinks();

  return (
    <footer data-surface="dark" className="grain overflow-hidden border-t border-brass/12 bg-ink-950 text-bone">
      <div className="container-page py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div>
            <Image
              src="/brand/logo-bone.webp"
              alt={site.name}
              width={900}
              height={269}
              sizes="148px"
              className="h-11 w-auto"
            />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-bone/55">
              A small family-owned business in Stratford, trading in sports and
              luxury cars. Every enquiry is handled personally.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a
                href={site.phone.href}
                className="flex min-h-11 items-center gap-2.5 border border-bone/20 px-4 py-2.5 text-xs tracking-wide transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
              >
                <Phone className="size-3.5" />
                {site.phone.display}
              </a>
              <a
                href={whatsappLinks.general}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2.5 border border-bone/20 px-4 py-2.5 text-xs tracking-wide transition-colors hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-ink"
              >
                <WhatsAppIcon className="size-3.5" />
                WhatsApp
              </a>
            </div>
          </div>

          <FooterColumn title="Stock">
            {stockLinks.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Services">
            {serviceLinks.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Visit the showroom">
            <li className="flex gap-3 text-sm text-bone/60">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brass" />
              <a
                href={mapLinks.place}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block py-1 not-italic transition-colors hover:text-bone"
              >
                {site.address.street}
                <br />
                {site.address.locality} {site.address.postcode}
              </a>
            </li>
            <li className="flex gap-3 text-sm text-bone/60">
              <Mail className="mt-0.5 size-4 shrink-0 text-brass" />
              <a
                href={`mailto:${site.email}`}
                className="inline-block break-all py-1 transition-colors hover:text-bone"
              >
                {site.email}
              </a>
            </li>
            <li className="pt-1">
              <dl className="space-y-1 text-sm text-bone/60">
                {site.hours.summary.map((entry) => (
                  <div key={entry.label} className="flex justify-between gap-4">
                    <dt>{entry.label}</dt>
                    <dd data-numeric className="text-bone/80">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          </FooterColumn>
        </div>

        {/* The name, set across the full measure in the logo's Roman capitals.
            Decorative: the name is already in the logo and the legal line. */}
        <div aria-hidden className="reveal mt-16 select-none md:mt-24">
          <svg viewBox="0 0 1000 92" className="block w-full">
            <defs>
              <linearGradient id="footer-wordmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brass)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--color-brass)" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="78"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
              fill="url(#footer-wordmark)"
              className="font-roman"
              style={{ fontSize: 96, fontWeight: 400, letterSpacing: "0.02em" }}
            >
              STRATFORD CITY
            </text>
          </svg>
        </div>

        <div className="mt-10 border-t border-bone/10 pt-8 md:mt-14">
          <div className="flex flex-col justify-between gap-4 text-xs text-bone/60 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <p>
                © {new Date().getFullYear()} {site.name}. All rights reserved.
              </p>
              <p className="max-w-xl leading-relaxed">
                {site.company.legalName}. Registered in {site.company.registeredIn}, company number{" "}
                {site.company.number}. Registered office: {site.company.registeredOffice}.
              </p>
              <p>
                Built by{" "}
                <a
                  href="https://clientreach.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bone/80 underline-offset-4 transition-colors hover:text-brass hover:underline"
                >
                  ClientReach AI
                </a>
              </p>
            </div>
            <nav aria-label="Legal">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-bone">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-bone">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="transition-colors hover:text-bone">
                    Cookies
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.24em] text-brass">
        {title}
      </h2>
      <ul className="mt-4 space-y-1">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: FooterHref;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex min-h-9 items-center py-1.5 text-sm text-bone/60 transition-colors duration-300 hover:text-bone"
      >
        {/* A brass dash draws in ahead of the label on hover. */}
        <span
          aria-hidden
          className="mr-0 h-px w-0 bg-brass transition-[width,margin] duration-500 ease-[var(--ease-out-expo)] group-hover:mr-2.5 group-hover:w-3"
        />
        {children}
      </Link>
    </li>
  );
}
