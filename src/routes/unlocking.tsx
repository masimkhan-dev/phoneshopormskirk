import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Unlock } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { EnquiryForm } from "@/components/site/EnquiryForm";

export const Route = createFileRoute("/unlocking")({
  head: () => ({
    meta: [
      { title: "Phone Unlocking Ormskirk — All Networks | Phone Shop" },
      {
        name: "description",
        content:
          "Network unlocking for iPhone, Samsung and more in Ormskirk. Check eligibility free. WhatsApp for a quote.",
      },
      { property: "og:title", content: "Phone Unlocking Ormskirk — All Networks" },
      { property: "og:url", content: "/unlocking" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Network unlocking handled in store at 4 Aughton St, Ormskirk — most makes and models.",
      },
    ],
    links: [{ rel: "canonical", href: "/unlocking" }],
  }),
  component: UnlockingPage,
});

const FAQ = [
  {
    q: "How long does unlocking take?",
    a: "It depends on the handset and the network. Some are done while you wait, others take longer — we'll tell you the expected time before you commit to anything.",
  },
  {
    q: "Will unlocking affect my data?",
    a: "Network unlocking doesn't wipe your phone. If a particular model needs anything unusual, we'll tell you first.",
  },
  {
    q: "Which networks can you unlock?",
    a: "We handle most UK networks and many international ones. Send us the model and current network and we'll confirm honestly whether we can do it.",
  },
  {
    q: "What do you need from me?",
    a: "The handset, the current network, and photo ID. Knowing the IMEI helps us quote faster.",
  },
] as const;


function UnlockingPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">
            <Unlock className="size-4" aria-hidden />
            Unlocking
          </span>
          <h1 className="display-1 mt-4 max-w-3xl">
            Locked to a network you've left?
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            We unlock most makes and models so your handset can be used with other compatible
            networks — handy if you want a cheaper SIM or a better price when you sell it.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business, { kind: "unlock" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
            >
              WhatsApp for a price
            </a>
            <a
              href={telUrl(business)}
              className="inline-flex rounded-md bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
            >
              Call the shop
            </a>
          </div>
        </div>
      </section>


      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow">Good to know</span>
            <h2 className="display-2 mt-3">Unlocking questions</h2>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="text-base font-bold">{item.q}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
          <EnquiryForm
            type="GENERAL"
            title="Ask about unlocking"
            description="Send us your device and current network and we'll confirm the price."
            messageLabel="Device and network"
            messagePlaceholder="e.g. Samsung Galaxy S21, locked to O2"
            whatsappContext={{ kind: "unlock" }}
          />
        </div>
      </section>
    </>
  );
}
