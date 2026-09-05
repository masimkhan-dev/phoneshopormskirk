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
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/phone-repair-ormskirk" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/phone-repair-ormskirk" },
    ],
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
        <div className="container-page grid items-center gap-10 py-14 md:py-18 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow-on-brand">
                <MapPin className="size-3.5" aria-hidden />
                Ormskirk · Lancashire
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
                Same-day repairs where possible
              </span>
            </div>
            <h1 className="display-1 mt-4 text-balance">Phone repair in Ormskirk</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
              We are an independent phone shop based in Ormskirk town centre repairing handsets
              across West Lancashire. Bring your device in and tell us what happened. We will
              inspect it and give you a clear quote before any work begins.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground shadow-lift hover:brightness-105"
              >
                Get a WhatsApp quote
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary shadow-lift hover:bg-tint"
              >
                Call the shop
              </a>
              <DirectionsButton tone="outline" />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs font-medium text-on-brand/85 sm:text-sm">
              <OpenStatus tone="brand" />
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-on-brand/70" aria-hidden />
                {fullAddress(business) || "Ormskirk, United Kingdom"}
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/10 shadow-2xl">
            <img
              src={repairBench}
              loading="lazy"
              decoding="async"
              alt="Phone repair technician at work in the Phone Shop Ormskirk workshop"
              className="aspect-4/3 size-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <div className="flex items-center gap-2">
              <span className="eyebrow">Local Workshop Services</span>
            </div>
            <h2 className="display-2 mt-3">Repairs we do in Ormskirk</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Most devices coming through our door have a cracked screen or a failing battery. We
              also handle charging ports, cameras, speakers, buttons and water damage assessments
              across iPhone, Samsung, Google and other major brands.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {priced.map((r) => (
                <li
                  key={r.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 text-sm font-semibold shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {r.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
                    From {formatPrice(r.starting_price_pence)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Starting prices only — the exact price depends on your model and the fault we find
              upon inspection.
            </p>
            <div className="mt-6">
              <Link
                to="/repairs"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4"
              >
                See the full repair price guide →
              </Link>
            </div>
          </Reveal>

          <Reveal
            delay={80}
            className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-6 shadow-soft md:p-8"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <MapPin className="size-3.5" aria-hidden />
                West Lancashire Coverage
              </div>
              <h2 className="display-3 mt-2 font-extrabold">Areas we see customers from</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Located on Aughton Street in Ormskirk town centre, we are easy to reach from across
                West Lancashire and South Sefton.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {AREAS.map((a) => (
                  <li
                    key={a}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground shadow-xs transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-tint p-4 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-xs leading-relaxed text-foreground sm:text-sm">
                <strong className="font-bold text-foreground">
                  Travelling in for a specific repair?
                </strong>{" "}
                Message us first on WhatsApp and we'll verify part availability before you set off.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-y bg-surface border-y border-border/60">
        <div className="container-page max-w-3xl">
          <Reveal>
            <span className="eyebrow">Good to know</span>
            <h2 className="display-2 mt-3">Questions Ormskirk customers ask</h2>
            <p className="mt-3 text-muted-foreground">
              Straightforward answers about our repair process, turnaround times and guarantees.
            </p>
          </Reveal>
          <div className="mt-8">
            <FaqList limit={6} />
          </div>
        </div>
      </section>

      <section className="ink-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-12 md:py-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-brand/70">
              Walk-ins Welcome
            </span>
            <h2 className="display-3 mt-1 font-extrabold">Bring it in and we'll take a look</h2>
            <p className="mt-2 text-sm text-on-brand/85 sm:text-base">
              Call ahead, message on WhatsApp or drop into 4 Aughton Street during opening hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business, { kind: "repair" })}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-lg bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift hover:brightness-105"
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
