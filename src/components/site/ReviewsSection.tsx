import { useQuery } from "@tanstack/react-query";
import { Quote, Star } from "lucide-react";

import { businessQuery, reviewsQuery } from "@/lib/queries";
import { reviewsUrl } from "@/lib/format";
import { Reveal } from "./Reveal";

type Props = {
  /** Compact strip for the homepage, full block for the reviews page. */
  variant?: "strip" | "full";
  limit?: number;
};

/**
 * Google reviews block. The headline rating and count are the real Google
 * figures; quotes only appear when the shop has actually supplied them.
 */
export function ReviewsSection({ variant = "strip", limit }: Props) {
  const { data: business } = useQuery(businessQuery());
  const { data: reviews = [] } = useQuery(reviewsQuery());
  const shown = limit ? reviews.slice(0, limit) : reviews;
  const href = reviewsUrl(business);
  const rating = business?.google_rating;
  const count = business?.google_review_count;

  return (
    <div className="container-page">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <Reveal>
          <span className="eyebrow">Google reviews</span>
          <h2 className="display-2 mt-4">Rated by Ormskirk locals</h2>
          <span className="rule-accent mt-6" />

          {rating ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
              <div className="flex items-center gap-6">
                <span className="stat-figure text-[clamp(3.5rem,9vw,5.5rem)]! text-primary">
                  {rating.toFixed(1)}
                </span>
                <span>
                  <span className="flex gap-1" aria-label={`Rated ${rating} out of 5 on Google`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-6 ${
                          i < Math.round(rating)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/35"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </span>
                  <span className="mt-2.5 block text-base font-bold text-muted-foreground">
                    {count ? `Based on ${count} Google reviews` : "Google rating"}
                  </span>
                </span>
              </div>
            </div>
          ) : null}

          <p className="mt-7 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
            Read the latest feedback directly on our Google profile and judge for yourself.
          </p>


          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-extrabold text-primary-foreground shadow-soft"
            >
              <Star className="size-4" aria-hidden />
              Read reviews
            </a>
            {business?.google_review_write_url ? (
              <a
                href={business.google_review_write_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center justify-center rounded-full border border-input px-7 text-sm font-extrabold text-foreground hover:border-primary hover:text-primary"
              >
                Leave a review
              </a>
            ) : null}
          </div>

        </Reveal>

        {shown.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {shown.map((r, i) => (
              <Reveal
                key={r.id}
                delay={i * 80}
                className={`card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft ${
                  i === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <Quote className="size-6 text-primary/35" aria-hidden />
                {r.rating ? (
                  <span className="mt-4 flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="size-4 fill-primary text-primary" aria-hidden />
                    ))}
                  </span>
                ) : null}
                <blockquote className="mt-3 flex-1 text-[0.975rem] font-medium leading-relaxed text-foreground">
                  “{r.quote}”
                </blockquote>
                <footer className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                  {r.author_name}
                  {r.reviewed_on
                    ? ` · ${new Date(r.reviewed_on).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : ""}
                </footer>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal
            delay={80}
            className="tint-panel flex flex-col justify-center rounded-2xl border border-primary/15 p-8 shadow-soft"
          >
            <Quote className="size-7 text-primary/40" aria-hidden />
            <p className="mt-4 text-lg font-bold leading-snug tracking-[-0.02em]">
              We link straight to Google rather than reprinting selected quotes here.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {count
                ? `All ${count} reviews — the good and the critical — are on our Google listing, in full and in customers' own words.`
                : "Our reviews live on our Google listing, in full and in customers' own words."}
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="press mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white"
            >
              Open our Google reviews
            </a>
          </Reveal>
        )}
      </div>
    </div>
  );
}
