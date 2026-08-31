import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { directionsUrl } from "@/lib/format";

type Props = {
  /** Visual treatment for the surface it sits on. */
  tone?: "primary" | "onBrand" | "outline";
  className?: string;
  label?: string;
};

const TONES: Record<string, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:opacity-90",
  onBrand: "bg-background text-primary shadow-lift hover:opacity-90",
  outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-primary",
};

/** Get Directions CTA, used across the site so "Visit Store" is always one tap away. */
export function DirectionsButton({
  tone = "primary",
  className = "",
  label = "Get directions",
}: Props) {
  const { data: business } = useQuery(businessQuery());

  return (
    <a
      href={directionsUrl(business)}
      target="_blank"
      rel="noopener noreferrer"
      className={`press inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-bold transition-all ${TONES[tone]} ${className}`}
    >
      <MapPin className="size-4" aria-hidden />
      {label}
    </a>
  );
}
