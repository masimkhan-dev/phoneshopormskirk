import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MessageCircle, Package } from "lucide-react";

import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import { businessQuery } from "@/lib/queries";
import { whatsappUrl } from "@/lib/whatsapp";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/types";

const BADGE_STYLE: Record<string, string> = {
  AVAILABLE: "bg-whatsapp/15 text-[oklch(0.45_0.15_152)] ring-whatsapp/20",
  LIMITED: "bg-amber-50 text-amber-700 ring-amber-200/60",
  OUT_OF_STOCK: "bg-muted text-muted-foreground ring-border",
};

const BADGE_DOT: Record<string, string> = {
  AVAILABLE: "bg-whatsapp",
  LIMITED: "bg-amber-500",
  OUT_OF_STOCK: "bg-muted-foreground/50",
};

export function ProductCard({ product }: { product: Product }) {
  const { data: business } = useQuery(businessQuery());
  const image = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const price = formatPrice(product.price_pence);
  const soldOut = product.availability === "OUT_OF_STOCK";
  const availability = product.availability ?? "AVAILABLE";

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:border-primary/20">
      {/* Image area */}
      <Link
        to="/shop/$slug"
        params={{ slug: product.slug }}
        className="relative block overflow-hidden bg-surface"
        aria-label={product.name}
      >
        <div className="aspect-square overflow-hidden">
          {image ? (
            <img
              src={getCloudinaryImageUrl(image.url, "CARD")}
              alt={image.alt_text ?? `${product.name} - Phone Store Ormskirk`}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-surface">
              <Package className="size-14 stroke-[1] text-muted-foreground/25" aria-hidden />
            </div>
          )}
        </div>

        {/* Availability badge — top right */}
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest ring-1 ring-inset backdrop-blur-sm ${BADGE_STYLE[availability] ?? BADGE_STYLE["OUT_OF_STOCK"]}`}
        >
          <span
            className={`size-1.5 rounded-full ${BADGE_DOT[availability] ?? BADGE_DOT["OUT_OF_STOCK"]}`}
            aria-hidden
          />
          {AVAILABILITY_LABEL[availability] ?? availability}
        </span>

        {/* Featured badge — top left */}
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-primary-foreground">
            Featured
          </span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        {/* Category + condition row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-primary">
            {product.product_categories?.name ?? "In store"}
          </span>
          {product.condition && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              {product.condition}
            </span>
          )}
        </div>

        {/* Name */}
        <Link to="/shop/$slug" params={{ slug: product.slug }} className="group/name mt-1.5 block">
          <h3 className="text-base font-extrabold leading-snug tracking-tight text-foreground group-hover/name:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Short description */}
        {product.short_description && (
          <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {product.short_description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price row */}
        <div className="mt-3 flex items-end justify-between border-t border-border/60 pt-3">
          <div>
            <span className="block text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
              {price ? "Price" : "Enquire in store"}
            </span>
            <span className="block text-2xl font-extrabold tracking-tight text-primary leading-tight mt-0.5">
              {price ?? "Ask us"}
            </span>
          </div>
          <Link
            to="/shop/$slug"
            params={{ slug: product.slug }}
            className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-tint hover:text-primary"
            aria-label={`View ${product.name}`}
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="px-4 pb-4">
        <a
          href={whatsappUrl(
            business,
            soldOut
              ? { kind: "stock", product: product.name }
              : { kind: "product", product: product.name },
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-extrabold text-whatsapp-foreground transition-opacity hover:opacity-90"
        >
          <MessageCircle className="size-4 shrink-0" aria-hidden />
          {soldOut ? "Ask about similar" : "Ask on WhatsApp"}
        </a>
      </div>
    </div>
  );
}
