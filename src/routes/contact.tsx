import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { fullAddress } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { OpenStatus } from "@/components/site/OpenStatus";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { OpeningHours } from "@/components/site/OpeningHours";
import { GoogleRating } from "@/components/site/GoogleRating";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Phone Shop Ormskirk — 4 Aughton St" },
      {
        name: "description",
        content:
          "Find us at 4 Aughton St, Ormskirk L39 3BW. WhatsApp, call +44 7496 499992 or walk in. See opening hours and directions.",
      },
      { property: "og:title", content: "Contact Phone Shop Ormskirk — 4 Aughton St" },
      {
        property: "og:description",
        content: "Opening hours, address, phone number and directions to our Ormskirk shop.",
      },
      { property: "og:url", content: "/contact" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: business } = useQuery(businessQuery());
  const address = fullAddress(business);

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">Contact</span>
          <h1 className="display-1 mt-4 max-w-3xl">Find Phone Shop Ormskirk</h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            We're at 4 Aughton St, a short walk from the bus station, with town centre parking
            nearby. WhatsApp is the quickest way to reach us — we're usually mid-repair, but we'll
            always get back to you.
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


      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-10">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-bold">{address || "Ormskirk, United Kingdom"}</p>
                  <div className="mt-2">
                    <DirectionsButton className="!px-4 !py-2.5" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <a href={telUrl(business)} className="font-bold hover:text-primary">
                  {business?.phone ?? "Phone number to be confirmed"}
                </a>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <a href={`mailto:${business?.email ?? ""}`} className="font-bold hover:text-primary">
                  {business?.email ?? "Email to be confirmed"}
                </a>
              </div>
            </div>

            <div>
              <h2 className="display-3 font-extrabold">Opening hours</h2>
              <OpeningHours className="mt-4" />
              {business?.payment_methods?.length ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">Payments accepted:</span>{" "}
                  {business.payment_methods.join(" · ")}
                </p>
              ) : null}
            </div>

            <div>
              <h2 className="display-3 font-extrabold">Getting here</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                4 Aughton St sits right in the town centre, a short walk from the bus station with
                town centre parking close by. We regularly help customers from Ormskirk, Aughton,
                Burscough, Skelmersdale, Southport and the surrounding villages.
              </p>
            </div>



            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-soft"
              >
                Message on WhatsApp
              </a>
              <a
                href={telUrl(business)}
                className="inline-flex rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                Call the shop
              </a>
            </div>

            {business?.google_maps_embed_url ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <iframe
                  title="Map showing Phone Shop Ormskirk"
                  src={business.google_maps_embed_url}
                  loading="lazy"
                  className="h-72 w-full border-0"
                />
              </div>
            ) : null}
          </div>

          <EnquiryForm
            type="GENERAL"
            title="Send us a message"
            description="Prefer to write? Leave your details and we'll reply as soon as we can."
            messageLabel="How can we help?"
          />
        </div>
      </section>
    </>
  );
}
