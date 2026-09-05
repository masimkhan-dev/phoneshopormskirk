import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import accessoriesImg from "@/assets/accessories.jpg";
import { businessQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Phone Shop Ormskirk — Local Repairs | 4 Aughton St" },
      {
        name: "description",
        content:
          "Independent phone shop at 4 Aughton St, Ormskirk. Repairs, sales and honest advice. Rated 4.8 on Google.",
      },
      { property: "og:title", content: "About Phone Shop Ormskirk — 4 Aughton St" },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/about" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "An independent Ormskirk phone shop built on honest advice and quality repairs.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel-deep">
        <div className="container-page py-14 md:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-on-brand">Independent Local Retail</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Established in Ormskirk Town Centre
            </span>
          </div>

          <h1 className="display-1 mt-4 max-w-3xl text-balance">About Phone Shop Ormskirk</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-brand/90 sm:text-lg">
            {business?.business_name ?? "Phone Shop Ormskirk"} is an independent local shop. No call
            centres and no sales scripts — just genuine technicians who repair devices every day and
            tell you honestly whether a repair is worth doing.
          </p>
        </div>
      </section>

      <section className="section-y bg-background">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="group overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft">
            <div className="overflow-hidden">
              <img
                src={accessoriesImg}
                alt="Accessories on display inside Phone Shop Ormskirk on Aughton Street"
                loading="lazy"
                className="aspect-4/3 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4 text-xs text-muted-foreground border-t border-border/70 flex items-center justify-between">
              <span>Inside our Aughton Street shop</span>
              <span className="font-semibold text-foreground">Ormskirk, L39 3BW</span>
            </div>
          </div>

          <div>
            <span className="eyebrow">Our Philosophy</span>
            <h2 className="display-2 mt-3">Honesty first, always</h2>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed sm:text-base">
              <p>
                You’ll find us in Ormskirk town centre on Aughton Street exactly opposite Costa
                Coffee. Most of our custom comes from repeat visits and local word of mouth. That
                only works when every single job is completed properly. Getting it right matters far
                more to us than pushing a quick sale.
              </p>
              <p>
                If a repair isn't cost-effective for your handset, we tell you frankly even if that
                means we do not take the job. We inspect the device and explain what is wrong in
                plain English. We confirm the price before we start and outline all options
                including trading the handset in.
              </p>
              <p>
                You deal with the same knowledgeable people every time you visit across the counter
                without telephone queues or ticketing systems.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/repairs"
                className="press inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lift hover:bg-primary/90"
              >
                Browse repair prices
              </Link>
              <Link
                to="/contact"
                className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold text-foreground shadow-soft hover:bg-accent hover:text-primary transition-colors"
              >
                Find the shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars of Service */}
      <section className="border-t border-border/70 bg-surface py-12">
        <div className="container-page grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Direct Counter Advice",
              text: "Speak straight to the person repairing your device. Clear diagnostic feedback with no middleman.",
            },
            {
              step: "02",
              title: "Quality Replacement Parts",
              text: "We fit tested, reliable screens and batteries to ensure your handset performs reliably for the long haul.",
            },
            {
              step: "03",
              title: "Community Rooted",
              text: "Proudly supporting Ormskirk, Aughton, Burscough and surrounding West Lancashire communities.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/80 bg-card p-6 shadow-soft transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5"
            >
              <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                {item.step}
              </span>
              <h3 className="mt-2 text-base font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed sm:text-sm">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
