import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { faqsQuery } from "@/lib/queries";
import { Reveal } from "./Reveal";

type Props = {
  topics?: string[];
  limit?: number;
};

const DEFAULT_FAQS = [
  {
    id: "f1",
    question: "How do I get a repair price?",
    answer:
      "WhatsApp us your model and what's wrong. We'll give you a starting price — a realistic range based on what you describe. When you bring it in we look at it properly and confirm the final price before any work starts.",
    topic: "REPAIRS",
    sort_order: 10,
  },
  {
    id: "f2",
    question: "Are the prices on the site final?",
    answer:
      'No. The "from" prices are starting points. The final cost depends on your exact model and what we find when we examine it. We confirm the price before we start — no surprises.',
    topic: "REPAIRS",
    sort_order: 20,
  },
  {
    id: "f3",
    question: "How long does a repair take?",
    answer:
      "Time depends on the model and what parts we have in stock. Many common jobs are assessed while you wait; others may need a part ordered. We'll tell you upfront when you get in touch.",
    topic: "REPAIRS",
    sort_order: 30,
  },
  {
    id: "f4",
    question: "Do I need an appointment?",
    answer:
      "No. Walk into 4 Aughton St anytime we're open. If you want to check we have a specific part in stock, WhatsApp or call ahead — it saves you a wasted trip.",
    topic: "GENERAL",
    sort_order: 40,
  },
  {
    id: "f5",
    question: "Is my data safe during a repair?",
    answer:
      "We don't need your passcode for most repairs (screens, batteries, charging ports). For software issues we'll ask you to back up first.",
    topic: "REPAIRS",
    sort_order: 50,
  },
  {
    id: "f6",
    question: "How do I pay?",
    answer: "Cash or card — whatever suits you.",
    topic: "GENERAL",
    sort_order: 60,
  },
  {
    id: "f7",
    question: "What if my phone is too old to repair?",
    answer:
      "We'll tell you honestly. If a repair costs more than the phone is worth, we'll say so — and suggest whether to sell it to us, trade it in, or recycle it responsibly.",
    topic: "REPAIRS",
    sort_order: 70,
  },
  {
    id: "f8",
    question: "Do you guarantee your repairs?",
    answer:
      "Yes — in writing on your receipt. The length depends on the repair, but it's there in black and white.",
    topic: "REPAIRS",
    sort_order: 80,
  },
  {
    id: "f9",
    question: "Where is the shop?",
    answer:
      "Find us at 4 Aughton Street Ormskirk L39 3BW in Ormskirk town centre, exactly opposite Costa Coffee.",
    topic: "GENERAL",
    sort_order: 90,
  },
];

/** Accessible, keyboard-friendly FAQ list built on native details/summary. */
export function FaqList({ topics, limit }: Props) {
  const { data = [] } = useQuery(faqsQuery());
  const faqs = data.length > 0 ? data : DEFAULT_FAQS;
  const filtered = topics?.length ? faqs.filter((f) => topics.includes(f.topic)) : faqs;
  const shown = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="divide-y divide-border/80 overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-soft">
      {shown.map((f, i) => (
        <Reveal key={f.id} delay={i * 30} as="div">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[0.9375rem] font-extrabold text-foreground transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
              <span className="leading-snug text-foreground">{f.question}</span>
              <ChevronDown
                className="size-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-border/40 bg-muted/20 px-5 pb-5 pt-3 text-[0.9375rem] leading-relaxed text-foreground/80">
              <p>{f.answer}</p>
            </div>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
