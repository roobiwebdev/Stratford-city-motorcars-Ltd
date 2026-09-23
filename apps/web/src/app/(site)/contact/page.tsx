import type { Metadata } from "next";
import { Check, Mail, MessageSquare, Phone } from "lucide-react";

import { ContactForm } from "@/components/forms/contact-form";
import { FaqSection } from "@/components/site/faq-section";
import { PageHero } from "@/components/site/page-hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { getSite } from "@/lib/settings";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Contact, Viewings & Directions — Stratford, East London",
  description: `Call, WhatsApp or email us, book a viewing, or visit the showroom at ${site.address.full}. Free parking on site. Open Monday to Friday, ${site.hours.open.opens}–${site.hours.open.closes}; weekends by appointment.`,
  path: "/contact",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default async function ContactPage() {
  const site = await getSite();

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Contact"
        title="Talk to a person, not a queue"
        lede="Call us, message us on WhatsApp, or send a note below."
        crumbs={crumbs}
      >
        {/* Direct channels first — most people arriving here want to call. */}
        <div className="mt-12 grid gap-px bg-bone/12 sm:grid-cols-3">
          <ChannelCard
            href={site.phone.href}
            icon={<Phone className="size-5" />}
            label="Call the showroom"
            value={site.phone.display}
            detail={site.hours.compact}
          />
          <ChannelCard
            href={whatsappLinks.general}
            external
            icon={<WhatsAppIcon className="size-5" />}
            label="WhatsApp"
            value={site.whatsapp.display}
            detail="Questions, photos and out-of-hours viewings"
          />
          <ChannelCard
            href={`mailto:${site.email}`}
            icon={<Mail className="size-5" />}
            label="Email"
            value={site.email}
            detail="For anything longer or with attachments"
          />
        </div>
      </PageHero>

      {/* ---- Book a viewing ---------------------------------------------------- */}
      <Section id="book-a-viewing" tinted size="md" className="scroll-mt-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20">
            <div>
              <Eyebrow>Book a viewing</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">See the car before you decide</h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Tell us which car and when suits you. We&rsquo;ll confirm a time by phone or WhatsApp.
              </p>

              {/* The hours, the weekend rule and the out-of-hours note are in
                  the card beside this — repeating them here only added words. */}
              <ul className="mt-8 space-y-4">
                {[
                  "Found the car online? Use “Book a viewing” on its page — the details come straight to us.",
                  `Free parking on site at ${site.address.full}.`,
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-relaxed">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--rule)]" />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                <ExternalButtonLink
                  href={whatsappLinks.bookViewing}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  <WhatsAppIcon className="size-4" />
                  Request on WhatsApp
                </ExternalButtonLink>
                <ExternalButtonLink href={site.phone.href} variant="outline" size="md" className="w-full sm:w-auto">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ButtonLink href="/vehicles" variant="ghost" size="md" className="w-full sm:w-auto">
                  Choose a car
                </ButtonLink>
              </div>
            </div>

            <div className="self-start border border-[var(--border)] bg-[var(--background)]">
              <h3 className="border-b border-[var(--border)] px-7 py-5 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                Opening hours
              </h3>
              <dl className="divide-y divide-[var(--border)]">
                {site.hours.summary.map((entry) => (
                  <div key={entry.label} className="flex items-baseline justify-between gap-6 px-7 py-5">
                    <dt className="text-[var(--muted-foreground)]">{entry.label}</dt>
                    <dd data-numeric className="text-right font-display text-lg">
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-[var(--border)] px-7 py-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Viewings outside these hours can be arranged — message us on WhatsApp or send a text.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Form ----------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Send a message</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                Tell us what you need
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                A car, finance, a valuation, anything else. We come back to you personally.
              </p>

              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <div className="flex items-start gap-4">
                  <MessageSquare
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-[var(--rule)]"
                  />
                  <div>
                    <h3 className="font-medium">Looking for something specific?</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                      We hold more than we list online. Tell us the make, model and budget.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] p-6 md:p-9">
              <ContactForm />
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Finding us ------------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          {/* The directions take the panel's first column: the address, phone
              and email it usually holds are already at the top of this page. */}
          <ShowroomPanel showHours={false}>
            <div>
              <Eyebrow>Finding us</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.85rem,3.4vw,2.5rem)] leading-[1.08]">
                {site.address.street}, {site.address.locality} {site.address.postcode}
              </h2>
              <dl className="mt-8 space-y-5">
                {[
                  { term: "Sat nav", detail: site.directions.satNav },
                  { term: "On foot", detail: site.directions.onFoot },
                  { term: "By car", detail: site.directions.byCar },
                ].map((row) => (
                  <div key={row.term} className="grid gap-1 sm:grid-cols-[6rem_1fr] sm:gap-6">
                    <dt className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--rule)] sm:pt-1">
                      {row.term}
                    </dt>
                    <dd className="text-sm leading-relaxed text-[var(--muted-foreground)]">{row.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </ShowroomPanel>
        </Container>
      </Section>

      <FaqSection
        // Parking and the hours are answered on the page above, so the list is
        // the three questions someone still asks before setting off.
        faqs={faqsByCategory("Visiting").filter((faq) => faq.id !== "parking")}
        eyebrow="Before you come"
        title="Visiting questions"
      />
    </>
  );
}

function ChannelCard({
  href,
  external = false,
  icon,
  label,
  value,
  detail,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group bg-ink-950 p-6 transition-colors duration-300 hover:bg-ink-900 md:p-7"
    >
      <span
        aria-hidden
        className="inline-flex text-brass transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5"
      >
        {icon}
      </span>
      <p className="mt-4 font-roman text-[0.625rem] uppercase tracking-[0.2em] text-bone/50">
        {label}
      </p>
      <p className="mt-2 break-all font-display text-lg text-bone">{value}</p>
      <p className="mt-1.5 text-xs text-bone/60">{detail}</p>
    </a>
  );
}
