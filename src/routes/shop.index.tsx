import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";

import { businessQuery, categoriesQuery, productsQuery } from "@/lib/queries";
import { whatsappUrl } from "@/lib/whatsapp";
import { ProductCard } from "@/components/site/ProductCard";
import { OpenStatus } from "@/components/site/OpenStatus";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Pre-Owned Phones & Accessories Ormskirk | Phone Shop" },
      {
        name: "description",
        content:
          "Checked used iPhones, Samsung handsets, cases, chargers and earbuds in Ormskirk. Message before visiting to confirm stock.",
      },
      { property: "og:title", content: "Pre-Owned Phones & Accessories Ormskirk" },
      {
        property: "og:description",
        content: "Refurbished phones and everyday accessories, in stock at Phone Shop Ormskirk.",
      },
      { property: "og:url", content: "/shop" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
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
      [p.name, p.short_description, p.brand, p.model, p.colour, p.storage, p.product_categories?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    return inCategory && inStock && matches;
  });

  const pill = (on: boolean) =>
    `press rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background hover:bg-accent"
    }`;

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">The shop</span>
          <h1 className="display-1 mt-4 max-w-3xl">Phones &amp; Accessories in Ormskirk</h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            Used handsets are checked and tested before they go on the shelf. Stock moves quickly, so
            message us to confirm something is still available — we'll hold it for collection at 4
            Aughton St.
          </p>

          <div className="mt-7">
            <OpenStatus tone="brand" />
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page">
          <label className="block max-w-xl text-sm font-semibold">
            Search the shop
            <span className="relative mt-1.5 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search cases, chargers, cables, iPhone, Samsung…"
                className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm font-normal outline-none focus:border-primary"
              />
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setActive("all")} className={pill(active === "all")}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.slug)}
                className={pill(active === c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by availability"
          >
            {AVAILABILITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStock(f.value)}
                className={`press rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  stock === f.value
                    ? "border-ink bg-ink text-white"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            Showing {visible.length} of {products.length} items
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((p, i) => (
              <Reveal key={p.id} delay={i * 50} className="h-full">
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">
                Nothing here matches that yet. Stock changes constantly — tell us what you're after
                and we'll check the shelves and our suppliers.
              </p>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press mt-4 inline-flex rounded-md bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
              >
                Ask us what's in stock
              </a>
            </div>
          ) : null}

          <p className="mt-12 text-base text-muted-foreground">
            Have a phone to trade in?{" "}
            <Link
              to="/sell-your-phone"
              className="font-bold text-primary underline underline-offset-4"
            >
              Get a valuation
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="font-bold text-primary underline underline-offset-4">
              message us before visiting
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
