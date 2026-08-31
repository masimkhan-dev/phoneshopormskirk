import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/lib/queries";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Terms covering quotes, repairs, devices left with us, parts, payment and your statutory rights at Phone Shop Ormskirk.",
      },
      { property: "og:title", content: "Terms of Service | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Quotes, repairs, devices, payment and your statutory rights.",
      },
      { property: "og:url", content: "/terms" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-14 md:py-16">
          <span className="eyebrow-on-brand">Legal</span>
          <h1 className="display-1 mt-4">Terms of Service</h1>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page max-w-3xl space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-base font-bold text-foreground">Quotes and prices</h2>
            <p className="mt-2">
              Prices shown on this website are starting prices and are not a fixed quote. The final
              price depends on your model and the fault found on inspection. We'll confirm the price
              with you before any work begins.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Timescales</h2>
            <p className="mt-2">
              Any timescale we give is an estimate based on parts availability and workload. We'll
              tell you if something is going to take longer than expected.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Your device and your data</h2>
            <p className="mt-2">
              Please back up your device before leaving it with us and remove any device locks you
              can. We take care with every device, but we can't be held responsible for data loss
              that occurs during repair.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Pre-existing damage</h2>
            <p className="mt-2">
              Some devices — particularly those with water damage or previous repairs — may have
              faults that only appear once opened. We'll tell you if we find anything and discuss
              options before continuing.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Selling a phone to us</h2>
            <p className="mt-2">
              Valuations given by phone, WhatsApp or through this website are estimates and subject
              to inspection in store. We may ask for proof of identity and proof of ownership, and we
              can decline to buy a device.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Payment and collection</h2>
            <p className="mt-2">
              Payment is due on collection unless agreed otherwise. Devices should be collected
              promptly once we tell you the work is complete.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Guarantees</h2>
            <p className="mt-2">
              {business?.warranty_policy ??
                "Any guarantee offered on a repair or purchase will be confirmed to you in writing on your receipt at the time. If nothing is stated, no additional guarantee beyond your statutory rights is offered."}
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Your statutory rights</h2>
            <p className="mt-2">
              Nothing in these terms affects your rights under the Consumer Rights Act 2015.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
