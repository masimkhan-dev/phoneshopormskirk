import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { faqsQuery } from "@/lib/queries";
import { Reveal } from "./Reveal";

type Props = {
  topics?: string[];
  limit?: number;
};

/** Accessible, keyboard-friendly FAQ list built on native details/summary. */
export function FaqList({ topics, limit }: Props) {
  const { data: faqs = [] } = useQuery(faqsQuery());
  const filtered = topics?.length ? faqs.filter((f) => topics.includes(f.topic)) : faqs;
  const shown = limit ? filtered.slice(0, limit) : filtered;

  if (shown.length === 0) return null;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {shown.map((f, i) => (
        <Reveal key={f.id} delay={i * 40} as="div">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-[0.9375rem] font-bold hover:bg-accent/60 focus-visible:bg-accent/60">
              {f.question}
              <ChevronDown
                className="size-4 shrink-0 text-primary transition-transform duration-300 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-6 pb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">{f.answer}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
