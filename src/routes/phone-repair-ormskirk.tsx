import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin } from "lucide-react";

import repairBench from "@/assets/repair-bench.jpg";
import { businessQuery, repairServicesQuery } from "@/lib/queries";
import { formatPrice, fullAddress } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { OpenStatus } from "@/components/site/OpenStatus";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { Reveal } from "@/components/site/Reveal";
import { FaqList } from "@/components/site/FaqList";

export const Route = createFileRoute("/phone-repair-ormskirk")({
  head: () => ({
    meta: [
      { title: "Phone Repair in Ormskirk | Screens, Batteries & Unlocking" },
      {
        name: "description",
        content:
          "Local phone repair in Ormskirk town centre. Screen and battery replacements, charging ports, cameras and unlocking — quoted before work starts.",
      },
      { property: "og:title", content: "Phone Repair in Ormskirk" },
      {
        property: "og:description",
        content:
          "An independent Ormskirk repair shop for screens, batteries, charging ports and unlocking.",
      },
      { property: "og:url", content: "/phone-repair-ormskirk" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/phone-repair-ormskirk" }],
  }),
  component: LocalPage,
});

const AREAS = [
  "Ormskirk town centre",
  "Aughton",
  "Burscough",
  "Skelmersdale",
  "Maghull",
  "Halsall",
  "Scarisbrick",
  "Bickerstaffe",
];

function LocalPage() {
  const { data: business } = useQuery(businessQuery());
  const { data: repairs = [] } = useQuery(repairServicesQuery());
  const priced = repairs.filter((r) => r.starting_price_pence).slice(0, 6);

  return (
    <>
      <section className="brand-panel">
        <div className="container-page grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow-on-brand">Ormskirk · Lancashire</span>
            <h1 className="display-1 mt-4">Phone repair in Ormskirk</h1>
            <p className="mt-5 max-w-xl text-lg text-on-brand/85">
              We're an independent phone shop based in Ormskirk, repairing handsets for people across
              West Lancashire. Bring your device in, tell us what's happened, and we'll look at it
              and quote you before anything is started.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
              >
                Get a WhatsApp quote
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex rounded-md bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
              >
                Call the shop
              </a>
              <DirectionsButton tone="outline" />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-on-brand/80">
              <OpenStatus tone="brand" />
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" aria-hidden />
                {fullAddress(business) || "Ormskirk, United Kingdom"}
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-on-brand/15 shadow-lift">
            <img
              src={repairBench}
              loading="lazy"
              decoding="async"
              alt="Phone repair technician at work in the Phone Shop Ormskirk workshop"
              className="aspect-4/3 size-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <h2 className="display-2">Repairs we do in Ormskirk</h2>
            <p className="mt-4 text-muted-foreground">
              Most of what comes through the door is a cracked screen or a battery that no longer
              lasts the day. We also handle charging ports, cameras, speakers, buttons and water
              damage assessments, across iPhone, Samsung, Google and most other makes.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {priced.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm font-semibold shadow-soft"
                >
                  {r.name}
                  <span className="font-extrabold text-primary">
                    From {formatPrice(r.starting_price_pence)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Starting prices only — the exact price depends on your model and the fault we find.
            </p>
            <Link
              to="/repairs"
              className="mt-6 inline-flex text-sm font-bold text-primary hover:underline"
            >
              See the full repair price guide →
            </Link>
          </Reveal>

          <Reveal delay={80} className="rounded-xl bg-surface p-6 shadow-soft md:p-8">
            <h2 className="display-3 font-extrabold">Areas we see customers from</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We're easy to reach from across West Lancashire and south Sefton.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <li
                  key={a}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold"
                >
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-start gap-3 rounded-lg bg-tint p-4 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-muted-foreground">
                Travelling in for a specific repair? Message us first and we'll check we have the
                part before you set off.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-y bg-surface">
        <div className="container-page max-w-3xl">
          <Reveal>
            <span className="eyebrow">Good to know</span>
            <h2 className="display-2 mt-3">Questions Ormskirk customers ask</h2>
          </Reveal>
          <div className="mt-8">
            <FaqList limit={6} />
          </div>
        </div>
      </section>

      <section className="ink-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <h2 className="display-3 font-extrabold">Bring it in and we'll take a look</h2>
            <p className="mt-2 text-on-brand/80">
              Call ahead, message us, or just drop in during opening hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business, { kind: "repair" })}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
            >
              WhatsApp us
            </a>
            <DirectionsButton tone="onBrand" />
          </div>
        </div>
      </section>
    </>
  );
}
