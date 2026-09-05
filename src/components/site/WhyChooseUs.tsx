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
      body: "Send the model and fault to get a starting price back — no forms and no waiting on hold.",
    },
    {
      icon: Store,
      title: "A real shop in Ormskirk town centre",
      body: "Find us at 4 Aughton Street in Ormskirk L39 3BW directly opposite Costa Coffee. Speak face-to-face with the technician, ask questions and collect your handset from the same counter.",
    },
    {
      icon: Wrench,
      title: "Repairs and phones under one roof",
      body: "Repair your current phone, trade it in or buy a checked handset — all handled over the same counter.",
    },
    {
      icon: MapPin,
      title: "Nothing starts without your say-so",
      body: "We examine your device, explain what is wrong in plain English and confirm the price before any work begins.",
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
            body: "Cash, cards, contactless, Apple Pay & Google Pay all accepted at our shop counter.",
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
          We'd rather under-promise and get it right. If a repair isn't worth the money, we'll say
          so and tell you what we'd do instead.
        </p>
      </Reveal>

      <div className="mt-10 md:mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {points.map(({ icon: Icon, title, body }, i) => (
          <Reveal
            key={title}
            delay={i * 50}
            className="card-lift flex h-full flex-col rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-soft hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Icon className="size-5.5" aria-hidden />
              </span>
              <span className="text-xs font-extrabold tracking-widest text-muted-foreground/50">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-extrabold tracking-[-0.02em] leading-snug">{title}</h3>
            <p className="body-copy mt-2.5 flex-1 text-muted-foreground">{body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
