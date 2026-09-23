import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";

import { FinanceForm } from "@/components/forms/finance-form";
import { FaqSection } from "@/components/site/faq-section";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { financeProducts, financeTerms, paymentMethods } from "@/lib/content/services";
import { resolveVehicleBySlug } from "@/lib/inventory/repository";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/*
 * Broker, lender-panel, approval-speed and credit-check claims were removed
 * from this page, along with the "How it works" broking steps and the finance
 * FAQs that repeated them. The client has no lender panel yet and is still
 * confirming its regulatory status; approved wording must come from its
 * compliance adviser before any of that returns.
 *
 * Cut to the homepage's measure: three cards that explain the products, the
 * words behind a quote, and the form. Gone with the words: the "at a glance"
 * table, which restated the cards a second time in a second voice, and the
 * three "how an enquiry works" steps, which restated the form beside them.
 * Nothing here is a new claim — only fewer words for the same confirmed facts.
 */
export const metadata: Metadata = pageMetadata({
  title: "Car Finance Explained — HP, PCP & Personal Loans",
  description:
    "Hire Purchase, Personal Contract Purchase and personal loans explained plainly, from a family-owned sports and luxury car business in Stratford, East London.",
  path: "/finance",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Finance", path: "/finance" },
];

/** "Do you offer finance?" is what this whole page answers, so it is dropped. */
const financeFaqs = faqsByCategory("Finance").filter((faq) => faq.id !== "finance");

export default function FinancePage(props: PageProps<"/finance">) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Finance"
        title="Finance, explained without the fog"
        lede="One of the ways you can pay. Here is how the three options work."
        crumbs={crumbs}
      />

      {/* ---- The three products ------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading eyebrow="Your options" title="Three ways to fund a car" />

          {/*
            Subgrid: the five bands (abbreviation, name, summary, points,
            ownership) share row heights across all three columns, so the
            labels line up however long the copy runs. Rows are auto-sized —
            `grid-rows-5` would split the height into five equal bands and
            stretch everything apart.
          */}
          <div className="mt-14 grid gap-px bg-[var(--border)] lg:grid-cols-3 lg:grid-rows-[repeat(5,auto)] lg:gap-y-0">
            {financeProducts.map((product) => (
              <article
                key={product.key}
                className="reveal flex flex-col bg-[var(--background)] p-7 md:p-9 lg:row-span-5 lg:grid lg:grid-rows-subgrid"
              >
                <span className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                  {product.abbreviation}
                </span>
                <h3 className="mt-4 font-display text-2xl leading-tight md:text-[1.75rem]">
                  {product.name}
                </h3>
                <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
                  {product.summary}
                </p>

                <ul className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-6">
                  {product.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]"
                    >
                      <span aria-hidden className="mt-2 size-1 shrink-0 bg-[var(--rule)]" />
                      {point}
                    </li>
                  ))}
                </ul>

                <dl className="mt-auto space-y-4 border-t border-[var(--border)] pt-6 text-sm lg:mt-0 lg:self-start">
                  <div>
                    <dt className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Ownership
                    </dt>
                    <dd className="mt-1 leading-relaxed">{product.ownership}</dd>
                  </div>
                  <div>
                    <dt className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      At the end
                    </dt>
                    <dd className="mt-1 leading-relaxed">{product.endOfTerm}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---- The terms ------------------------------------------------------- */}
      <Section dark size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>Plain English</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)] leading-tight">The terms you&rsquo;ll see in any quote</h2>
              <p className="mt-5 leading-relaxed text-[var(--muted-foreground)]">
                Figures depend on the car, your deposit, the term and the lender. So we don&rsquo;t quote them here.
              </p>
            </div>
            <dl className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {financeTerms.map((term) => (
                <div key={term.title} className="bg-[var(--background)] p-7">
                  <dt className="font-display text-xl">{term.title}</dt>
                  <dd className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{term.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* ---- The form ------------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Get started</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                Tell us what works for you
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Tell us the car and roughly what you&rsquo;d like to pay. No credit check. Nothing is applied
                for without your say-so.
              </p>

              {/* The other ways to pay, in one line, for anyone finance isn't right for. */}
              <div className="mt-7 flex flex-col gap-2 border-t border-[var(--border)] pt-6 text-sm md:flex-row md:items-baseline md:gap-6">
                <h3 className="shrink-0 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                  Other ways to pay
                </h3>
                <p className="leading-relaxed text-[var(--muted-foreground)]">{paymentMethods.join(" · ")}</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.finance}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Ask on WhatsApp
                </ExternalButtonLink>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-9">
              <Suspense fallback={<FinanceForm />}>
                <FinanceFormForLinkedCar searchParams={props.searchParams} />
              </Suspense>
            </div>
          </div>
        </Container>
      </Section>

      <FaqSection
        faqs={financeFaqs}
        eyebrow="Finance questions"
        title="Before you ask"
        footer={
          <ButtonLink href="/part-exchange" variant="outline" size="md">
            Value your part exchange
          </ButtonLink>
        }
      />
    </>
  );
}

/**
 * The car comes from `?vehicle=` on a car's finance link, looked up in stock:
 * a slug we do not hold prefills nothing, rather than a title made up from the
 * URL. Reading the query renders this part of the page per request, so it sits
 * inside <Suspense> with the empty form as its fallback.
 */
async function FinanceFormForLinkedCar({
  searchParams,
}: {
  searchParams: PageProps<"/finance">["searchParams"];
}) {
  const { vehicle } = await searchParams;
  const car = await resolveVehicleBySlug(Array.isArray(vehicle) ? vehicle[0] : vehicle);
  if (!car) return <FinanceForm />;
  return <FinanceForm vehicleSlug={car.slug} vehicleName={`${car.year} ${car.title}`} />;
}
