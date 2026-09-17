import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Package } from "lucide-react";

import { businessQuery, productQuery } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";

const SITE_ORIGIN = "https://www.phonestoreormskirk.co.uk";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params, context }) => {
    // Prime the product cache and return real data so head() can use it for SSR meta.
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    return { product: product ?? null };
  },
  head: ({ params, loaderData }) => {
    const product = loaderData?.product as import("@/lib/types").Product | null | undefined;

    const pageUrl = `${SITE_ORIGIN}/shop/${params.slug}`;

    // ?????? Title ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    const title = product
      ? `${product.name} | Phone Store Ormskirk`
      : params.slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ") + " | Phone Store Ormskirk";

    // ?????? Meta description ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    let description: string;
    if (product) {
      if (product.short_description) {
        description = product.short_description;
      } else {
        const pricePart =
          product.price_pence != null ? ` from £${(product.price_pence / 100).toFixed(0)}` : "";
        description = `${product.name}${pricePart}. Available at Phone Store Ormskirk, 4 Aughton Street, Ormskirk town centre.`;
      }
    } else {
      description = `Available at Phone Store Ormskirk, 4 Aughton Street, Ormskirk town centre.`;
    }

    // ── OG image — use first product image if available ───────────
    const firstImage = product?.product_images?.length
      ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]
      : null;
    const ogImage = firstImage?.url
      ? getCloudinaryImageUrl(firstImage.url, "DETAIL")
      : DEFAULT_OG_IMAGE;

    // ── Price meta — only when real data present ─────────────────
    const priceMeta =
      product?.price_pence != null
        ? [
            {
              property: "product:price:amount",
              content: (product.price_pence / 100).toFixed(2),
            },
            { property: "product:price:currency", content: "GBP" },
          ]
        : [];

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: pageUrl },
        { property: "og:type", content: "product" },
        { property: "og:image", content: ogImage },
        { name: "twitter:image", content: ogImage },
        ...priceMeta,
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  component: ProductPage,
});

