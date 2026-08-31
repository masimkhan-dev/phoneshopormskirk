import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";

import { businessQuery } from "@/lib/queries";

/**
 * Seasonal offers strip. Driven entirely by the business settings row so it
 * can be switched on and edited later from the admin without a code change.
 */
export function OffersBanner() {
  const { data: business } = useQuery(businessQuery());

  if (!business?.offer_banner_active || !business.offer_banner_text) return null;

  const content = (
    <span className="inline-flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
      <Tag className="size-4 shrink-0" aria-hidden />
      {business.offer_banner_text}
    </span>
  );

  return (
    <div className="brand-panel-deep text-on-brand">
      <div className="container-page py-2.5 text-center">
        {business.offer_banner_url ? (
          <a
            href={business.offer_banner_url}
            className="underline-offset-4 hover:underline"
            target={business.offer_banner_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
