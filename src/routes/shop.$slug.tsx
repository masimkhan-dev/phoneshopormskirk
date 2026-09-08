import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Package } from "lucide-react";

import { businessQuery, productQuery } from "@/lib/queries";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
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

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const active = images[Math.min(index, images.length - 1)];
  const specs = Object.entries(product.specs ?? {});
  const soldOut = product.availability === "OUT_OF_STOCK";
  const details = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Condition", product.condition],
    ["Storage", product.storage],
    ["Colour", product.colour],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container-page">
        {/* Breadcrumb JSON-LD */}
        <BreadcrumbSchema name={product.name} slug={slug} />
        {/* Product JSON-LD */}
        <ProductSchema product={product} />

        {/* Visual breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"
        >
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">
            Shop
          </Link>
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

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-soft">
              {active ? (
                <img
                  src={getCloudinaryImageUrl(active.url, "DETAIL")}
                  loading="lazy"
                  decoding="async"
                  alt={active.alt_text ?? `${product.name} - Phone Store Ormskirk`}
                  className="aspect-square size-full object-cover"
                />
              ) : (
                <div className="flex aspect-square size-full items-center justify-center bg-muted/30 text-muted-foreground/40">
                  <Package className="size-20 stroke-[1.2]" />
                </div>
              )}
            </div>
            {images.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`size-20 overflow-hidden rounded-xl border transition-all ${
                      i === index
                        ? "border-primary ring-2 ring-primary/20 shadow-soft"
                        : "border-border/80 hover:border-border"
                    }`}
                  >
                    <img
                      src={getCloudinaryImageUrl(img.url, "THUMBNAIL")}
                      loading="lazy"
                      decoding="async"
                      alt={img.alt_text ?? `${product.name} thumbnail ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{product.product_categories?.name ?? "In store"}</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${
                  soldOut
                    ? "bg-muted text-muted-foreground"
                    : product.availability === "LIMITED"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-whatsapp/15 text-whatsapp-foreground dark:text-emerald-400"
                }`}
              >
                {AVAILABILITY_LABEL[product.availability] ?? product.availability}
              </span>
            </div>

            <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-extrabold tracking-[-0.03em] leading-tight">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black tracking-tight text-primary">
                {formatPrice(product.price_pence) ?? "Ask in store"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Over-the-counter collection ?? Aughton St
              </span>
            </div>

            {product.description ? (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : product.short_description ? (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {product.short_description}
              </p>
            ) : null}

            {soldOut ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-tint p-4 text-sm text-muted-foreground">
                This item has sold but inventory updates regularly. Message us and we will check
                incoming stock.
              </div>
            ) : null}

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsappUrl(
                  business,
                  soldOut
                    ? { kind: "stock", product: product.name }
                    : { kind: "product", product: product.name },
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                {soldOut ? "Ask about similar stock" : "Enquire on WhatsApp"}
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-primary px-7 text-sm font-extrabold text-primary-foreground shadow-soft"
              >
                {soldOut ? "Call the shop" : "Call to reserve"}
              </a>
              <DirectionsButton
                tone="outline"
                label="Visit 4 Aughton St"
                className="min-h-13! rounded-full! px-6 text-sm!"
              />
            </div>

            {/* In-store pickup notice */}
            <div className="mt-6 rounded-xl border border-border/80 bg-surface/60 p-4 text-xs leading-relaxed text-muted-foreground">
              <strong className="font-extrabold text-foreground">Local collection:</strong> Find us
              at 4 Aughton Street (opposite Costa Coffee) in Ormskirk town centre. Inspect your
              device and receive a written receipt on the counter.
            </div>

            {/* Specs */}
            {details.length > 0 || specs.length > 0 ? (
              <div className="mt-7 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Specifications &amp; Details
                </h2>
                <dl className="mt-3 divide-y divide-border/60 text-sm">
                  {[...details, ...specs].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5">
                      <dt className="font-bold text-foreground capitalize">
                        {k.replace(/_/g, " ")}
                      </dt>
                      <dd className="text-right font-medium text-muted-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
