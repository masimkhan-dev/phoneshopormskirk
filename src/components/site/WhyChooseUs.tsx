import { useQuery } from "@tanstack/react-query";
import { CreditCard, MapPin, MessageCircle, ShieldCheck, Star, Store, Wrench } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { Reveal } from "./Reveal";

/**
 * Practical trust points only. Warranty, rating and payment claims are
 * rendered from the business settings, so nothing is published that the shop
 * hasn't confirmed.
 */
export function WhyChooseUs() {
  const { data: business } = useQuery(businessQuery());
  const payments = business?.payment_methods ?? [];
  const rating = business?.google_rating;

  const points = [
    {
      icon: MessageCircle,
      title: "Straight answers on WhatsApp",
      body: "Send the model and the fault and you'll get a starting price back — no forms, no waiting on hold.",
    },
    {
      icon: Store,
      title: "A real shop in Ormskirk town centre",
      body: "4 Aughton St. You can hand your phone to the person looking at it, ask questions and pick it up in the same place.",
    },
    {
      icon: Wrench,
      title: "Repairs and phones under one roof",
      body: "Repair the one you've got, trade it in, or buy a checked used handset — all handled over the same counter.",
    },
    {
      icon: MapPin,
      title: "Nothing starts without your say-so",
      body: "We look at the device, explain what's wrong in plain English and confirm the price before any work begins.",
    },
    ...(rating
      ? [
          {
            icon: Star,
            title: "Rated by local customers",
            body: `Rated ${rating.toFixed(1)} on Google${
              business?.google_review_count ? ` from ${business.google_review_count} reviews` : ""
            }. Read the latest feedback directly on our Google profile.`,
          },
        ]
      : []),

    ...(business?.warranty_policy
      ? [
          {
            icon: ShieldCheck,
            title: "Repair guarantee",
            body: business.warranty_policy,
          },
        ]
      : []),
    ...(payments.length
      ? [
          {
            icon: CreditCard,
            title: "Payments accepted",
            body: payments.join(" · "),
          },
        ]
      : []),
  ];

  return (
    <div className="container-page">
      <Reveal className="max-w-2xl">
        <span className="eyebrow">Why choose us</span>
        <h2 className="display-2 mt-4">Why people come to us</h2>
        <span className="rule-accent mt-6" />
        <p className="lede mt-6 text-muted-foreground">
          We'd rather under-promise and get it right. If a repair isn't worth the money, we'll say so
          and tell you what we'd do instead.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {points.map(({ icon: Icon, title, body }, i) => (
          <Reveal
            key={title}
            delay={i * 60}
            className="card-lift rounded-2xl border border-border bg-card p-8 shadow-soft"
          >
            <span className="icon-dot">
              <Icon className="size-5.5" aria-hidden />
            </span>
            <h3 className="mt-6 text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
            <p className="body-copy mt-3 text-muted-foreground">{body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
