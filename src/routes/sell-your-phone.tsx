import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgePoundSterling, CheckCircle2, Recycle } from "lucide-react";

import heroDevices from "@/assets/hero-devices.jpg";
import { businessQuery } from "@/lib/queries";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { SellQuoteForm } from "@/components/site/SellQuoteForm";

export const Route = createFileRoute("/sell-your-phone")({
  head: () => ({
    meta: [
      { title: "Sell Your Phone Ormskirk — Cash Today | Phone Shop" },
      {
        name: "description",
        content:
          "Sell or trade in your working or faulty phone at 4 Aughton St. Free valuation, no obligation to sell.",
      },
      { property: "og:title", content: "Sell Your Phone Ormskirk — Cash Today" },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/sell-your-phone" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Free valuations for working and faulty handsets at our Ormskirk shop.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/sell-your-phone" }],
  }),
  component: SellPage,
});

function SellPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page grid items-center gap-10 py-14 md:py-18 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow-on-brand">Buy &amp; Sell</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
                Same-Day Cash or Bank Transfer
              </span>
            </div>
            <h1 className="display-1 mt-4 text-balance">Sell Your Phone in Ormskirk</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
              Working, cracked, water damaged or not powering on — we value it honestly with no
              obligation to sell. Send your model, storage and condition on WhatsApp for an estimate
              before you travel, or bring it in to 4 Aughton Street (opposite Costa Coffee).
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={whatsappUrl(business, { kind: "sell" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground shadow-lift hover:brightness-105"
              >
                Get a WhatsApp estimate
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary shadow-lift hover:bg-tint"
              >
                Call the shop
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/10 shadow-2xl">
            <img
              src={heroDevices}
              loading="lazy"
              decoding="async"
              alt="Smartphones ready for valuation at Phone Shop Ormskirk"
              className="aspect-4/3 size-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-surface py-10">
        <div className="container-page grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: BadgePoundSterling,
              title: "Agreed before you sell",
              body: "We check the handset in person and tell you exactly what we can pay. The decision is 100% yours.",
            },
            {
              icon: Recycle,
              title: "Faulty phones accepted",
              body: "Cracked screens, degraded batteries or handsets not powering on — we assess devices in any condition.",
            },
            {
              icon: CheckCircle2,
              title: "Data wiped securely",
              body: "Every device we purchase undergoes a complete factory reset and data purge before leaving our counter.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/30"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-xs">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">{title}</h2>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed sm:text-sm">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="display-2 mt-3">Three steps to a fair figure</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              No complicated mail-in delays or surprises. Get an honest quotation and prompt payment
              across the counter.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Tell us what you have",
                body: "Model, storage capacity and honest physical condition — cracks, battery health or anything not working.",
              },
              {
                title: "Receive an upfront estimate",
                body: "A realistic price range based on current market value and condition, sent straight to your WhatsApp.",
              },
              {
                title: "Bring it in to confirm",
                body: "We test the handset and confirm the exact payout. We transfer funds or hand you cash immediately with zero pressure.",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground shadow-xs">
                    0{i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-surface border-t border-border/70">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <span className="eyebrow">Before you come in</span>
            <h2 className="display-2 mt-3">What to bring with you</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              To ensure the quickest turnaround and an accurate valuation on the day, please
              remember:
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "The handset itself, plus charger cable and original box if you still have them.",
                "Your Apple ID or Google account signed out (we can gladly assist you in store if needed).",
                "Valid photo ID (driving licence or passport) — required by law for second-hand device purchases.",
                "Details of any known faults or repairs so your valuation is 100% accurate first time.",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 shadow-soft"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm text-foreground/90 leading-relaxed font-medium">
                    {t}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-border/80 bg-tint p-5">
              <p className="text-sm text-foreground leading-relaxed">
                Looking to buy instead?{" "}
                <Link to="/shop" className="font-bold text-primary underline underline-offset-4">
                  Browse our stock of quality phones and accessories
                </Link>{" "}
                or{" "}
                <Link to="/contact" className="font-bold text-primary underline underline-offset-4">
                  visit 4 Aughton Street (opposite Costa Coffee)
                </Link>
                .
              </p>
            </div>
          </div>

          <div>
            <SellQuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}
