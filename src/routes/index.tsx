import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Wrench,
} from "lucide-react";

import storefrontAsset from "@/assets/storefront.webp.asset.json";
import heroImg400 from "@/assets/hero-400.webp";
import heroImg640 from "@/assets/hero-640.webp";
import heroImg800 from "@/assets/hero-800.webp";
import heroImg1020 from "@/assets/hero-1020.webp";
import repairBench from "@/assets/repair-bench.webp";
import accessoriesImg from "@/assets/accessories.webp";
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
      { title: "Phone Repairs Ormskirk | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Phone repairs in Ormskirk town centre. iPhone and Samsung screen repairs, battery replacement, phone unlocking, mobile phones and accessories at 4 Aughton St. Call or WhatsApp 07496 499992.",
      },
      { property: "og:title", content: "Phone Repairs Ormskirk | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content:
          "Phone repairs in Ormskirk town centre. iPhone and Samsung screen repairs, battery replacement, phone unlocking, mobile phones and accessories at 4 Aughton St. Call or WhatsApp 07496 499992.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/" }],
  }),
  component: Index,
});

const ACTIONS = [
  {
    to: "/repairs",
    tag: "Repair Workshop",
    icon: Wrench,
    title: "Repairs done properly",
    body: "Screens, batteries and charging ports — you get the price before we touch it.",
    action: "See repair prices",
  },
  {
    to: "/sell-your-phone",
    tag: "Device Valuation",
    icon: Sparkles,
    title: "Sell or trade in",
    body: "Working or faulty — we value your handset with no obligation to sell.",
    action: "Value your phone",
  },
  {
    to: "/shop",
    tag: "Checked Stock",
    icon: Smartphone,
    title: "Phones & accessories",
    body: "Checked used handsets plus cases, chargers, cables and earbuds in store.",
    action: "Browse in store",
  },
  {
    to: "/contact",
    tag: "Town Centre Counter",
    icon: Store,
    title: "WhatsApp or in store",
    body: "Message ahead or walk into 4 Aughton St — both reach the same people.",
    action: "Find the shop",
  },
] as const;

const SIMPLE_STEPS = [
  {
    title: "Message us directly",
    body: "No complicated booking process — WhatsApp, call or walk in.",
  },
  {
    title: "Visit us in town",
    body: "You’ll find us in Ormskirk town centre on Aughton Street exactly opposite Costa Coffee.",
  },
  {
    title: "Speak face-to-face",
    body: "Ask questions and get straightforward advice over the counter.",
  },
  {
    title: "Decide before any work starts",
    body: "We'll explain the options first, then it's your call.",
  },
] as const;

