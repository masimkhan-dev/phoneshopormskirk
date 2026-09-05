import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { directionsUrl, fullAddress } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { OpenStatus } from "@/components/site/OpenStatus";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { OpeningHours } from "@/components/site/OpeningHours";
import { GoogleRating } from "@/components/site/GoogleRating";
import { PaymentBadges } from "@/components/site/PaymentBadges";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Phone Shop Ormskirk — 4 Aughton St" },
      {
        name: "description",
        content:
          "Find us at 4 Aughton Street Ormskirk L39 3BW exactly opposite Costa Coffee. WhatsApp, call +44 7496 499992 or walk in. See opening hours and directions.",
      },
      { property: "og:title", content: "Contact Phone Shop Ormskirk — 4 Aughton St" },
      {
        property: "og:description",
        content: "Opening hours, address, phone number and directions to our Ormskirk shop.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/contact" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: business } = useQuery(businessQuery());
  const address = fullAddress(business);

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-14 md:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-on-brand">
              <MapPin className="size-3.5" aria-hidden />
              Town Centre Location
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Directly Opposite Costa Coffee
            </span>
          </div>

          <h1 className="display-1 mt-4 max-w-3xl text-balance">Find Phone Shop Ormskirk</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
            Find us at 4 Aughton Street in Ormskirk L39 3BW directly opposite Costa Coffee.
            Short-stay parking is close by. WhatsApp is the quickest way to reach us while we work
            at the bench, and we reply promptly.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <OpenStatus tone="brand" />
            <DirectionsButton tone="onBrand" />
          </div>
          <div className="mt-5">
            <GoogleRating tone="brand" showWriteCta />
          </div>
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-8">
            {/* Direct Channels Grid */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft">
                <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <MapPin className="size-4" aria-hidden />
                  Shop Address
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground leading-snug">
                  {address || "4 Aughton Street, Ormskirk L39 3BW"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Opposite Costa Coffee</p>
                <div className="mt-3">
                  <DirectionsButton className="!px-3.5 !py-2 !text-xs font-bold" />
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <Phone className="size-4" aria-hidden />
                    Direct Phone
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    <a href={telUrl(business)} className="hover:text-primary transition-colors">
                      {business?.phone ?? "07496 499992"}
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Call during shop opening hours
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3.5 text-primary shrink-0" aria-hidden />
                    <a
                      href={`mailto:${business?.email || "tefflakki188@gmail.com"}`}
                      className="truncate hover:text-primary transition-colors"
                    >
                      {business?.email || "tefflakki188@gmail.com"}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Hours Card */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft">
              <h2 className="display-3 font-extrabold">Opening hours</h2>
              <OpeningHours className="mt-4" />
              <div className="mt-6 pt-5 border-t border-border/70">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                  Accepted In Store
                </h3>
                <div className="mt-2.5">
                  <PaymentBadges variant="light" />
                </div>
              </div>
            </div>

            {/* Getting Here Advice */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft">
              <h2 className="display-3 font-extrabold">Getting here &amp; parking</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Located on the Aughton Street pedestrian fringe in Ormskirk town centre, directly
                opposite Costa Coffee. Town centre car parks (Park Road, Two Saints and Wheatsheaf
                Walks) are just 2–3 minutes' walk away. We regularly welcome customers from across
                Ormskirk, Aughton, Burscough, Skelmersdale and Southport.
              </p>
            </div>

            {/* Responsive Google Maps Embed for Shop Location */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
              <div className="relative w-full overflow-hidden">
                <iframe
                  title="Phone Store Ormskirk location on Google Maps"
                  src={
                    business?.google_maps_embed_url ||
                    "https://maps.google.com/maps?q=Phone%20Shop%20Ormskirk%2C%204%20Aughton%20St%2C%20Ormskirk%20L39%203BW%2C%20United%20Kingdom&t=m&z=17&output=embed&iwloc=near"
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[300px] w-full border-0 sm:h-[360px] lg:h-[420px]"
                />
              </div>

              {/* Action row below map */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-surface px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <MapPin className="size-4 text-primary shrink-0" aria-hidden />
                  <span>4 Aughton St, Ormskirk L39 3BW</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={directionsUrl(business)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                  >
                    <MapPin className="size-3.5" aria-hidden />
                    Get Directions
                  </a>
                  <a
                    href={directionsUrl(business)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-tint hover:text-primary transition-colors"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    Open in Google Maps
                  </a>
                  <a
                    href={telUrl(business)}
                    className="press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-tint hover:text-primary transition-colors"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    Call
                  </a>
                  <a
                    href={whatsappUrl(business)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3.5 py-2 text-xs font-bold text-whatsapp-foreground shadow-xs hover:brightness-105 transition-all"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div>
            <EnquiryForm
              type="GENERAL"
              title="Send us a message"
              description="Prefer to write? Leave your details and we'll reply as soon as we can."
              messageLabel="How can we help?"
            />
          </div>
        </div>
      </section>
    </>
  );
}
