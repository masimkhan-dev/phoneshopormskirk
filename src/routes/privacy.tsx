import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/lib/queries";
import { fullAddress } from "@/lib/format";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "How Phone Shop Ormskirk collects, uses and protects your personal data when you enquire about a repair, sale or unlocking service.",
      },
      { property: "og:title", content: "Privacy Policy | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "How we handle your personal data and device data under UK GDPR.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/privacy" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-center gap-2">
            <span className="eyebrow-on-brand">Data Protection</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              UK GDPR Compliant
            </span>
          </div>
          <h1 className="display-1 mt-4 text-balance">Privacy Policy</h1>
          <p className="mt-3 max-w-xl text-sm text-on-brand/85 sm:text-base">
            How Phone Shop Ormskirk securely handles, processes and protects your personal and
            device data.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-background">
        <div className="container-page max-w-3xl">
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-soft space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              This policy explains how Phone Shop Ormskirk handles your personal information. We are
              the data controller for the data described here.
            </p>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">What we collect</h2>
              <p className="mt-2">
                When you send an enquiry through this website we collect your name, phone number,
                any email address you give us, and the details of your device or request. If you
                contact us by phone or WhatsApp, we hold the message and number you contacted us
                from.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Why we use it</h2>
              <p className="mt-2">
                We use your details only to reply to your enquiry, quote for work, carry out a
                repair or purchase, and keep a record of the transaction. This is on the basis of
                our legitimate interest in responding to you and, where work is agreed, performance
                of a contract with you.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Device data</h2>
              <p className="mt-2">
                Where a repair requires us to power on or test a device, we access only what is
                needed to complete and check the work. We do not copy, browse or share personal
                content on your device. Please back up your data before leaving a device with us.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">How long we keep it</h2>
              <p className="mt-2">
                Enquiries are kept while we are dealing with them and for a reasonable period
                afterwards for record-keeping. Sales and repair records are kept as long as required
                for accounting purposes.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Who we share it with</h2>
              <p className="mt-2">
                We do not sell your data. We use service providers to host this website and store
                enquiries on our behalf, under contract. We only disclose data where we are legally
                required to.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Your rights</h2>
              <p className="mt-2">
                Under UK GDPR you can ask for a copy of your data, ask us to correct or delete it,
                or object to how we use it. Contact us using the details below and we'll respond.
                You can also complain to the Information Commissioner's Office (ico.org.uk).
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Contact</h2>
              <p className="mt-2">
                {business?.business_name ?? "Phone Shop Ormskirk"}
                {fullAddress(business)
                  ? `, ${fullAddress(business)}`
                  : ", Ormskirk, United Kingdom"}
                .{` Email: ${business?.email || "tefflakki188@gmail.com"}.`}
                {business?.phone ? ` Phone: ${business.phone}.` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
