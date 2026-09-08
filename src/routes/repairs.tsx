import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Wrench } from "lucide-react";

import repairBench from "@/assets/repair-bench.jpg";
import { businessQuery, repairServicesQuery } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { RepairIcon } from "@/components/site/RepairIcon";
import { OpenStatus } from "@/components/site/OpenStatus";
import { EnquiryForm } from "@/components/site/EnquiryForm";

export const Route = createFileRoute("/repairs")({
  head: () => ({
    meta: [
      { title: "Phone Repair Ormskirk — Screen, Battery, Port | Phone Shop" },
      {
        name: "description",
        content:
          "Screen, battery, charging port and camera repairs in Ormskirk town centre. Quote before any work begins. Walk in or WhatsApp us.",
      },
      { property: "og:title", content: "Phone Repair Ormskirk — Screen, Battery, Port" },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/repairs" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Screens, batteries, charging ports, cameras and water damage — repaired locally in Ormskirk.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/repairs" }],
  }),
  component: RepairsPage,
});

const STEPS = [
  {
    title: "You tell us the problem",
    body: "Call, WhatsApp or walk in and describe what's happening with the device.",
  },
  {
    title: "We look at it properly",
    body: "We check the handset over rather than guessing from the outside.",
  },
  {
    title: "We explain the options",
    body: "In plain English: what's wrong, what it takes to fix and what it will cost.",
  },
  {
    title: "You decide",
    body: "Nothing happens until you say yes to the price. If it isn't worth repairing, we'll tell you.",
  },
  {
    title: "We test it with you",
    body: "We check the repair together before you pay and leave the shop.",
  },
];

function RepairsPage() {
  const { data: business } = useQuery(businessQuery());
  const { data: repairs = [] } = useQuery(repairServicesQuery());
  const categories = ["All", ...Array.from(new Set(repairs.map((r) => r.category)))];
  const [active, setActive] = useState("All");
  const [term, setTerm] = useState("");
  const q = term.trim().toLowerCase();
  const visible = repairs.filter((r) => {
    const inCategory = active === "All" || r.category === active;
    const matches =
      !q ||
      [r.name, r.description, r.category, r.brand]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    return inCategory && matches;
  });

  return (
    <>
      <section className="brand-panel">
        <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow-on-brand flex items-center gap-2">
              <Wrench className="size-3.5 text-on-brand/90" aria-hidden />
              Workshop Services · Ormskirk
            </span>
            <h1 className="mt-4 text-[clamp(2.25rem,5.5vw,4rem)] font-extrabold tracking-[-0.035em] leading-[0.98]">
              Phone Repairs in Ormskirk
            </h1>
            <p className="lede mt-5 max-w-xl text-on-brand/85 leading-relaxed">
              From cracked screens to dead batteries and water damage, we diagnose the fault and
              quote you before we start. Prices below are starting points. The exact cost depends on
              your specific model.
            </p>
            <div className="mt-6">
              <OpenStatus tone="brand" />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                WhatsApp for a quote
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-background px-7 text-sm font-extrabold text-primary shadow-lift"
              >
                Call the shop
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/20 shadow-lift ring-1 ring-black/20">
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

      <section className="section-home bg-background">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">Price guide</span>
            <h2 className="display-2 mt-2">Repair price guide</h2>
            <span className="rule-accent mt-4" />
            <p className="lede mt-4 text-muted-foreground">
              Every price here is a starting guide rather than a fixed quote. Search for your device
              or fault, or message us to confirm the exact price.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Looking for local repair info?{" "}
              <Link
                to="/phone-repair-ormskirk"
                className="font-bold text-foreground hover:text-primary underline underline-offset-4"
              >
                View our Ormskirk phone repair service page →
              </Link>
            </p>
          </div>

          <label className="mt-7 block max-w-md text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Search repairs
            <span className="relative mt-1.5 block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. iPhone screen, battery, charging port"
                className="w-full rounded-xl border border-input bg-surface/50 py-2.5 pl-10 pr-3.5 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
              />
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`press rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                  active === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-tint"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-8 md:mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => {
              const highlight = Boolean(r.featured);
              return (
                <div
                  key={r.id}
                  className={`card-lift flex flex-col justify-between rounded-2xl p-6 sm:p-7 shadow-soft transition-all ${
                    highlight
                      ? "border border-primary/30 bg-primary/5 hover:border-primary/50"
                      : "border border-border/80 bg-card hover:border-primary/30"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <RepairIcon name={r.icon} className="size-5.5" />
                      </span>
                      {highlight ? (
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-primary">
                          Popular
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          {r.category || "Repair"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-base font-extrabold tracking-tight leading-snug">
                      {r.name}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {r.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-border/60 pt-4">
                    <span className="block text-[0.65rem] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {r.starting_price_pence ? "Starting price" : "Pricing"}
                    </span>
                    <p className="stat-figure mt-0.5 text-2xl! font-black text-primary">
                      {r.starting_price_pence
                        ? `From ${formatPrice(r.starting_price_pence)}`
                        : "Price on inspection"}
                    </p>
                    <a
                      href={whatsappUrl(business, { kind: "repair", repair: r.name })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-xs font-extrabold text-whatsapp-foreground shadow-2xs hover:opacity-95"
                    >
                      Ask about this repair
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            {visible.length === 0
              ? "Nothing matched that search — message us with your device and fault and we'll price it for you."
              : "Don't see your device or fault listed? Message us — we repair most makes and models."}
          </p>
        </div>
      </section>

      {/* APPROACH */}
      <section className="border-y border-border/80 bg-surface section-home">
        <div className="container-page">
          <div className="max-w-xl">
            <span className="eyebrow">How it works</span>
            <h2 className="display-2 mt-2">Our repair approach</h2>
            <span className="rule-accent mt-4" />
          </div>
          <div className="mt-8 md:mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="card-lift flex h-full flex-col rounded-2xl border border-border/75 bg-card p-5 sm:p-6 shadow-2xs hover:border-primary/30 transition-all"
              >
                <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-black text-primary shadow-2xs">
                  0{i + 1}
                </span>
                <h3 className="mt-4 text-sm font-extrabold tracking-tight leading-snug">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-home bg-background">
        <div className="container-page max-w-3xl">
          <EnquiryForm
            type="REPAIR_QUOTE"
            title="Request a repair quote"
            description="Send us your device and fault details. We'll come back with a clear price."
            messageLabel="Device and fault"
            messagePlaceholder="e.g. iPhone 12 — cracked screen, touch still working"
            whatsappContext={{ kind: "repair" }}
          />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Have questions?{" "}
            <Link
              to="/faq"
              className="font-bold text-foreground hover:text-primary underline underline-offset-4"
            >
              See our FAQ
            </Link>{" "}
            or{" "}
            <Link
              to="/contact"
              className="font-bold text-foreground hover:text-primary underline underline-offset-4"
            >
              contact the shop
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
