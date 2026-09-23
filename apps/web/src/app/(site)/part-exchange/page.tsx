import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";

import { PartExchangeForm } from "@/components/forms/part-exchange-form";
import { FaqSection } from "@/components/site/faq-section";
import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { partExchangeChecklist, partExchangeSteps } from "@/lib/content/services";
import { resolveVehicleBySlug } from "@/lib/inventory/repository";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/*
 * Four steps, then the form. The "what happens next" band told the same four
 * steps a second time — the figure in 24 hours, the inspection that confirms
 * it, the value coming off the next car, no obligation — so it went. Its
 * inspection and outstanding-finance wording is not lost: the form carries it
 * verbatim, where someone is actually committing. Every qualifier the client
 * attached to a fact still travels with that fact.
 */
export const metadata: Metadata = pageMetadata({
  title: "Part Exchange Your Car — Stratford, East London",
  description:
    "Put your current car towards your next one. Tell us about it and we'll usually come back within 24 hours on weekdays with an initial valuation, confirmed on inspection.",
  path: "/part-exchange",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Part Exchange", path: "/part-exchange" },
];

export default function PartExchangePage(props: PageProps<"/part-exchange">) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Part exchange"
        title="Your car can cover most of it"
        lede="Send us its details. We'll usually come back within 24 hours on weekdays with an initial figure. No obligation."
        crumbs={crumbs}
      />

      {/* ---- Steps --------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading eyebrow="How it works" title="Four steps from your car to ours" />

          <ol className="mt-14 grid gap-px bg-[var(--border)] md:grid-cols-2 xl:grid-cols-4">
            {partExchangeSteps.map((step, index) => (
              <li
                key={step.title}
                className="reveal bg-[var(--background)] p-7 md:p-8"
              >
                <span
                  aria-hidden
                  data-numeric
                  className="font-display text-4xl leading-none text-ink-500"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-display text-lg leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ---- Form + checklist ---------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>What we need</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                What we need to value it
              </h2>

              {/* A compact row of short items rather than a stacked list: the
                  form beside it asks for each of these in turn. */}
              <ul className="mt-7 flex flex-wrap gap-1.5">
                {partExchangeChecklist.map((item) => (
                  <li
                    key={item}
                    className="border border-[var(--border-strong)] px-2.5 py-1.5 text-[0.6875rem] leading-none text-[var(--muted-foreground)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.partExchange}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Send photos
                </ExternalButtonLink>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-9">
              <Suspense fallback={<PartExchangeForm />}>
                <PartExchangeFormForLinkedCar searchParams={props.searchParams} />
              </Suspense>
            </div>
          </div>
        </Container>
      </Section>

      <FaqSection
        // "Do you accept part exchange?" is what this whole page answers.
        faqs={[...faqsByCategory("Part exchange"), ...faqsByCategory("Finance")].filter(
          (faq) => faq.id !== "part-exchange" && faq.id !== "finance" && faq.id !== "finance-credit-check",
        )}
        eyebrow="Part-exchange questions"
        title="Good to know"
      />
    </>
  );
}

/**
 * The car comes from `?vehicle=` on a car's part-exchange link, looked up in
 * stock: a slug we do not hold prefills nothing, rather than a title made up
 * from the URL. Reading the query renders this part of the page per request,
 * so it sits inside <Suspense> with the empty form as its fallback.
 */
async function PartExchangeFormForLinkedCar({
  searchParams,
}: {
  searchParams: PageProps<"/part-exchange">["searchParams"];
}) {
  const { vehicle } = await searchParams;
  const car = await resolveVehicleBySlug(Array.isArray(vehicle) ? vehicle[0] : vehicle);
  if (!car) return <PartExchangeForm />;
  return <PartExchangeForm vehicleSlug={car.slug} vehicleName={`${car.year} ${car.title}`} />;
}
