import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import { businessQuery } from "@/lib/queries";
import { whatsappUrl } from "@/lib/whatsapp";
import type { Product } from "@/lib/types";

const BADGE: Record<string, string> = {
  AVAILABLE: "bg-whatsapp text-whatsapp-foreground",
  LIMITED: "bg-ink text-white",
  OUT_OF_STOCK: "bg-background/90 text-muted-foreground",
};

export function ProductCard({ product }: { product: Product }) {
  const { data: business } = useQuery(businessQuery());
  const image = [...(product.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0];
  const price = formatPrice(product.price_pence);
  const soldOut = product.availability === "OUT_OF_STOCK";

  return (
    <div className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <Link to="/shop/$slug" params={{ slug: product.slug }} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-surface p-5">
          {image ? (
            <img
              src={image.url}
              alt={image.alt_text ?? `${product.name} available at Phone Shop Ormskirk`}
              loading="lazy"
              className="size-full rounded-xl object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
          ) : null}
          <span
            className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] shadow-soft backdrop-blur ${
              BADGE[product.availability] ?? "bg-background/90 text-muted-foreground"
            }`}
          >
            {AVAILABILITY_LABEL[product.availability] ?? product.availability}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-6 pb-5 pt-5">
          <div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-primary">
            {product.product_categories?.name ?? "In store"}
            {product.condition ? (
              <span className="font-bold text-muted-foreground">· {product.condition}</span>
            ) : null}
          </div>
          <h3 className="mt-2.5 text-lg font-extrabold leading-snug tracking-[-0.02em]">
            {product.name}
          </h3>
          {product.short_description ? (
            <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {product.short_description}
            </p>
          ) : null}
          <div className="mt-5 flex items-end justify-between border-t border-border/70 pt-4">
            <span className="flex flex-col">
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                {price ? "Price" : "Enquire"}
              </span>
              <span className="stat-figure mt-0.5 text-3xl! text-primary">
                {price ?? "Ask in store"}
              </span>
            </span>
            <ArrowUpRight
              className="size-5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </div>
      </Link>

      <a
        href={whatsappUrl(
          business,
          soldOut
            ? { kind: "stock", product: product.name }
            : { kind: "product", product: product.name },
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="press mx-6 mb-6 inline-flex min-h-12 items-center justify-center rounded-full bg-whatsapp px-5 text-sm font-extrabold text-whatsapp-foreground"
      >
        Ask on WhatsApp
      </a>
    </div>
  );
}
