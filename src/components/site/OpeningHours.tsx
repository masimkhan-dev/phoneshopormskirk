import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/lib/queries";
import { sortedHours, todayHoursLabel, todayName } from "@/lib/format";
import { useHydrated } from "@/hooks/use-reveal";
import { OpenStatus } from "./OpenStatus";

type Props = {
  tone?: "brand" | "light";
  className?: string;
};

/** Full weekly opening hours with today highlighted and a live open/closed badge. */
export function OpeningHours({ tone = "light", className = "" }: Props) {
  const { data: business } = useQuery(businessQuery());
  const hydrated = useHydrated();
  const hours = sortedHours(business?.opening_hours);
  const today = hydrated ? todayName() : null;
  const onBrand = tone === "brand";

  if (hours.length === 0) {
    return (
      <p className={onBrand ? "text-sm text-on-brand/80" : "text-sm text-muted-foreground"}>
        Opening hours to be confirmed — please call before travelling.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <OpenStatus tone={tone} />
        {hydrated ? (
          <span className={onBrand ? "text-sm text-on-brand/80" : "text-sm text-muted-foreground"}>
            Today: <span className="font-bold">{todayHoursLabel(hours)}</span>
          </span>
        ) : null}
      </div>

      <dl
        className={`mt-4 divide-y text-sm ${
          onBrand ? "divide-on-brand/15 text-on-brand/85" : "divide-border text-foreground"
        }`}
      >
        {hours.map((h) => {
          const isToday = h.day === today;
          return (
            <div
              key={h.day}
              className={`flex justify-between gap-6 rounded-md px-2 py-2.5 ${
                isToday ? (onBrand ? "bg-on-brand/10 font-bold" : "bg-tint font-bold") : ""
              }`}
            >
              <dt>
                {h.day}
                {isToday ? (
                  <span className={onBrand ? "ml-2 text-xs text-on-brand/70" : "ml-2 text-xs text-primary"}>
                    Today
                  </span>
                ) : null}
              </dt>
              <dd className={onBrand ? "text-on-brand/80" : "text-muted-foreground"}>
                {h.open && h.close ? `${h.open} – ${h.close}` : "Closed"}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={`mt-3 text-xs ${onBrand ? "text-on-brand/65" : "text-muted-foreground"}`}>
        All times are UK time (Europe/London).
      </p>
    </div>
  );
}
