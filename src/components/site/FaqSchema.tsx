import { useQuery } from "@tanstack/react-query";

import { faqsQuery } from "@/lib/queries";

/** Emits FAQPage structured data from the live FAQ records. */
export function FaqSchema() {
  const { data: faqs = [] } = useQuery(faqsQuery());
  if (!faqs.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
