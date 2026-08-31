import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, ShieldCheck, Smartphone, Sparkles, Star, Store, Wrench } from "lucide-react";

import storefrontAsset from "@/assets/storefront.webp.asset.json";
import heroImg from "@/assets/1.webp";
import repairBench from "@/assets/repair-bench.jpg";
import accessoriesImg from "@/assets/accessories.jpg";
import { businessQuery, productsQuery, repairServicesQuery } from "@/lib/queries";
import { formatPrice, fullAddress } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { ProductCard } from "@/components/site/ProductCard";
import { GoogleRating } from "@/components/site/GoogleRating";
import { OpeningHours } from "@/components/site/OpeningHours";
import { RepairIcon } from "@/components/site/RepairIcon";
import { OpenStatus } from "@/components/site/OpenStatus";
import { DirectionsButton } from "@/components/site/DirectionsButton";
import { Reveal } from "@/components/site/Reveal";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { FaqList } from "@/components/site/FaqList";
import { WhyChooseUs } from "@/components/site/WhyChooseUs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Phone Shop Ormskirk — Repairs, Buy & Sell | 4 Aughton St" },
      {
        name: "description",
        content:
          "Phone repairs, pre-owned handsets, accessories and unlocking at 4 Aughton St, Ormskirk town centre. WhatsApp +44 7496 499992 for a quote.",
      },
      { property: "og:title", content: "Phone Shop Ormskirk — Repairs, Buy & Sell | 4 Aughton St" },
      {
        property: "og:description",
        content:
          "Screen repairs, battery replacements, unlocking, used phones and accessories in Ormskirk.",
      },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const ACTIONS = [
  {
    to: "/repairs",
    icon: Wrench,
    title: "Repairs done properly",
    body: "Screens, batteries and charging ports — you get the price before we touch it.",
  },
  {
    to: "/sell-your-phone",
    icon: Sparkles,
    title: "Sell or trade in",
    body: "Working or faulty, we'll value your handset with no obligation to sell.",
  },
  {
    to: "/shop",
    icon: Search,
    title: "Phones & accessories",
    body: "Checked used handsets plus cases, chargers, cables and earbuds in store.",
  },
  {
    to: "/contact",
    icon: Store,
    title: "WhatsApp or in store",
    body: "Message ahead or walk into 4 Aughton St — both reach the same people.",
  },
] as const;

const SIMPLE_STEPS = [
  { title: "Message us directly", body: "No complicated booking process — WhatsApp, call or walk in." },
  { title: "Visit us in town", body: "We're right in Ormskirk town centre on Aughton Street." },
  { title: "Speak face-to-face", body: "Ask questions and get straightforward advice over the counter." },
  { title: "Decide before any work starts", body: "We'll explain the options first, then it's your call." },
] as const;


