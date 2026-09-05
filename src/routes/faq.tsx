import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { businessQuery, faqsQuery } from "@/lib/queries";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { FaqList } from "@/components/site/FaqList";
import { FaqSchema } from "@/components/site/FaqSchema";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Phone Repair FAQ — Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Common questions about repairs, selling, data safety and payment. Straight answers from Ormskirk town centre.",
      },
      { property: "og:title", content: "Phone Repair FAQ — Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Answers on quotes, timescales, data, payment and selling your phone.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/faq" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/faq" }],
  }),
  loader: async ({ context }) => {
    // Prefetch so the FAQPage JSON-LD is present in the server-rendered HTML.
    await context.queryClient.ensureQueryData(faqsQuery());
  },
  component: FaqPage,
});

function FaqPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-14 md:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-on-brand">Help &amp; Answers</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Ormskirk Customer Guide
            </span>
          </div>

          <h1 className="display-1 mt-4 max-w-3xl text-balance">Questions Customers Ask Us Most</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
            Straight answers to common questions about repair turnaround times, screen and battery
            warranties, payment methods and phone valuations.
          </p>
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page max-w-3xl">
          <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-soft">
            <FaqList />
          </div>
          <FaqSchema />
        </div>
      </section>

      <section className="brand-panel-deep">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-12 md:py-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-brand/70">
              Need Clarification?
            </span>
            <h2 className="display-3 mt-1 font-extrabold">Still got a question?</h2>
            <p className="mt-2 text-sm text-on-brand/85 sm:text-base">
              Message us on WhatsApp with your handset make and model for straight, honest advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground shadow-lift hover:brightness-105"
            >
              WhatsApp us
            </a>
            <a
              href={telUrl(business)}
              className="press inline-flex items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary shadow-lift hover:bg-tint"
            >
              Call the shop
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
