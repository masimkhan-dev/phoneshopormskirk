import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { reviewsUrl } from "@/lib/format";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { OpenStatus } from "@/components/site/OpenStatus";
import { GoogleRating } from "@/components/site/GoogleRating";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Read Google reviews for Phone Shop Ormskirk and see what local customers say about our repairs, phones and service.",
      },
      { property: "og:title", content: "Customer Reviews | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Real Google reviews from Ormskirk customers, plus a link to our full listing.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/reviews" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-14 md:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-on-brand">
              <Star className="size-3.5 fill-current" aria-hidden />
              Customer Reviews
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Verified Google Feedback
            </span>
          </div>

          <h1 className="display-1 mt-4 max-w-3xl text-balance">What our customers say</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
            Read independent reviews directly from our Google profile, together with verified
            feedback from local customers across Ormskirk and West Lancashire.
          </p>

          <div className="mt-6">
            <GoogleRating tone="brand" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={reviewsUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary shadow-lift hover:bg-tint"
            >
              <Star className="size-4 text-primary fill-primary" aria-hidden />
              See our Google reviews
            </a>
            {business?.google_review_write_url ? (
              <a
                href={business.google_review_write_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-2 rounded-lg border border-on-brand/35 px-5 py-3 text-sm font-bold text-on-brand hover:bg-on-brand/10 transition-colors"
              >
                Leave us a review
              </a>
            ) : null}
            <OpenStatus tone="brand" />
          </div>
        </div>
      </section>

      <section className="section-y bg-background">
        <ReviewsSection variant="full" />
      </section>

      <section className="ink-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-12 md:py-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-brand/70">
              Visit The Shop
            </span>
            <h2 className="display-3 mt-1 font-extrabold">Come and see us in Ormskirk</h2>
            <p className="mt-2 text-sm text-on-brand/85 sm:text-base">
              Pop into 4 Aughton Street with your device — we'll test it honestly while you wait
              where possible.
            </p>
          </div>
          <DirectionsButton tone="onBrand" />
        </div>
      </section>
    </>
  );
}