function Index() {
  const { data: business } = useQuery(businessQuery());
  const { data: repairs = [] } = useQuery(repairServicesQuery());
  const { data: products = [] } = useQuery(productsQuery());
  const featuredRepairs = repairs.filter((r) => r.featured).slice(0, 4);
  const inStockPhones = products
    .filter(
      (p) => p.product_categories?.slug?.includes("phone") && p.availability !== "OUT_OF_STOCK",
    )
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
        <span className="deco-arc -right-40 -top-52 size-[34rem] md:-right-24" aria-hidden />
        <span className="deco-arc -bottom-72 -left-40 size-[30rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
          <div className="rise-in max-w-2xl">
            <span className="eyebrow-on-brand flex items-center gap-2">
              <MapPin className="size-3.5 text-on-brand/90" aria-hidden />
              Ormskirk · Lancashire
            </span>
            <h1 className="mt-5 text-[clamp(2.35rem,6.2vw,4.5rem)] font-extrabold tracking-[-0.035em] leading-[0.96]">
              Phone repairs
              <br />
              done properly
              <span className="block text-on-brand/75 font-bold mt-1 text-[clamp(1.5rem,3.8vw,2.75rem)] leading-tight">
                right here in Ormskirk town centre.
              </span>
            </h1>
            <p className="lede mt-6 max-w-[34rem] text-on-brand/85 leading-relaxed">
              Cracked screen, battery trouble or a phone that won't charge? Visit us at 4 Aughton St
              or message your device details on WhatsApp for a quote.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/repairs"
                className="press inline-flex min-h-13 sm:min-h-14 items-center justify-center rounded-full bg-background px-8 text-base font-extrabold text-primary shadow-lift"
              >
                Get a repair quote
              </Link>
              <a
                href={whatsappUrl(business, { kind: "repair" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 sm:min-h-14 items-center justify-center gap-2 rounded-full bg-whatsapp px-8 text-base font-extrabold text-whatsapp-foreground shadow-lift"
              >
                <MessageSquare className="size-4.5 shrink-0" aria-hidden />
                WhatsApp us
              </a>
              <DirectionsButton
                tone="outline"
                label="Get directions"
                className="min-h-13! sm:min-h-14! rounded-full! border-on-brand/45! bg-transparent! px-8 text-base! text-on-brand! hover:bg-on-brand/10!"
              />
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-on-brand/20 pt-6 text-sm text-on-brand/85">
              <OpenStatus tone="brand" />
              <a
                href={telUrl(business)}
                className="inline-flex items-center gap-1.5 font-bold text-on-brand hover:underline"
              >
                {business?.phone ?? "Phone number to be confirmed"}
              </a>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {fullAddress(business) || "Ormskirk town centre"}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="float-slow relative isolate overflow-hidden rounded-3xl border border-white/20 shadow-lift ring-1 ring-black/20">
              <img
                src={heroImg640}
                srcSet={`${heroImg400} 400w, ${heroImg640} 640w, ${heroImg800} 800w, ${heroImg1020} 1020w`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 648px"
                alt="Phone Shop Ormskirk storefront on Aughton Street, lit up at night"
                width={1020}
                height={1020}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="aspect-4/3 size-full object-cover lg:aspect-square"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-6 pb-6 pt-24 text-on-brand sm:px-7 sm:pb-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/70">
                      Local Ormskirk Shop
                    </span>
                    <p className="mt-0.5 text-xl font-extrabold leading-tight sm:text-2xl text-white">
                      4 Aughton Street
                    </p>
                    <p className="mt-1 text-xs sm:text-sm font-semibold text-white/80">
                      Opposite Costa Coffee · L39 3BW
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-1.5 backdrop-blur-md border border-white/15 text-sm font-extrabold text-white">
                    <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                    <span>
                      {business?.google_rating ? business.google_rating.toFixed(1) : "4.8"}
                    </span>
                    <span className="text-xs font-semibold text-white/70">Google</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — RETAIL BRANDED SERVICE TILES */}
      <section className="border-b border-border/80 bg-background section-home">
        <div className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ to, tag, icon: Icon, title, body, action }, i) => (
            <Reveal key={to} delay={i * 60} className="h-full">
              <Link
                to={to}
                className="card-lift group flex h-full flex-col justify-between rounded-2xl border border-border/85 bg-card p-6 sm:p-7 shadow-soft hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="rounded-md bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {tag}
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-extrabold tracking-[-0.02em] leading-snug group-hover:text-primary transition-colors">
                    {title}
                  </h2>
                  <p className="body-copy mt-2.5 text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 border-t border-border/60 pt-4 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  <span>{action}</span>
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 2b — PROCESS / TIMELINE */}
      <section className="border-b border-border/80 bg-surface section-home">
        <div className="container-page">
          <Reveal className="max-w-xl">
            <span className="eyebrow">How it works</span>
            <h2 className="display-2 mt-3">A simpler way to sort your phone</h2>
            <span className="rule-accent mt-5" />
            <p className="lede mt-5 text-muted-foreground">
              Straightforward, face-to-face service right on Aughton Street with no confusing jargon
              or hidden fees.
            </p>
          </Reveal>
          <div className="relative mt-10 md:mt-12">
            {/* Connecting line on desktop */}
            <div
              className="hidden lg:block absolute top-6 left-12 right-12 h-0.5 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 -z-0"
              aria-hidden
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {SIMPLE_STEPS.map(({ title, body }, i) => (
                <Reveal key={title} delay={i * 70} className="h-full">
                  <div className="card-lift flex h-full flex-col rounded-2xl border border-border/75 bg-card p-6 shadow-2xs hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background font-black text-sm text-primary shadow-xs">
                        0{i + 1}
                      </span>
                      <span className="h-px flex-1 bg-border/80 lg:hidden" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-base font-extrabold tracking-[-0.02em] leading-snug">
                      {title}
                    </h3>
                    <p className="body-copy mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
                      {body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3 — WHAT WE FIX MOST */}
      <section className="section-home bg-background">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="eyebrow">Repairs</span>
              <h2 className="display-2 mt-3">What we fix most</h2>
              <span className="rule-accent mt-5" />
              <p className="lede mt-4 text-muted-foreground">
                Starting prices rather than fixed promises. The final figure depends on your model
                and what inspection reveals, confirmed before any work begins.
              </p>
            </div>
            <Link
              to="/repairs"
              className="press inline-flex items-center gap-2 rounded-full border border-input bg-card px-6 py-3.5 text-sm font-extrabold hover:border-primary hover:text-primary transition-colors"
            >
              <span>See full price guide</span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
          <div className="mt-8 md:mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRepairs.map((r, i) => (
              <Reveal key={r.id} delay={i * 60} className="h-full">
                <div className="card-lift flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-soft hover:border-primary/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <RepairIcon name={r.icon} className="size-5.5" />
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        In Store
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold tracking-[-0.02em] leading-snug">
                      {r.name}
                    </h3>
                    <p className="body-copy mt-2 text-sm text-muted-foreground leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-border/70 pt-5">
                    <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                      {r.starting_price_pence ? "Starting from" : "Pricing"}
                    </span>
                    <span className="stat-figure mt-1 block text-2xl! font-black text-primary">
                      {r.starting_price_pence
                        ? formatPrice(r.starting_price_pence)
                        : "On inspection"}
                    </span>
                    <a
                      href={whatsappUrl(business, { kind: "repair", repair: r.name })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-xs font-extrabold text-whatsapp-foreground shadow-2xs hover:opacity-95"
                    >
                      <MessageSquare className="size-3.5" aria-hidden />
                      Get WhatsApp quote
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — RED sell / trade-in */}
      <section className="brand-panel section-home relative isolate overflow-hidden">
        <span className="deco-arc -right-52 top-10 size-[30rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal className="overflow-hidden rounded-3xl border border-white/20 shadow-lift ring-1 ring-black/20">
            <img
              src={repairBench}
              alt="iPhone screen replacement at the Phone Shop Ormskirk workbench"
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              className="aspect-4/3 size-full object-cover"
            />
          </Reveal>
          <Reveal delay={80}>
            <span className="eyebrow-on-brand">Sell or trade in</span>
            <h2 className="mt-4 max-w-[22ch] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02]">
              Turn the phone in your drawer into cash.
            </h2>
            <p className="lede mt-5 max-w-xl text-on-brand/85 leading-relaxed">
              Working or faulty — we'll value it with no obligation to sell.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3.5 rounded-2xl bg-black/20 p-4 border border-white/10 backdrop-blur-xs">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground font-black text-xs">
                  1
                </span>
                <p className="text-sm leading-relaxed text-on-brand/90">
                  <strong className="text-on-brand">WhatsApp us:</strong> Send the model, storage
                  and condition. Get a valuation figure before you travel.
                </p>
              </div>
              <div className="flex items-start gap-3.5 rounded-2xl bg-black/20 p-4 border border-white/10 backdrop-blur-xs">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-primary font-black text-xs">
                  2
                </span>
                <p className="text-sm leading-relaxed text-on-brand/90">
                  <strong className="text-on-brand">Walk in to 4 Aughton St:</strong> Drop by for a
                  free valuation and immediate counter decision.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsappUrl(business, { kind: "sell" })}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                Get a valuation on WhatsApp
              </a>
              <Link
                to="/sell-your-phone"
                className="press inline-flex min-h-13 items-center justify-center rounded-full bg-background px-7 text-sm font-extrabold text-primary shadow-lift"
              >
                How selling works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — IN STORE ACCESSORIES & HANDSETS */}
      <section className="section-home bg-background">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="eyebrow">In store</span>
              <h2 className="display-2 mt-3">Checked handsets and everyday accessories</h2>
              <span className="rule-accent mt-5" />
              <p className="lede mt-4 text-muted-foreground">
                Stock moves quickly. Message us before you travel and we'll confirm it's still on
                the shelf.
              </p>
            </div>
            <Link
              to="/shop"
              className="press inline-flex items-center gap-2 rounded-full border border-input px-6 py-3.5 text-sm font-extrabold hover:border-primary hover:text-primary transition-colors"
            >
              <span>Browse all stock</span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>

          {featuredProducts.length > 0 ? (
            <div
              className={`mt-8 md:mt-10 ${
                featuredProducts.length === 1
                  ? "mx-auto grid max-w-3xl gap-6 sm:grid-cols-2"
                  : featuredProducts.length === 2
                    ? "mx-auto grid max-w-3xl gap-6 sm:grid-cols-2"
                    : featuredProducts.length === 3
                      ? "mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {featuredProducts.map((p, i) => (
                <Reveal key={p.id} delay={i * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              ))}
              {featuredProducts.length === 1 ? (
                <Reveal delay={70} className="h-full">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-border/90 bg-surface/60 p-6 sm:p-7 text-center">
                    <div>
                      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Store className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-4 text-base font-extrabold text-foreground">
                        More stock in store daily
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Cases, fast chargers, cables, screen protectors & audio accessories
                        available over the counter at 4 Aughton St.
                      </p>
                    </div>
                    <a
                      href={whatsappUrl(business)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-2xs hover:opacity-95"
                    >
                      <MessageSquare className="size-3.5" aria-hidden />
                      Check stock on WhatsApp
                    </a>
                  </div>
                </Reveal>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-border/80 bg-surface p-8 text-center max-w-xl mx-auto">
              <p className="text-sm font-semibold text-muted-foreground">
                Stock changes daily. Pop into 4 Aughton St or message on WhatsApp to check today's
                counter stock.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 6 — RED/DARK handsets, white cards */}
      {inStockPhones.length > 0 ? (
        <section className="brand-panel-deep section-home relative isolate overflow-hidden">
          <span className="deco-lines" aria-hidden />
          <div className="container-page relative">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <span className="eyebrow-on-brand">
                  <Smartphone className="size-4" aria-hidden />
                  Used &amp; refurbished
                </span>
                <h2 className="display-2 mt-3">Handsets currently in store</h2>
                <p className="lede mt-4 text-on-brand/85 leading-relaxed">
                  Every phone here is second-hand or refurbished, checked before it goes on the
                  shelf and sold with a written receipt. Message us before you travel to confirm
                  availability.
                </p>
              </div>
              <Link
                to="/shop"
                className="press inline-flex items-center gap-2 rounded-full bg-background px-6 py-3.5 text-sm font-extrabold text-primary shadow-lift hover:opacity-95 transition-opacity"
              >
                <span>See all handsets</span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Reveal>
            <div
              className={`mt-8 md:mt-10 ${
                inStockPhones.length === 1
                  ? "mx-auto grid max-w-3xl gap-6 sm:grid-cols-2"
                  : inStockPhones.length === 2
                    ? "mx-auto grid max-w-3xl gap-6 sm:grid-cols-2"
                    : inStockPhones.length === 3
                      ? "mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {inStockPhones.map((p, i) => (
                <Reveal key={p.id} delay={i * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              ))}
              {inStockPhones.length === 1 ? (
                <Reveal delay={70} className="h-full">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-white/15 bg-white/10 p-6 sm:p-7 text-center backdrop-blur-xs text-on-brand">
                    <div>
                      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white">
                        <Smartphone className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-4 text-base font-extrabold text-white">
                        Looking for a specific handset?
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-on-brand/80">
                        We buy, test, and source devices regularly. Message us with the model you
                        want and we'll check incoming inventory.
                      </p>
                    </div>
                    <a
                      href={whatsappUrl(business)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-xs font-extrabold text-whatsapp-foreground shadow-2xs hover:opacity-95"
                    >
                      <MessageSquare className="size-3.5" aria-hidden />
                      Ask on WhatsApp
                    </a>
                  </div>
                </Reveal>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 7 — WHY CHOOSE US */}
      <section className="section-home bg-background">
        <WhyChooseUs />
      </section>

      {/* 8 — GOOGLE REVIEWS */}
      <section className="section-home bg-surface border-y border-border/80">
        <ReviewsSection variant="strip" limit={3} />
      </section>

      {/* 9 — STOREFRONT / FIND US */}
      <section className="brand-panel section-home relative isolate overflow-hidden">
        <span className="deco-arc -left-56 bottom-0 size-[32rem]" aria-hidden />
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <span className="eyebrow-on-brand">Find us</span>
            <h2 className="display-2 mt-3 max-w-[20ch]">4 Aughton St, Ormskirk, L39 3BW</h2>
            <p className="lede mt-5 max-w-xl text-on-brand/85 leading-relaxed">
              Find us at 4 Aughton Street in Ormskirk L39 3BW directly opposite Costa Coffee. Drop
              in and we'll inspect your device over the counter. If you need a specific part, call
              ahead and we'll confirm stock before you set off.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DirectionsButton tone="onBrand" className="min-h-12 rounded-full! px-7 text-sm!" />
              <a
                href={telUrl(business)}
                className="press inline-flex min-h-12 items-center rounded-full border border-on-brand/45 px-7 text-sm font-extrabold text-on-brand hover:bg-on-brand/10"
              >
                {business?.phone ?? "Call the shop"}
              </a>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift"
              >
                <MessageSquare className="size-4" aria-hidden />
                WhatsApp us
              </a>
            </div>
            <OpeningHours tone="brand" className="mt-8 max-w-sm" />
          </Reveal>
          <Reveal delay={80} className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-lift ring-1 ring-black/20">
              <img
                src={storefront ?? accessoriesImg}
                alt={
                  storefront
                    ? "Phone Shop Ormskirk storefront on Aughton Street"
                    : "Phone cases, chargers and earbuds in store at Phone Shop Ormskirk"
                }
                width={600}
                height={450}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 size-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-lift ring-1 ring-black/20">
              <img
                src={interior ?? repairBench}
                alt={
                  interior
                    ? "Phone repair technician at work in the Ormskirk shop"
                    : "Repair counter at Phone Shop Ormskirk with tools and a handset"
                }
                width={600}
                height={450}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 size-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10 — DARK FAQ */}
      <section className="ink-panel section-home">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
          <Reveal>
            <span className="eyebrow-on-brand block">Questions</span>
            <h2 className="display-2 mt-3 font-extrabold text-on-brand">Before you bring it in</h2>
            <span className="rule-accent mt-5 block" />
            <p className="lede mt-4 text-on-brand/85 leading-relaxed">
              Common customer questions answered honestly. If you need anything else, message us
              directly for a straight answer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/faq"
                className="press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-extrabold text-primary-foreground shadow-lift hover:opacity-95"
              >
                All FAQs
              </Link>
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-whatsapp px-7 text-sm font-extrabold text-whatsapp-foreground shadow-lift hover:opacity-95"
              >
                <MessageSquare className="size-4" aria-hidden />
                Ask us on WhatsApp
              </a>
            </div>
            <p className="mt-7 flex items-start gap-2 text-sm leading-relaxed text-on-brand/80">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Any guarantee on a repair or purchase is confirmed in writing on your receipt.
            </p>
            <Link
              to="/reviews"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-on-brand hover:underline"
            >
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
              Read our Google reviews
            </Link>
          </Reveal>
          <div className="rounded-3xl bg-card p-2 sm:p-4 shadow-lift">
            <FaqList limit={6} />
          </div>
        </div>
      </section>

      {/* 11 — RED final CTA with Map */}
      <section className="brand-panel relative isolate overflow-hidden">
        <span className="deco-lines" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-on-brand/80">
              <MapPin className="size-3.5" aria-hidden />
              <span>4 Aughton St, Ormskirk L39 3BW (Opposite Costa Coffee)</span>
            </div>
            <h2 className="mt-2 text-[clamp(1.875rem,3.8vw,2.75rem)] font-extrabold leading-tight">
              Need a repair? Message us now.
            </h2>
            <p className="lede mt-4 text-on-brand/85 leading-relaxed">
              A cracked screen lets in moisture. A dying battery gets worse. The sooner you get in
              touch, the sooner we can look at it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsappUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-whatsapp px-6 text-sm font-extrabold text-whatsapp-foreground shadow-lift hover:brightness-105"
              >
                <MessageSquare className="size-4" aria-hidden />
                WhatsApp us
              </a>
              <a
                href={telUrl(business)}
                className="press inline-flex min-h-12 items-center justify-center rounded-full bg-background px-6 text-sm font-extrabold text-primary shadow-lift hover:bg-tint"
              >
                Call {business?.phone ?? "the store"}
              </a>
              <DirectionsButton
                tone="outline"
                label="Get directions"
                className="min-h-12! rounded-full! border-on-brand/45! bg-transparent! px-6 text-sm! text-on-brand! hover:bg-on-brand/10!"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/25 bg-black/10 shadow-2xl">
            <iframe
              title="Phone Store Ormskirk location on Google Maps"
              src={
                business?.google_maps_embed_url ||
                "https://maps.google.com/maps?q=Phone%20Shop%20Ormskirk%2C%204%20Aughton%20St%2C%20Ormskirk%20L39%203BW%2C%20United%20Kingdom&t=m&z=17&output=embed&iwloc=near"
              }
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[280px] w-full border-0 sm:h-[320px] lg:h-[350px]"
            />
          </div>
        </div>
      </section>
    </>
  );
}
