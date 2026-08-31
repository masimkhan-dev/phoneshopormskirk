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
      { property: "og:url", content: "/reviews" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">Reviews</span>
          <h1 className="display-1 mt-4 max-w-3xl">What our customers say</h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            Read the latest feedback directly on our Google profile, along with a few reviews we've
            been given permission to share here.
          </p>

          <div className="mt-6">
            <GoogleRating tone="brand" />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={reviewsUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-md bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
            >
              <Star className="size-4" aria-hidden />
              See our Google reviews
            </a>
            {business?.google_review_write_url ? (
              <a
                href={business.google_review_write_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex rounded-md border border-on-brand/35 px-6 py-3.5 text-sm font-bold text-on-brand hover:bg-on-brand/10"
              >
                Leave us a review
              </a>
            ) : null}
            <OpenStatus tone="brand" />
          </div>
        </div>
      </section>

      <section className="section-y">
        <ReviewsSection variant="full" />
      </section>

      <section className="ink-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <h2 className="display-3 font-extrabold">Come and see us in Ormskirk</h2>
            <p className="mt-2 text-on-brand/80">
              Pop in with your device and we'll take a look while you wait where we can.
            </p>
          </div>
          <DirectionsButton tone="onBrand" />
        </div>
      </section>
    </>
  );
}
