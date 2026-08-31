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
      { property: "og:url", content: "/about" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "An independent Ormskirk phone shop built on honest advice and quality repairs.",
      },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: business } = useQuery(businessQuery());

  return (
    <>
      <section className="brand-panel-deep">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow-on-brand">About us</span>
          <h1 className="display-1 mt-4 max-w-3xl">About Phone Shop Ormskirk</h1>
          <p className="mt-5 max-w-2xl text-lg text-on-brand/85">
            {business?.business_name ?? "Phone Shop Ormskirk"} is an independent shop. No call
            centres, no scripts — just people who fix phones every day and will tell you honestly
            whether a repair is worth doing.
          </p>
        </div>
      </section>


      <section className="section-y">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="overflow-hidden rounded-2xl border border-border shadow-soft">
            <img
              src={accessoriesImg}
              alt="Accessories on display inside Phone Shop Ormskirk on Aughton Street"
              loading="lazy"
              className="aspect-4/3 size-full object-cover"
            />
          </div>
          <div>
            <h2 className="display-2">Honesty first</h2>
            <div className="mt-6 space-y-6 text-muted-foreground">
              <p>
                We're an independent shop right in Ormskirk town centre, and most of our customers
                come from word of mouth. That only works if every job is done properly, so getting it
                right matters more to us than pushing a sale.
              </p>
              <p>
                If a repair isn't worth the money, we'll tell you — even when that means we don't take
                the job. We look at the device, explain what's wrong in plain English, confirm the
                price before we start, and talk you through the alternatives, including trading the
                handset in.
              </p>
              <p>
                You'll be dealing with the same people every time you come in, and you can ask
                questions across the counter rather than through a call centre.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/repairs"
                className="inline-flex rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
              >
                Browse repairs
              </Link>
              <Link
                to="/contact"
                className="inline-flex rounded-md border border-input bg-background px-6 py-3.5 text-sm font-bold hover:bg-accent"
              >
                Find the shop
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
