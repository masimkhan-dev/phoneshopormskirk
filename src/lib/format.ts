import type { BusinessSettings, OpeningHour } from "./types";

export function formatPrice(pence: number | null | undefined) {
  if (pence === null || pence === undefined) return null;
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
  }).format(pounds);
}

export const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  LIMITED: "Limited",
  OUT_OF_STOCK: "Out of stock",
};

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Monday-first list, used for hours tables. */
export const WEEK_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function sortedHours(hours: OpeningHour[] | undefined | null): OpeningHour[] {
  if (!hours?.length) return [];
  return [...hours].sort(
    (a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day),
  );
}

/** The shop's local timezone — all open/closed logic runs in UK time. */
export const SHOP_TIMEZONE = "Europe/London";

/** Day name + minutes-since-midnight in the shop's timezone. */
export function shopNow(now = new Date(), timeZone = SHOP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  return {
    day: get("weekday"),
    minutes: hour * 60 + Number(get("minute")),
  };
}

export function todayName(now = new Date(), timeZone = SHOP_TIMEZONE) {
  return shopNow(now, timeZone).day;
}

export function todayHours(hours: OpeningHour[] | undefined): {
  label: string;
  open: boolean;
} {
  if (!hours?.length) return { label: "Opening hours to be confirmed", open: false };
  const entry = hours.find((h) => h.day === todayName(new Date()));
  if (!entry || !entry.open || !entry.close) return { label: "Closed today", open: false };
  return { label: `Open today: ${entry.open} – ${entry.close}`, open: true };
}

function toMinutes(value: string) {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

export type OpenState = {
  known: boolean;
  open: boolean;
  /** Short badge text, e.g. "Open now" / "Closed" */
  status: string;
  /** Supporting detail, e.g. "Until 17:30" or "Opens Monday 09:30" */
  detail: string;
};

/**
 * Works out whether the shop is open right now from the opening hours data.
 * Deliberately returns known:false when hours are not configured, so the UI
 * can stay silent rather than guess.
 */
export function openState(
  hours: OpeningHour[] | undefined | null,
  now = new Date(),
  timeZone = SHOP_TIMEZONE,
): OpenState {
  if (!hours?.length) {
    return { known: false, open: false, status: "Hours to be confirmed", detail: "" };
  }

  const { day, minutes: minutesNow } = shopNow(now, timeZone);
  const todayIndex = WEEK_ORDER.indexOf(day);
  const today = hours.find((h) => h.day === day);

  if (today?.open && today.close) {
    const from = toMinutes(today.open);
    const to = toMinutes(today.close);
    if (minutesNow >= from && minutesNow < to) {
      return { known: true, open: true, status: "Open now", detail: `Closes ${today.close}` };
    }
    if (minutesNow < from) {
      return { known: true, open: false, status: "Closed now", detail: `Opens today ${today.open}` };
    }
  }

  for (let step = 1; step <= 7; step += 1) {
    const dayName = WEEK_ORDER[(todayIndex + step) % 7];
    const entry = hours.find((h) => h.day === dayName);
    if (entry?.open && entry.close) {
      const when = step === 1 ? "tomorrow" : dayName;
      return {
        known: true,
        open: false,
        status: "Closed now",
        detail: `Opens ${when} ${entry.open}`,
      };
    }
  }

  return { known: true, open: false, status: "Closed now", detail: "" };
}

/** Today's hours as a short label, e.g. "09:00 – 19:30" or "Closed". */
export function todayHoursLabel(hours: OpeningHour[] | undefined | null, now = new Date()) {
  const entry = sortedHours(hours).find((h) => h.day === todayName(now));
  if (!entry?.open || !entry.close) return "Closed";
  return `${entry.open} – ${entry.close}`;
}

export function fullAddress(b: BusinessSettings | null | undefined) {
  if (!b) return "";
  return [b.address_line1, b.address_line2, b.city, b.postcode].filter(Boolean).join(", ");
}

export function directionsUrl(b: BusinessSettings | null | undefined) {
  if (b?.google_directions_url) return b.google_directions_url;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    fullAddress(b) || "Ormskirk",
  )}`;
}

export function reviewsUrl(b: BusinessSettings | null | undefined) {
  if (b?.google_reviews_url) return b.google_reviews_url;
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${b?.business_name ?? "Phone Shop Ormskirk"} reviews Ormskirk`,
  )}`;
}

/** Schema.org openingHoursSpecification built from the settings data. */
export function openingHoursSchema(hours: OpeningHour[] | undefined | null) {
  return sortedHours(hours)
    .filter((h) => h.open && h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${h.day}`,
      opens: h.open,
      closes: h.close,
    }));
}

export function localBusinessSchema(b: BusinessSettings | null | undefined) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "MobilePhoneStore"],
    priceRange: "£",
    name: b?.business_name ?? "Phone Shop Ormskirk",
    description:
      b?.tagline ?? "Phone repairs, unlocking, used phones and accessories in Ormskirk.",
    address: {
      "@type": "PostalAddress",
      streetAddress: [b?.address_line1, b?.address_line2].filter(Boolean).join(", ") || undefined,
      addressLocality: b?.city ?? "Ormskirk",
      postalCode: b?.postcode ?? undefined,
      addressRegion: "Lancashire",
      addressCountry: "GB",
    },
    telephone: b?.phone ?? undefined,
    email: b?.email ?? undefined,
    areaServed: "Ormskirk, Lancashire",
    ...(b?.latitude && b?.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: b.latitude, longitude: b.longitude } }
      : {}),
    ...(b?.google_maps_url ? { hasMap: b.google_maps_url } : {}),
    openingHoursSpecification: openingHoursSchema(b?.opening_hours),
    ...(b?.logo_url ? { image: b.logo_url, logo: b.logo_url } : {}),
    ...(b?.google_rating && b?.google_review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: b.google_rating,
            reviewCount: b.google_review_count,
            bestRating: 5,
          },
        }
      : {}),
    sameAs: Object.values(b?.social_links ?? {}),
  };
}
