import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

import { businessQuery, productQuery } from "@/lib/queries";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { DirectionsButton } from "@/components/site/DirectionsButton";

export const Route = createFileRoute("/shop/$slug")({
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} | Phone Shop Ormskirk` },
        {
          name: "description",
          content: `${name} available at Phone Shop Ormskirk. Reserve over WhatsApp and collect in store.`,
        },
        { property: "og:title", content: `${name} | Phone Shop Ormskirk` },
        {
          property: "og:description",
          content: `${name} available in our Ormskirk store.`,
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: business } = useQuery(businessQuery());
  const { data: product, isLoading } = useQuery(productQuery(slug));
  const [index, setIndex] = useState(0);

  if (isLoading) {
    return <div className="container-page section-y text-sm text-muted-foreground">Loading…</div>;
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
    <section className="section-y">
      <div className="container-page">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to shop
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              {active ? (
                <img
                  src={active.url}
                  loading="lazy"
              decoding="async"
              alt={active.alt_text ?? `${product.name} available at Phone Shop Ormskirk`}
                  className="aspect-square size-full object-cover"
                />
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="mt-4 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`size-20 overflow-hidden rounded-md border ${
                      i === index ? "border-primary" : "border-border"
                    }`}
                  >
                    <img
                      src={img.url}
                      loading="lazy"
              decoding="async"
              alt={img.alt_text ?? `${product.name} at Phone Shop Ormskirk, Aughton Street`}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <span className="eyebrow">{product.product_categories?.name ?? "In store"}</span>
            <h1 className="display-2 mt-3">{product.name}</h1>
            <p className="mt-4 text-2xl font-extrabold text-primary">
              {formatPrice(product.price_pence) ?? "Ask in store"}
            </p>
            <p
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                soldOut
                  ? "bg-muted text-muted-foreground"
                  : product.availability === "LIMITED"
                    ? "bg-ink text-white"
                    : "bg-whatsapp text-whatsapp-foreground"
              }`}
            >
              {AVAILABILITY_LABEL[product.availability] ?? product.availability}
            </p>

            {product.description ? (
              <p className="mt-6 text-muted-foreground">{product.description}</p>
            ) : product.short_description ? (
              <p className="mt-6 text-muted-foreground">{product.short_description}</p>
            ) : null}

            {soldOut ? (
              <p className="mt-6 rounded-lg bg-tint p-4 text-sm text-muted-foreground">
                This one has gone, but stock changes all the time. Message us and we'll tell you
                what similar handsets we have in, or let you know when another arrives.
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappUrl(
                  business,
                  soldOut
                    ? { kind: "stock", product: product.name }
                    : { kind: "product", product: product.name },
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-soft"
              >
                {soldOut ? "Ask about similar stock" : "Enquire on WhatsApp"}
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                {soldOut ? "Call the shop" : "Call to reserve"}
              </a>
              <DirectionsButton tone="outline" label="Visit the store" />
            </div>


            {details.length > 0 || specs.length > 0 ? (
              <dl className="mt-10 divide-y divide-border border-y border-border text-sm">
                {[...details, ...specs].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3">
                    <dt className="font-semibold capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-right text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
