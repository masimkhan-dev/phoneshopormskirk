import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { reviewsUrl } from "@/lib/format";

type Props = {
  tone?: "brand" | "light";
  className?: string;
  /** Show the "Leave a review" link alongside the rating. */
  showWriteCta?: boolean;
};

/** Google rating, review count and review CTAs, driven by real business data. */
export function GoogleRating({ tone = "light", className = "", showWriteCta = false }: Props) {
  const { data: business } = useQuery(businessQuery());
  const rating = business?.google_rating;
  const count = business?.google_review_count;
  if (!rating) return null;

  const rounded = Math.round(rating);
  const onBrand = tone === "brand";

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${
          onBrand
            ? "border-on-brand/25 bg-on-brand/10 text-on-brand"
            : "border-border bg-card text-foreground"
        }`}
      >
        <span className="flex gap-0.5" aria-label={`Rated ${rating} out of 5 on Google`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-4 ${
                i < rounded
                  ? onBrand
                    ? "fill-on-brand text-on-brand"
                    : "fill-primary text-primary"
                  : onBrand
                    ? "text-on-brand/35"
                    : "text-muted-foreground/40"
              }`}
              aria-hidden
            />
          ))}
        </span>
        {rating.toFixed(1)}
        {count ? (
          <span className={onBrand ? "font-medium text-on-brand/75" : "font-medium text-muted-foreground"}>
            · {count} Google reviews
          </span>
        ) : null}
      </span>

      <a
        href={reviewsUrl(business)}
        target="_blank"
        rel="noopener noreferrer"
        className={`press text-sm font-bold underline-offset-4 hover:underline ${
          onBrand ? "text-on-brand" : "text-primary"
        }`}
      >
        See our reviews
      </a>

      {showWriteCta && business?.google_review_write_url ? (
        <a
          href={business.google_review_write_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`press text-sm font-bold underline-offset-4 hover:underline ${
            onBrand ? "text-on-brand/80" : "text-muted-foreground"
          }`}
        >
          Leave a review
        </a>
      ) : null}
    </div>
  );
}
