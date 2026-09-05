import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, Search, Tag } from "lucide-react";
import { useState } from "react";

import { businessQuery, categoriesQuery, productsQuery } from "@/lib/queries";
import { whatsappUrl, telUrl } from "@/lib/whatsapp";
import { ProductCard } from "@/components/site/ProductCard";
import { OpenStatus } from "@/components/site/OpenStatus";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Mobile Phones & Accessories Ormskirk | Phone Shop" },
      {
        name: "description",
        content:
          "Checked used iPhones, Samsung handsets, cases, chargers and earbuds in Ormskirk. Message before visiting to confirm stock.",
      },
      { property: "og:title", content: "Mobile Phones & Accessories Ormskirk | Phone Shop" },
      {
        property: "og:description",
        content: "Refurbished phones and everyday accessories, in stock at Phone Shop Ormskirk.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/shop" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/shop" }],
  }),
  component: ShopPage,
});

const AVAILABILITY_FILTERS = [
  { value: "all", label: "All stock" },
  { value: "AVAILABLE", label: "Available" },
  { value: "LIMITED", label: "Limited" },
] as const;

function ShopPage() {
  const { data: business } = useQuery(businessQuery());
  const { data: categories = [] } = useQuery(categoriesQuery());
  const { data: products = [] } = useQuery(productsQuery());
  const [active, setActive] = useState<string>("all");
  const [stock, setStock] = useState<string>("all");
  const [term, setTerm] = useState("");

  const q = term.trim().toLowerCase();
  const visible = products.filter((p) => {
    const inCategory = active === "all" || p.product_categories?.slug === active;
    const inStock = stock === "all" || p.availability === stock;
    const matches =
      !q ||
      [
        p.name,
        p.short_description,
        p.brand,
        p.model,
        p.colour,
        p.storage,
        p.product_categories?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    return inCategory && inStock && matches;
  });

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden brand-panel">
        {/* Depth layers */}
        <div className="pointer-events-none absolute inset-0 deco-lines opacity-30" />
        <div className="pointer-events-none absolute right-0 top-0 size-[28rem] rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-[18rem] rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />

        <div className="container-page relative py-12 md:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* LEFT: copy */}
            <div>
              <span className="eyebrow-on-brand flex items-center gap-2">
                <Tag className="size-3.5" aria-hidden />
                The Shop · Ormskirk
              </span>
              <h1 className="mt-4 text-[clamp(2.25rem,5.5vw,4rem)] font-extrabold tracking-[-0.035em] leading-[0.98] text-on-brand">
                Phones &amp; Accessories
                <br className="hidden sm:block" /> in Ormskirk
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-on-brand/80">
                Browse mobile phones and everyday accessories available from our Ormskirk town
                centre shop. Stock changes regularly — message us to confirm before visiting.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#shop-catalogue"
                  className="press inline-flex items-center gap-2 rounded-full bg-on-brand px-6 py-3 text-sm font-extrabold text-primary shadow-lift"
                >
                  Browse products
                </a>
                <a
                  href={whatsappUrl(business)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp us
                </a>
              </div>

              <div className="mt-7">
                <OpenStatus tone="brand" />
              </div>
            </div>

            {/* RIGHT: branded composition */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                {/* Main rounded panel */}
                <div className="relative h-72 w-80 overflow-hidden rounded-3xl border border-on-brand/15 bg-on-brand/8 backdrop-blur-sm shadow-[0_8px_48px_oklch(0.18_0_0/30%)]">
                  {/* Inner grid pattern */}
                  <div className="absolute inset-0 hairline-grid opacity-20" />

                  {/* Brand accent */}
                  <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/8" />
                  <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-black/10" />

                  {/* Floating product silhouette cards */}
                  <div className="absolute left-8 top-8 flex flex-col gap-2">
                    <div className="flex items-center gap-3 rounded-xl border border-on-brand/20 bg-on-brand/10 px-3 py-2.5 backdrop-blur-sm">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-on-brand/20">
                        <svg viewBox="0 0 24 24" className="size-4 fill-on-brand/80" aria-hidden>
                          <path d="M17 2H7C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.83 0-1.5-.67-1.5-1.5S11.17 17 12 17s1.5.67 1.5 1.5S12.83 20 12 20zm5-4H7V4h10v12z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-brand/60">
                          iPhone
                        </p>
                        <p className="text-xs font-extrabold text-on-brand">From £149</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-on-brand/20 bg-on-brand/10 px-3 py-2.5 backdrop-blur-sm">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-on-brand/20">
                        <svg viewBox="0 0 24 24" className="size-4 fill-on-brand/80" aria-hidden>
                          <path d="M20.29 5.63L18 3 12 9 6 3 3.71 5.63 9.38 12l-5.67 6.37L6 21l6-6 6 6 2.29-2.63L14.62 12l5.67-6.37z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-brand/60">
                          Accessories
                        </p>
                        <p className="text-xs font-extrabold text-on-brand">Cases & Cables</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-on-brand/20 bg-on-brand/10 px-3 py-2.5 backdrop-blur-sm">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-on-brand/20">
                        <svg viewBox="0 0 24 24" className="size-4 fill-on-brand/80" aria-hidden>
                          <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-brand/60">
                          Chargers
                        </p>
                        <p className="text-xs font-extrabold text-on-brand">Fast &amp; USB-C</p>
                      </div>
                    </div>
                  </div>

                  {/* Corner store label */}
                  <div className="absolute bottom-5 right-5 text-right">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-on-brand/50">
                      4 Aughton Street
                    </p>
                    <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-on-brand/70">
                      Ormskirk Town Centre
                    </p>
                  </div>
                </div>

                {/* Floating accent badge */}
                <div className="absolute -right-4 -top-4 rounded-2xl border border-on-brand/20 bg-on-brand/15 px-3 py-2 backdrop-blur-md shadow-soft">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-on-brand/70">
                    Stock
                  </p>
                  <p className="text-sm font-extrabold text-on-brand">Updated daily</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATALOGUE ─────────────────────────────────────────────────── */}
      <section id="shop-catalogue" className="bg-background">
        <div className="container-page py-10 md:py-14">
          {/* Search + filter toolbar */}
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            {/* Search row */}
            <div className="border-b border-border px-4 py-4 md:px-5">
              <label className="flex items-center gap-3">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search phones, cases, chargers, Samsung, iPhone…"
                  className="w-full bg-transparent text-sm font-normal text-foreground placeholder:text-muted-foreground/70 outline-none"
                  aria-label="Search products"
                />
                {term && (
                  <button
                    type="button"
                    onClick={() => setTerm("")}
                    className="shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
              </label>
            </div>

            {/* Category chips + availability */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Filter by category"
              >
                <button
                  type="button"
                  onClick={() => setActive("all")}
                  className={`press rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    active === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-tint"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActive(c.slug)}
                    className={`press rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                      active === c.slug
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-tint"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Availability pills — right side */}
              <div
                className="flex items-center gap-2 shrink-0"
                role="group"
                aria-label="Filter by availability"
              >
                {AVAILABILITY_FILTERS.slice(1).map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStock(stock === f.value ? "all" : f.value)}
                    className={`press rounded-full border px-3 py-1 text-[0.7rem] font-bold transition-colors ${
                      stock === f.value
                        ? "border-ink bg-ink text-white"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catalogue header */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-foreground">
                Shop products
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
                {visible.length === products.length
                  ? `${products.length} ${products.length === 1 ? "item" : "items"} available`
                  : `${visible.length} of ${products.length} ${products.length === 1 ? "item" : "items"} shown`}
              </p>
            </div>
          </div>

          {/* Product grid */}
          {visible.length > 0 ? (
            <div
              className={`mt-4 ${
                visible.length === 1
                  ? "mx-auto grid max-w-sm"
                  : visible.length === 2
                    ? "mx-auto grid max-w-2xl gap-5 sm:grid-cols-2"
                    : visible.length === 3
                      ? "mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {visible.map((p, i) => (
                <Reveal key={p.id} delay={i * 50} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            /* Empty / no results */
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-tint">
                <Search className="size-5 text-primary/60" aria-hidden />
              </div>
              <p className="font-bold text-foreground">Nothing matches that yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stock changes constantly — tell us what you're after and we'll check the shelves.
              </p>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press mt-5 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-extrabold text-whatsapp-foreground shadow-soft"
              >
                <MessageCircle className="size-4" aria-hidden />
                Ask what's in stock
              </a>
            </div>
          )}

          {/* Low inventory / looking for something specific */}
          {visible.length > 0 && visible.length < 5 && (
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-surface/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-foreground">Looking for something specific?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Message us and we'll check availability in store.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={whatsappUrl(business)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-sm font-bold text-whatsapp-foreground"
                >
                  <MessageCircle className="size-3.5" aria-hidden />
                  WhatsApp us
                </a>
                <a
                  href={telUrl(business)}
                  className="press inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground"
                >
                  <Phone className="size-3.5" aria-hidden />
                  Call the shop
                </a>
              </div>
            </div>
          )}

          {/* Trade-in strip */}
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-tint px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10">
                <Tag className="size-4 text-primary" aria-hidden />
              </div>
              <div>
                <p className="font-bold text-foreground">Trade in your old phone</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Get a quick valuation in store or message us before visiting.
                </p>
              </div>
            </div>
            <Link
              to="/sell-your-phone"
              className="press shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-soft"
            >
              Get a valuation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
