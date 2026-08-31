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
      { property: "og:url", content: "/faq" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
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
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">Help & answers</span>
          <h1 className="display-1 mt-4 max-w-3xl">Questions Customers Ask Us Most</h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            Everything customers usually ask us before bringing a phone in. If your question isn't
            here, message us — we'd rather answer properly than guess.
          </p>
        </div>
      </section>

      <section className="section-y bg-surface">
        <div className="container-page max-w-3xl">
          <FaqList />
          <FaqSchema />
        </div>
      </section>

      <section className="brand-panel-deep">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <h2 className="display-3 font-extrabold">Still got a question?</h2>
            <p className="mt-2 text-on-brand/85">
              Send us a message with your device and what's wrong and we'll get straight back to you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
            >
              WhatsApp us
            </a>
            <a
              href={telUrl(business)}
              className="press inline-flex rounded-md bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
            >
              Call the shop
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
