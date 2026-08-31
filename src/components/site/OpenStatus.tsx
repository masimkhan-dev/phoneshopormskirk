import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/lib/queries";
import { openState } from "@/lib/format";
import { useHydrated } from "@/hooks/use-reveal";

type Props = {
  /** "brand" for use on red/dark panels, "light" for white surfaces. */
  tone?: "brand" | "light";
  className?: string;
  showDetail?: boolean;
};

/**
 * Live open / closed indicator. Rendered only after hydration because it
 * depends on the visitor's current time.
 */
export function OpenStatus({ tone = "light", className = "", showDetail = true }: Props) {
  const { data: business } = useQuery(businessQuery());
  const hydrated = useHydrated();
  const state = openState(business?.opening_hours);

  if (!hydrated || !state.known) return null;

  const dotColour = state.open ? "bg-whatsapp" : "bg-muted-foreground";
  const shell =
    tone === "brand"
      ? "border-on-brand/25 bg-on-brand/10 text-on-brand"
      : "border-border bg-card text-foreground";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${shell} ${className}`}
      aria-live="polite"
    >
      <span className="relative flex size-2.5" aria-hidden>
        {state.open ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-whatsapp opacity-70 motion-reduce:animate-none" />
        ) : null}
        <span className={`relative inline-flex size-2.5 rounded-full ${dotColour}`} />
      </span>
      {state.status}
      {showDetail && state.detail ? (
        <span className={tone === "brand" ? "font-medium text-on-brand/75" : "font-medium text-muted-foreground"}>
          · {state.detail}
        </span>
      ) : null}
    </span>
  );
}