function Index() {
  const { data: business } = useQuery(businessQuery());
  const { data: repairs = [] } = useQuery(repairServicesQuery());
  const { data: products = [] } = useQuery(productsQuery());
  const featuredRepairs = repairs.filter((r) => r.featured).slice(0, 4);
  const inStockPhones = products
    .filter((p) => p.product_categories?.slug?.includes("phone") && p.availability !== "OUT_OF_STOCK")
    .slice(0, 4);
  const phoneIds = new Set(inStockPhones.map((p) => p.id));
  const featuredProducts = products.filter((p) => p.featured && !phoneIds.has(p.id)).slice(0, 4);
  const storefront = business?.storefront_image_url ?? storefrontAsset.url;
  const interior = business?.storefront_interior_image_url;

  return (
    <>
      {/* 1 — RED hero */}
      <section className="brand-panel relative isolate overflow-hidden">
        <span className="deco-lines" aria-hidden />
        <span
          className="deco-arc -right-40 -top-52 size-[34rem] md:-right-24"
          aria-hidden
        />
        <span className="deco-arc -bottom-72 -left-40 size-[30rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-28">
          <div className="rise-in max-w-2xl">
            <span className="eyebrow-on-brand">Ormskirk · Lancashire</span>
            <h1 className="mt-6 text-[clamp(2.5rem,7vw,4.75rem)] leading-[1]">
              Phone repairs
              <br />
              done properly
              <span className="block text-on-brand/70">right here in Ormskirk town centre.</span>
            </h1>
            <p className="lede mt-7 max-w-[34rem] text-on-brand/85">
              Cracked screen, battery trouble, or a phone that won't charge? Visit us at 4 Aughton St
              or send your device details on WhatsApp for a quote.
            </p>


            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/repairs"
                className="press inline-flex min-h-14 items-center justify-center rounded-full bg-background px-8 text-base font-extrabold text-primary shadow-lift"
              >
                Get a repair quote
              </Link>
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-14 items-center justify-center rounded-full bg-whatsapp px-8 text-base font-extrabold text-whatsapp-foreground shadow-lift"
              >
                WhatsApp us
              </a>
              <DirectionsButton
                tone="outline"
                label="Get directions"
                className="min-h-14 rounded-full! border-on-brand/45! bg-transparent! px-8 text-base! text-on-brand! hover:bg-on-brand/10!"
              />

            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-on-brand/20 pt-7 text-sm text-on-brand/80">
              <OpenStatus tone="brand" />
              <a
                href={telUrl(business)}
                className="inline-flex items-center gap-2 font-bold text-on-brand hover:underline"
              >
                {business?.phone ?? "Phone number to be confirmed"}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" aria-hidden />
                {fullAddress(business) || "Ormskirk town centre"}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="float-slow relative isolate overflow-hidden rounded-3xl border border-on-brand/20 shadow-lift">
              <img
                src={heroImg}
                alt="Phone Shop Ormskirk storefront on Aughton Street, lit up at night"
                width={1200}
                height={900}
                loading="eager"
                className="aspect-4/3 size-full object-cover lg:aspect-square"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/95 via-foreground/70 to-transparent px-6 pb-6 pt-28 text-on-brand sm:px-8 sm:pb-8">
                <p className="hidden text-xs font-extrabold uppercase tracking-[0.16em] text-on-brand/70 sm:block">
                  Your local phone shop
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xl font-extrabold leading-tight sm:text-2xl">
                      4 Aughton Street
                    </p>
                    <p className="mt-1 text-sm font-medium text-on-brand/80">Ormskirk · L39 3BW</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-base font-extrabold">
                    <Star className="size-4.5 fill-current text-primary" aria-hidden />
                    <span>4.8</span>
                    <span className="text-sm font-medium text-on-brand/70">Google</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — WHITE trust / service cards */}
      <section className="border-b border-border bg-background">
        <div className="container-page grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-4 md:py-20">
          {ACTIONS.map(({ to, icon: Icon, title, body }, i) => (
            <Reveal key={to} delay={i * 70} className="h-full">
              <Link
                to={to}
                className="card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-soft"
              >
                <span className="icon-dot">
                  <Icon className="size-5.5" aria-hidden />
                </span>
                <h2 className="mt-6 text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
                <p className="body-copy mt-3 text-muted-foreground">{body}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 2b — OFF-WHITE simpler way */}
      <section className="border-b border-border bg-surface">
        <div className="container-page py-16 md:py-20">
          <Reveal className="max-w-xl">
            <span className="eyebrow">How it works</span>
            <h2 className="display-2 mt-4">A simpler way to sort your phone</h2>
            <span className="rule-accent mt-6" />
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {SIMPLE_STEPS.map(({ title, body }, i) => (
              <Reveal key={title} delay={i * 70}>
                <span className="text-sm font-extrabold tracking-[0.16em] text-primary">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
                <p className="body-copy mt-2 text-muted-foreground">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* 3 — OFF-WHITE repairs */}
      <section className="section-y bg-background">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-xl">
              <span className="eyebrow">Repairs</span>
              <h2 className="display-2 mt-4">What we fix most</h2>
              <span className="rule-accent mt-6" />
              <p className="lede mt-6 text-muted-foreground">
                Starting prices — not fixed promises. The final figure depends on your model and what
                we find when we look at it, and we confirm the price before any work begins.
              </p>
            </div>
            <Link
              to="/repairs"
              className="press inline-flex rounded-full border border-input bg-card px-7 py-4 text-sm font-extrabold hover:border-primary hover:text-primary"
            >
              See full price guide
            </Link>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRepairs.map((r, i) => (
              <Reveal key={r.id} delay={i * 70} className="h-full">
                <div className="card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-soft">
                  <span className="icon-dot-soft">
                    <RepairIcon name={r.icon} className="size-6" />
                  </span>
                  <h3 className="mt-6 text-lg font-extrabold tracking-[-0.02em]">{r.name}</h3>
                  <p className="body-copy mt-3 flex-1 text-muted-foreground">{r.description}</p>
                  <div className="mt-7 border-t border-border/70 pt-5">
                    <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                      {r.starting_price_pence ? "Starting from" : "Price"}
                    </span>
                    <span className="stat-figure mt-1 block text-3xl! text-primary">
                      {r.starting_price_pence
                        ? formatPrice(r.starting_price_pence)
                        : "On inspection"}
                    </span>
                    <a
                      href={whatsappUrl(business, { kind: "repair", repair: r.name })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-5 inline-flex w-full justify-center rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground"
                    >
                      Get quote
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — RED sell / trade-in */}
      <section className="brand-panel section-y relative isolate overflow-hidden">
        <span className="deco-arc -right-52 top-10 size-[30rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="overflow-hidden rounded-3xl border border-on-brand/15 shadow-lift">
            <img
              src={repairBench}
              alt="iPhone screen replacement at the Phone Shop Ormskirk workbench"
              loading="lazy"
              className="aspect-4/3 size-full object-cover"
            />
          </Reveal>
          <Reveal delay={80}>
            <span className="eyebrow-on-brand">Sell or trade in</span>
            <h2 className="mt-4 max-w-[22ch] text-[clamp(2.125rem,5vw,3.75rem)]">
              Turn the phone in your drawer into cash.
            </h2>
            <p className="lede mt-6 max-w-xl text-on-brand/85">
              Working or faulty — we'll value it with no obligation to sell.
            </p>
            <ul className="mt-7 space-y-3 text-on-brand/85">
              <li className="body-copy">
                <span className="font-extrabold text-on-brand">Option 1:</span> WhatsApp us the model,
                storage and condition. Get a figure before you travel.
              </li>
              <li className="body-copy">
                <span className="font-extrabold text-on-brand">Option 2:</span> Walk in for a free
                valuation over the counter.
              </li>
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsappUrl(business, { kind: "sell" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-14 items-center justify-center rounded-full bg-whatsapp px-8 text-base font-extrabold text-whatsapp-foreground shadow-lift"
              >
                Get a valuation on WhatsApp
              </a>
              <Link
                to="/sell-your-phone"
                className="press inline-flex min-h-14 items-center justify-center rounded-full bg-background px-8 text-base font-extrabold text-primary shadow-lift"
              >
                How selling works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — WHITE accessories */}
      <section className="section-y">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-xl">
              <span className="eyebrow">In store</span>
              <h2 className="display-2 mt-4">Checked handsets and everyday accessories</h2>
              <span className="rule-accent mt-6" />
              <p className="lede mt-6 text-muted-foreground">
                Stock moves quickly. Message us before you travel and we'll confirm it's still on the
                shelf.
              </p>
            </div>
            <Link
              to="/shop"
              className="press inline-flex rounded-full border border-input px-7 py-4 text-sm font-extrabold hover:border-primary hover:text-primary"
            >
              Browse all stock
            </Link>

          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((p, i) => (
              <Reveal key={p.id} delay={i * 70} className="h-full">
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — RED/DARK handsets, white cards */}
      {inStockPhones.length > 0 ? (
        <section className="brand-panel-deep section-y relative isolate overflow-hidden">
          <span className="deco-lines" aria-hidden />
          <div className="container-page relative">
            <Reveal className="flex flex-wrap items-end justify-between gap-8">
              <div className="max-w-xl">
                <span className="eyebrow-on-brand">
                  <Smartphone className="size-4" aria-hidden />
                  Used &amp; refurbished
                </span>
                <h2 className="display-2 mt-4">Handsets currently in store</h2>
                <p className="lede mt-6 text-on-brand/85">
                  Every phone here is second-hand or refurbished, checked before it goes on the
                  shelf and sold with a written receipt. Stock moves quickly — message us before you
                  travel and we'll confirm it's still available.
                </p>
              </div>
              <Link
                to="/shop"
                className="press inline-flex rounded-full bg-background px-7 py-4 text-sm font-extrabold text-primary shadow-lift"
              >
                See all handsets
              </Link>
            </Reveal>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {inStockPhones.map((p, i) => (
                <Reveal key={p.id} delay={i * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 7 — WHITE why choose us */}
      <section className="section-y">
        <WhyChooseUs />
      </section>

      {/* 8 — OFF-WHITE reviews */}
      <section className="section-y bg-surface">
        <ReviewsSection variant="strip" limit={3} />
      </section>

      {/* 9 — RED storefront / find us */}
      <section className="brand-panel section-y relative isolate overflow-hidden">
        <span className="deco-arc -left-56 bottom-0 size-[32rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow-on-brand">Find us</span>
            <h2 className="display-2 mt-4 max-w-[20ch]">
              4 Aughton St, Ormskirk, L39 3BW
            </h2>
            <p className="lede mt-6 max-w-xl text-on-brand/85">
              Right in Ormskirk town centre. Drop in and we'll look at your device over the counter,
              or call ahead if you need a specific part and we'll check we've got it before you set
              off.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DirectionsButton tone="onBrand" className="min-h-13 rounded-full! px-7" />
              <a
                href={telUrl(business)}
                className="press inline-flex min-h-13 items-center rounded-full border border-on-brand/45 px-7 text-sm font-extrabold text-on-brand hover:bg-on-brand/10"
              >
                {business?.phone ?? "Call the shop"}
              </a>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                WhatsApp us
              </a>
            </div>
            <OpeningHours tone="brand" className="mt-9 max-w-sm" />
          </Reveal>
          <Reveal delay={80} className="grid gap-5 sm:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-on-brand/15 shadow-lift">
              <img
                src={storefront ?? accessoriesImg}
                alt={
                  storefront
                    ? "Phone Shop Ormskirk storefront on Aughton Street"
                    : "Phone cases, chargers and earbuds in store at Phone Shop Ormskirk"
                }
                loading="lazy"
                className="aspect-3/4 size-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-3xl border border-on-brand/15 shadow-lift">
              <img
                src={interior ?? repairBench}
                alt={
                  interior
                    ? "Phone repair technician at work in the Ormskirk shop"
                    : "Repair counter at Phone Shop Ormskirk with tools and a handset"
                }
                loading="lazy"
                className="aspect-3/4 size-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10 — DARK FAQ */}
      <section className="ink-panel section-y">
        <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <span className="eyebrow-on-brand">Questions</span>
            <h2 className="display-2 mt-4">Before you bring it in</h2>
            <span className="rule-accent mt-6" />
            <p className="lede mt-6 text-on-brand/80">
              The things customers ask us most, answered honestly. Anything we've missed, just
              message us and you'll get a straight answer.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/faq"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-primary px-7 text-sm font-extrabold text-primary-foreground shadow-lift"
              >
                All FAQs
              </Link>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                Ask us on WhatsApp
              </a>
            </div>
            <p className="mt-9 flex items-start gap-2 text-sm leading-relaxed text-on-brand/75">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Any guarantee on a repair or purchase is confirmed in writing on your receipt.
            </p>
            <Link
              to="/reviews"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-on-brand hover:underline"
            >
              <Star className="size-4" aria-hidden />
              Read our Google reviews
            </Link>
          </Reveal>
          <div className="rounded-3xl bg-background p-4 shadow-lift md:p-6">
            <FaqList limit={6} />
          </div>
        </div>
      </section>

      {/* 11 — RED final CTA */}
      <section className="brand-panel relative isolate overflow-hidden">
        <span className="deco-lines" aria-hidden />
        <div className="container-page relative flex flex-col gap-9 py-16 md:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.875rem,4vw,3rem)]">Need a repair? Message us now.</h2>
            <p className="lede mt-5 text-on-brand/85">
              A cracked screen lets in moisture. A dying battery gets worse. The sooner you get in
              touch, the sooner we can look at it.
            </p>

          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <a
              href={whatsappUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-14 items-center justify-center rounded-full bg-whatsapp px-8 text-base font-extrabold text-whatsapp-foreground shadow-lift"
            >
              WhatsApp us
            </a>
            <a
              href={telUrl(business)}
              className="press inline-flex min-h-14 items-center justify-center rounded-full bg-background px-8 text-base font-extrabold text-primary shadow-lift"
            >
              Call {business?.phone ?? "the store"}
            </a>
            <DirectionsButton
              tone="outline"
              label="Get directions"
              className="min-h-14 rounded-full! border-on-brand/45! bg-transparent! px-8 text-base! text-on-brand! hover:bg-on-brand/10!"
            />
          </div>
        </div>
      </section>
    </>
  );
}