// ── BreadcrumbList JSON-LD ──────────────────────────────────────────────────
function BreadcrumbSchema({ name, slug }: { name: string; slug: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_ORIGIN}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: `${SITE_ORIGIN}/shop/${slug}`,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function mapSchemaCondition(cond: string | null | undefined): string | null {
  if (!cond) return null;
  const lower = cond.toLowerCase().trim();
  if (lower.includes("new")) return "https://schema.org/NewCondition";
  if (lower.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  if (
    lower.includes("used") ||
    lower.includes("excellent") ||
    lower.includes("good") ||
    lower.includes("fair") ||
    lower.includes("grade")
  ) {
    return "https://schema.org/UsedCondition";
  }
  return null;
}

// ── Product JSON-LD ─────────────────────────────────────────────────────────
function ProductSchema({ product }: { product: import("@/lib/types").Product }) {
  const firstImage = product.product_images?.length
    ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : null;
  const imageUrl = firstImage?.url ? getCloudinaryImageUrl(firstImage.url, "DETAIL") : null;

  const availabilityMap: Record<string, string> = {
    AVAILABLE: "https://schema.org/InStock",
    LIMITED: "https://schema.org/LimitedAvailability",
    OUT_OF_STOCK: "https://schema.org/OutOfStock",
  };
  const availabilityUrl = availabilityMap[product.availability] ?? null;
  const itemCondition = mapSchemaCondition(product.condition);
  const rawProduct = product as unknown as Record<string, unknown>;
  const sku = typeof rawProduct["sku"] === "string" && rawProduct["sku"] ? rawProduct["sku"] : null;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${SITE_ORIGIN}/shop/${product.slug}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(product.short_description || product.description
      ? { description: product.short_description ?? product.description }
      : {}),
    ...(sku ? { sku } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.model ? { model: product.model } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_ORIGIN}/shop/${product.slug}`,
      priceCurrency: "GBP",
      ...(product.price_pence != null ? { price: (product.price_pence / 100).toFixed(2) } : {}),
      ...(availabilityUrl ? { availability: availabilityUrl } : {}),
      ...(itemCondition ? { itemCondition } : {}),
      seller: {
        "@type": "LocalBusiness",
        name: "Phone Store Ormskirk",
        url: SITE_ORIGIN,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: business } = useQuery(businessQuery());
  const { data: product, isLoading } = useQuery(productQuery(slug));
  const [index, setIndex] = useState(0);

  if (isLoading) {
    return <div className="container-page section-y text-sm text-muted-foreground">Loading...</div>;
  }
  if (!product) throw notFound();

  // ── Derived state ─────────────────────────────────────────────────────────
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const active = images[Math.min(index, images.length - 1)];
  const soldOut = product.availability === "OUT_OF_STOCK";
  const isLimited = product.availability === "LIMITED";
  const isRefurbished = product.condition?.toLowerCase().includes("refurb") ?? false;

  // ── Spec helpers ──────────────────────────────────────────────────────────
  const rawSpecs = (product.specs ?? {}) as Record<string, string>;

  // Strip SEO-only keys so they never appear in the customer-facing table
  const SEO_KEY = /^seo|^meta[\s_-]?(title|desc)/i;
  const TYPED_KEYS = new Set(
    ["brand", "model", "condition", "storage", "colour"].map((k) => k.toLowerCase()),
  );

  // Keys surfaced in their own dedicated sections — excluded from generic spec table
  const DEDICATED_KEYS = new Set([
    "warranty", "battery health", "battery_health",
    "included accessories", "what's included", "includes",
  ]);

  // Read well-known optional fields from specs
  const specsGet = (...keys: string[]): string | null => {
    for (const k of keys) {
      if (rawSpecs[k]) return rawSpecs[k];
      // Case-insensitive fallback
      const found = Object.entries(rawSpecs).find(([sk]) => sk.toLowerCase() === k.toLowerCase());
      if (found) return found[1];
    }
    return null;
  };

  const warrantyValue = specsGet("Warranty");
  const batteryHealth = specsGet("Battery Health", "battery_health");
  const includedItems = specsGet("Included Accessories", "What's Included", "Includes");

  // Typed core details for the spec table
  const coreDetails: [string, string][] = [
    ["Brand", product.brand ?? ""],
    ["Model", product.model ?? ""],
    ["Storage", product.storage ?? ""],
    ["Condition", product.condition ?? ""],
    ["Colour", product.colour ?? ""],
    ...(batteryHealth ? [["Battery Health", batteryHealth] as [string, string]] : []),
    ...(warrantyValue ? [["Warranty", warrantyValue] as [string, string]] : []),
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  // Extra freeform spec rows — SEO keys, typed keys, and dedicated-section keys stripped
  const extraSpecs = Object.entries(rawSpecs).filter(([k]) => {
    const lower = k.toLowerCase().trim();
    return !SEO_KEY.test(k) && !TYPED_KEYS.has(lower) && !DEDICATED_KEYS.has(lower);
  });

  // Availability badge
  const availabilityBadge = soldOut
    ? { label: "Out of Stock", cls: "bg-muted text-muted-foreground" }
    : isLimited
      ? { label: "Limited Stock", cls: "bg-amber-500/15 text-amber-700" }
      : { label: "In Stock", cls: "bg-emerald-500/15 text-emerald-700" };

  // Shop address from business data or sensible fallback
  const shopAddress =
    business?.address_line1
      ? `${business.address_line1}, ${business.city ?? "Ormskirk"}`
      : "4 Aughton St, Ormskirk";

  // WhatsApp URLs — rich product context for prefilled message
  const productUrl = `${SITE_ORIGIN}/shop/${slug}`;
  const priceStr = formatPrice(product.price_pence);

  const whatsappReserveUrl = whatsappUrl(
    business,
    soldOut
      ? {
          kind: "stock",
          product: product.name,
          ...(priceStr ? { price: priceStr } : {}),
          ...(product.condition ? { condition: product.condition } : {}),
          ...(product.storage ? { storage: product.storage } : {}),
          ...(product.model ? { model: product.model } : {}),
          productUrl,
        }
      : {
          kind: "product",
          product: product.name,
          ...(priceStr ? { price: priceStr } : {}),
          ...(product.condition ? { condition: product.condition } : {}),
          ...(product.storage ? { storage: product.storage } : {}),
          ...(product.model ? { model: product.model } : {}),
          productUrl,
        },
  );

  // Gallery keyboard handler
  function handleThumbKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIndex(i);
    }
    if (e.key === "ArrowRight") setIndex(Math.min(i + 1, images.length - 1));
    if (e.key === "ArrowLeft") setIndex(Math.max(i - 1, 0));
  }

  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container-page">
        {/* JSON-LD — untouched */}
        <BreadcrumbSchema name={product.name} slug={slug} />
        <ProductSchema product={product} />

        {/* Visual breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"
        >
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium truncate max-w-[16rem]">{product.name}</span>
        </nav>

        <Link
          to="/shop"
          className="press inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to shop
        </Link>

        {/* ── Main two-column grid ──────────────────────────────────────── */}
        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">

          {/* ── LEFT: Gallery ──────────────────────────────────────────── */}
          <div>
            {/* Main image */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft">
              {active ? (
                <img
                  src={getCloudinaryImageUrl(active.url, "DETAIL")}
                  loading="eager"
                  decoding="async"
                  alt={active.alt_text ?? `${product.name} – Phone Store Ormskirk`}
                  className="aspect-square w-full object-contain p-6 sm:p-8"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted/30 text-muted-foreground/40">
                  <Package className="size-20 stroke-[1.2]" />
                </div>
              )}
            </div>

            {/* Thumbnail strip — only rendered when multiple images exist */}
            {images.length > 1 && (
              <div
                className="mt-3 flex gap-2.5"
                role="group"
                aria-label="Product image thumbnails"
              >
                {images.slice(0, 4).map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    onKeyDown={(e) => handleThumbKey(e, i)}
                    aria-label={`View image ${i + 1} of ${Math.min(images.length, 4)}`}
                    aria-pressed={i === index}
                    className={`size-[4.5rem] shrink-0 overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      i === index
                        ? "border-primary shadow-soft"
                        : "border-border/60 opacity-65 hover:border-border hover:opacity-100"
                    }`}
                  >
                    <img
                      src={getCloudinaryImageUrl(img.url, "THUMBNAIL")}
                      loading="lazy"
                      decoding="async"
                      alt={img.alt_text ?? `${product.name} – image ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Details panel ───────────────────────────────────── */}
          <div className="flex flex-col">

            {/* 1. Category eyebrow + availability */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">
                {product.product_categories?.name ?? "Mobile Phones"}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${availabilityBadge.cls}`}
              >
                {availabilityBadge.label}
              </span>
            </div>

            {/* 2. H1 — one per page, product name */}
            <h1 className="mt-2 text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold tracking-[-0.03em] leading-tight">
              {product.name}
            </h1>

            {/* 3. Badge chips: condition, warranty, storage */}
            {(product.condition || warrantyValue || product.storage) && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Product highlights">
                {product.condition && (
                  <span className="chip-soft">{product.condition}</span>
                )}
                {warrantyValue && (
                  <span className="chip-soft">{warrantyValue}</span>
                )}
                {product.storage && (
                  <span className="chip-soft">{product.storage}</span>
                )}
              </div>
            )}

            {/* 4. Price */}
            <div className="mt-5">
              <p className="text-[2.25rem] font-black tracking-tight text-primary leading-none">
                {formatPrice(product.price_pence) ?? "Ask in store"}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Available online &amp; for collection in Ormskirk
              </p>
            </div>

            {/* Sold-out notice */}
            {soldOut && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-tint p-4 text-sm text-muted-foreground">
                This item has sold but stock changes regularly.{" "}
                <a
                  href={whatsappReserveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  Message us
                </a>{" "}
                and we&apos;ll check incoming stock.
              </div>
            )}

            {/* 5. Short summary */}
            {(product.short_description && !product.description) && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {product.short_description}
              </p>
            )}

            <div className="mt-1 border-t border-border/50" />

            {/* 6. CTA block — clear hierarchy */}
            <div className="mt-6 flex flex-col gap-3">
              {/* Primary: Reserve / Check stock */}
              <a
                id="product-cta-primary"
                href={whatsappReserveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-primary px-8 text-sm font-extrabold text-primary-foreground shadow-soft sm:w-auto"
              >
                {soldOut ? "Check Similar Stock" : "Reserve This Phone"}
              </a>

              {/* Secondary + tertiary row */}
              <div className="flex flex-wrap gap-3">
                {/* WhatsApp — green */}
                <a
                  id="product-cta-whatsapp"
                  href={whatsappReserveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-full bg-whatsapp px-6 text-sm font-bold text-whatsapp-foreground"
                >
                  Enquire on WhatsApp
                </a>

                {/* Call — outlined */}
                <a
                  id="product-cta-call"
                  href={telUrl(business)}
                  className="press inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-full border border-border px-6 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Call to Reserve
                </a>
              </div>
            </div>

            {/* 7. Trust strip */}
            <div className="mt-6 border-t border-border/50 pt-5">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
                {warrantyValue && (
                  <li className="flex items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {warrantyValue} Included
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Fully Unlocked
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Collection in Ormskirk
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Online Ordering Available
                </li>
                {batteryHealth && (
                  <li className="flex items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    Battery: {batteryHealth}
                  </li>
                )}
              </ul>
            </div>

            {/* 8. Compact local collection box */}
            <div className="mt-5 rounded-xl border border-border/80 bg-surface/60 p-4">
              <p className="text-sm leading-relaxed">
                <strong className="font-extrabold text-foreground">Local collection</strong>
                {" "}— Available from {shopAddress}. Inspect your device and receive a written
                receipt at the counter.
              </p>
              <div className="mt-2.5">
                <DirectionsButton
                  tone="outline"
                  label="Get Directions"
                  className="min-h-[2.25rem]! rounded-full! px-4! text-xs!"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Full-width sections below the grid ───────────────────────── */}
        <div className="mt-12 space-y-0 divide-y divide-border/50 lg:mt-16">

          {/* What's Included */}
          {includedItems && (
            <div className="py-8">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                What&apos;s Included
              </h2>
              <p className="text-sm text-foreground">{includedItems}</p>
            </div>
          )}

          {/* Warranty */}
          {warrantyValue && (
            <div className="py-8">
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Warranty
              </h2>
              <p className="text-sm font-semibold text-foreground">{warrantyValue} Included</p>
              {business?.warranty_policy && (
                <a
                  href="/terms"
                  className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline transition-colors"
                >
                  View warranty details
                </a>
              )}
            </div>
          )}

          {/* Specifications — SEO keys filtered, no empty rows */}
          {(coreDetails.length > 0 || extraSpecs.length > 0) && (
            <div className="py-8">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Specifications
              </h2>
              <dl className="max-w-xl divide-y divide-border/50 text-sm">
                {coreDetails.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="font-semibold text-foreground">{k}</dt>
                    <dd className="text-right text-muted-foreground">{v}</dd>
                  </div>
                ))}
                {extraSpecs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="font-semibold capitalize text-foreground">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="text-right text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* About this phone — description split into readable paragraphs */}
          {product.description && (
            <div className="py-8">
              <h2 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                About this phone
              </h2>
              <div className="max-w-2xl space-y-3">
                {product.description
                  .split(/\n\n+/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                      {para}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Refurbished condition notice — only for refurbished products */}
          {isRefurbished && (
            <div className="py-8">
              <p className="max-w-2xl rounded-xl border border-border/80 bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="font-bold text-foreground">Refurbished device.</strong>{" "}
                Cosmetic condition may vary slightly between individual handsets. Contact us if you
                would like to confirm the exact available unit before ordering.
              </p>
            </div>
          )}

          {/* Product-page cross-sell — accessories & setup help */}
          <div className="py-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold text-foreground">Buying this phone?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Ask us about cases, screen protectors, setup and data transfer.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  id="product-crosssell-whatsapp"
                  href={whatsappUrl(business, { kind: "general" })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-whatsapp px-5 text-xs font-extrabold text-whatsapp-foreground"
                >
                  WhatsApp Us
                </a>
                <a
                  id="product-crosssell-call"
                  href={telUrl(business)}
                  className="press inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-border px-5 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Call the Shop
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
