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
      { property: "og:url", content: "/sell-your-phone" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Free valuations for working and faulty handsets at our Ormskirk shop.",
      },
    ],
    links: [{ rel: "canonical", href: "/sell-your-phone" }],
  }),
  component: SellPage,
});

function SellPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page grid items-center gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <span className="eyebrow-on-brand">Buy &amp; sell</span>
            <h1 className="display-1 mt-4">Sell Your Phone in Ormskirk</h1>
            <p className="mt-5 max-w-xl text-lg text-on-brand/85">
              Working, cracked, water damaged or not powering on — we'll value it, and there's no
              obligation to sell. Send the model, storage and condition on WhatsApp for an estimate
              before you travel, or bring it in to 4 Aughton St.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappUrl(business, { kind: "sell" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
              >
                Get a WhatsApp estimate
              </a>
              <a
                href={telUrl(business)}
                className="inline-flex rounded-md bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
              >
                Call the shop
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-on-brand/15 shadow-lift">
            <img
              src={heroDevices}
              loading="lazy"
              decoding="async"
              alt="Pre-owned smartphones ready for valuation at Phone Shop Ormskirk"
              className="aspect-4/3 size-full object-cover"
            />
          </div>
        </div>
      </section>


      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
          {[
            { icon: BadgePoundSterling, title: "Agreed before you sell", body: "We check the handset, tell you what we can pay, and it's your choice." },
            { icon: Recycle, title: "Faulty phones too", body: "Cracked, water damaged or not powering on — we'll still look." },
            { icon: CheckCircle2, title: "Data wiped properly", body: "Every handset we take in is factory reset before it goes anywhere." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-bold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page">
          <span className="eyebrow">How it works</span>
          <h2 className="display-2 mt-3">Three steps to a figure</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Tell us what you've got",
                body: "Model, storage size and honest condition — cracks, battery health, anything that doesn't work.",
              },
              {
                title: "We give you an estimate",
                body: "A realistic range based on what you've described, sent straight back on WhatsApp.",
              },
              {
                title: "Bring it in to confirm",
                body: "We check the handset over, confirm the figure and pay you. No obligation at any point.",
              },
            ].map((s, i) => (
              <div key={s.title}>
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-base font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>




      <section className="section-y bg-surface">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow">Before you come in</span>
            <h2 className="display-2 mt-3">What to bring</h2>
            <ul className="mt-6 space-y-4 text-muted-foreground">
              {[
                "The handset itself, plus charger and box if you still have them.",
                "Your Apple ID or Google account signed out, or we can help you do it.",
                "Photo ID — we're required to record who we buy from.",
                "Details of any faults, so the valuation is accurate first time.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <SellQuoteForm />
        </div>
        <div className="container-page mt-12">
          <p className="text-base text-muted-foreground">
            Looking to buy instead?{" "}
            <Link to="/shop" className="font-bold text-primary underline underline-offset-4">
              Browse our stock of pre-owned phones and accessories
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="font-bold text-primary underline underline-offset-4">
              come and see us at 4 Aughton St
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
