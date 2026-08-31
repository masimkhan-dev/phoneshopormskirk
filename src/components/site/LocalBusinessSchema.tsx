import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/lib/queries";
import { localBusinessSchema } from "@/lib/format";

/** Emits LocalBusiness structured data built from the live business settings. */
export function LocalBusinessSchema() {
  const { data: business } = useQuery(businessQuery());

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema(business)) }}
    />
  );
}
