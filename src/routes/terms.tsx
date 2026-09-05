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
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/terms" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-center gap-2">
            <span className="eyebrow-on-brand">Customer Agreement</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Phone Shop Ormskirk
            </span>
          </div>
          <h1 className="display-1 mt-4 text-balance">Terms of Service</h1>
          <p className="mt-3 max-w-xl text-sm text-on-brand/85 sm:text-base">
            Clear guidelines covering our repair quotes, turnaround estimates, device handling,
            warranty terms and statutory rights.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-background">
        <div className="container-page max-w-3xl">
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-soft space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="text-base font-bold text-foreground">Quotes and prices</h2>
              <p className="mt-2">
                Prices shown on this website are starting prices and are not a fixed quote. The
                final price depends on your model and the fault found on inspection. We'll confirm
                the price with you before any work begins.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Timescales</h2>
              <p className="mt-2">
                Any timescale we give is an estimate based on parts availability and workload. We'll
                tell you if something is going to take longer than expected.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Your device and your data</h2>
              <p className="mt-2">
                Please back up your device before leaving it with us and remove any device locks you
                can. We take care with every device, but we can't be held responsible for data loss
                that occurs during repair.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Pre-existing damage</h2>
              <p className="mt-2">
                Some devices — particularly those with water damage or previous repairs — may have
                faults that only appear once opened. We'll tell you if we find anything and discuss
                options before continuing.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Selling a phone to us</h2>
              <p className="mt-2">
                Valuations given by phone, WhatsApp or through this website are estimates and
                subject to inspection in store. We may ask for proof of identity and proof of
                ownership, and we can decline to buy a device.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Payment and collection</h2>
              <p className="mt-2">
                Payment is due on collection unless agreed otherwise. Devices should be collected
                promptly once we tell you the work is complete.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Guarantees</h2>
              <p className="mt-2">
                {business?.warranty_policy ??
                  "Any guarantee offered on a repair or purchase will be confirmed to you in writing on your receipt at the time. If nothing is stated, no additional guarantee beyond your statutory rights is offered."}
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Your statutory rights</h2>
              <p className="mt-2">
                Nothing in these terms affects your rights under the Consumer Rights Act 2015.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
