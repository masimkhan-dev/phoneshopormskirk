import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";

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
      { property: "og:url", content: "/repairs" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Screens, batteries, charging ports, cameras and water damage — repaired locally in Ormskirk.",
      },
    ],
    links: [{ rel: "canonical", href: "/repairs" }],
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
    body: "In plain English — what's wrong, what it takes to fix, and what it will cost.",
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
        <div className="container-page grid items-center gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <span className="eyebrow-on-brand">Repair services</span>
            <h1 className="display-1 mt-4">Phone Repairs in Ormskirk</h1>
            <p className="mt-5 max-w-xl text-lg text-on-brand/85">
              From cracked screens to dead batteries and water damage, we diagnose the fault and
              quote you before we start. Prices below are starting points — the exact cost depends on
              your model.
            </p>
            <div className="mt-6">
              <OpenStatus tone="brand" />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
              >
                WhatsApp for a quote
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
        <div className="container-page">
          <h2 className="display-2">Repair price guide</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Every price here is a "from" price, not a fixed quote. Search for your device or fault,
            or message us and we'll confirm the exact price.
          </p>
          <label className="mt-6 block max-w-md text-sm font-semibold">
            Search repairs
            <span className="relative mt-1.5 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. iPhone screen, battery, charging port"
                className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm font-normal outline-none focus:border-primary"
              />
            </span>
          </label>
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  active === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => {
              const highlight = Boolean(r.featured);
              return (
                <div
                  key={r.id}
                  className={`flex flex-col rounded-xl p-6 shadow-soft ${
                    highlight ? "brand-panel" : "border border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <RepairIcon
                      name={r.icon}
                      className={`size-7 ${highlight ? "text-on-brand" : "text-primary"}`}
                    />
                    {highlight ? (
                      <span className="rounded-full bg-on-brand/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-base font-bold">{r.name}</h3>
                  <p
                    className={`mt-1.5 flex-1 text-sm ${
                      highlight ? "text-on-brand/80" : "text-muted-foreground"
                    }`}
                  >
                    {r.description}
                  </p>
                  <p
                    className={`mt-4 text-lg font-extrabold ${
                      highlight ? "text-on-brand" : "text-primary"
                    }`}
                  >
                    {r.starting_price_pence
                      ? `From ${formatPrice(r.starting_price_pence)}`
                      : "Price on inspection"}
                  </p>
                  <a
                    href={whatsappUrl(business, { kind: "repair", repair: r.name })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex justify-center rounded-md bg-whatsapp px-4 py-2.5 text-sm font-bold text-whatsapp-foreground"
                  >
                    Ask about this repair
                  </a>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            {visible.length === 0
              ? "Nothing matched that search — message us with your device and fault and we'll price it for you."
              : "Don't see your device or fault listed? Message us — we repair most makes and models."}
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface section-y">
        <div className="container-page">
          <span className="eyebrow">How it works</span>
          <h2 className="display-2 mt-3">Our repair approach</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">

            {STEPS.map((s, i) => (
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

      <section className="brand-panel-deep section-y">
        <div className="container-page max-w-3xl">
          <EnquiryForm
            type="REPAIR_QUOTE"
            title="Request a repair quote"
            description="Send us your device and the fault, and we'll come back with a price."
            messageLabel="Device and fault"
            messagePlaceholder="e.g. iPhone 12 — cracked screen, touch still working"
            whatsappContext={{ kind: "repair" }}
          />

          <p className="mt-8 text-center text-sm text-on-brand/85">
            Have questions?{" "}
            <Link to="/faq" className="font-bold text-on-brand underline underline-offset-4">
              See our FAQ
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="font-bold text-on-brand underline underline-offset-4">
              contact the shop
            </Link>
            .
          </p>

        </div>
      </section>
    </>
  );
}
