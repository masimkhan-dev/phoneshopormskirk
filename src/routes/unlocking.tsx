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
      { property: "og:title", content: "Phone Unlocking Ormskirk" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Network unlocking handled in store at 4 Aughton St, Ormskirk — most makes and models.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/unlocking" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/unlocking" }],
  }),
  component: UnlockingPage,
});

const FAQ = [
  {
    q: "How long does unlocking take?",
    a: "It depends on the handset and network. Some can be done while you wait while others take longer. We will always tell you the expected turnaround before you commit.",
  },
  {
    q: "Will unlocking affect my data?",
    a: "Network unlocking doesn't wipe your phone. If a particular model needs anything unusual, we'll tell you first.",
  },
  {
    q: "Which networks can you unlock?",
    a: "We handle most UK networks and many international ones. Send us the model and current network to confirm whether we can do it.",
  },
  {
    q: "What do you need from me?",
    a: "The handset, current network and photo ID. Knowing the IMEI helps us quote faster.",
  },
] as const;

function UnlockingPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-14 md:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-on-brand">
              <Unlock className="size-3.5" aria-hidden />
              Network Unlocking
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Free Eligibility Check
            </span>
          </div>

          <h1 className="display-1 mt-4 max-w-3xl text-balance">Phone Unlocking in Ormskirk</h1>
          <p className="mt-2 max-w-2xl text-lg font-medium leading-snug text-on-brand/90">
            Locked to a network you've left?
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-on-brand/85">
            We unlock most makes and models so your handset can be used with any compatible network
            — handy if you want a cheaper monthly SIM or a higher resale value when you sell.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business, { kind: "unlock" })}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground shadow-lift hover:brightness-105"
            >
              WhatsApp for a price
            </a>
            <a
              href={telUrl(business)}
              className="press inline-flex items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary shadow-lift hover:bg-tint"
            >
              Call the shop
            </a>
          </div>

          {/* Network compatibility strip */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs font-bold uppercase tracking-wider text-on-brand/75">
              Networks unlocked in store include:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[
                "EE",
                "Vodafone",
                "O2",
                "Three",
                "Tesco Mobile",
                "giffgaff",
                "Sky Mobile",
                "ID Mobile",
                "International",
              ].map((net) => (
                <span
                  key={net}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-on-brand backdrop-blur-xs"
                >
                  {net}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <span className="eyebrow">Good to know</span>
            <h2 className="display-2 mt-3">Unlocking questions</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Common questions customers ask about network release, device safety and typical
              turnaround.
            </p>

            <dl className="mt-8 space-y-4">
              {FAQ.map((item, idx) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-border/80 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/30"
                >
                  <dt className="flex items-center gap-3 text-base font-bold text-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-extrabold text-primary">
                      0{idx + 1}
                    </span>
                    {item.q}
                  </dt>
                  <dd className="mt-2.5 pl-9 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <EnquiryForm
              type="GENERAL"
              title="Ask about unlocking"
              description="Send us your device and current network. We'll confirm the price and turnaround."
              messageLabel="Device and network"
              messagePlaceholder="e.g. Samsung Galaxy S21, locked to O2"
              whatsappContext={{ kind: "unlock" }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
