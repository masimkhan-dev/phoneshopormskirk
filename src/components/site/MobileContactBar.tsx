import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle, Phone } from "lucide-react";

import { businessQuery } from "@/lib/queries";
import { directionsUrl } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";

/** Fixed conversion bar on mobile: call, WhatsApp, directions. */
export function MobileContactBar() {
  const { data: business } = useQuery(businessQuery());

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-3 text-center text-xs font-bold">
        <a href={telUrl(business)} className="press flex flex-col items-center gap-1 py-3 text-foreground">
          <Phone className="size-5 text-primary" aria-hidden />
          Call
        </a>
        <a
          href={whatsappUrl(business)}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex flex-col items-center gap-1 border-x border-border py-3 text-foreground"
        >
          <MessageCircle className="size-5 text-whatsapp" aria-hidden />
          WhatsApp
        </a>
        <a
          href={directionsUrl(business)}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex flex-col items-center gap-1 py-3 text-foreground"
        >
          <MapPin className="size-5 text-primary" aria-hidden />
          Directions
        </a>
      </div>
    </div>
  );
}
