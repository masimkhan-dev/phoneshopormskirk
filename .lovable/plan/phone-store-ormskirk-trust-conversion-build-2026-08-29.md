# Phone Store Ormskirk — Trust & Conversion Build

Everything on the site supports four conversions: **Repair Quote → WhatsApp**, **Sell My Phone → Quote**, **Browse Products → WhatsApp**, **Visit Store → Directions**.

No unverified claims. Until you send confirmed wording, no "same day", no warranty length, no "best price". Sections for warranty and payment methods will be built but stay hidden until the confirmed text is in the settings data.

## New pages

- **Reviews** (`/reviews`) — Google Reviews block with a strong "See our reviews on Google" CTA, plus a "leave a review" link. Real customer quotes only once you paste them; no invented testimonials.
- **FAQ** (`/faq`) — repairs, quotes, payment, data safety, warranty, timings. Answers written to avoid promises.
- **Ormskirk local page** (`/phone-repair-ormskirk`) — genuinely local content: area served, landmarks, travel/parking, what people bring in most. No keyword stuffing.
- **Privacy Policy**, **Cookie Policy**, **Terms** (`/privacy`, `/cookies`, `/terms`) — UK/GDPR-appropriate text.

## Existing pages upgraded

- **Home** — open/closed live indicator, storefront photo band, Why Choose Us (practical points only), Featured Deals, Recently Added Phones, reviews strip, FAQ teaser, prominent Get Directions.
- **Repairs** — restyled as a **price guide** with "from" prices and an explicit "final price confirmed after inspection" note; search + category filter; every card opens a prefilled WhatsApp quote.
- **Sell** — full quote form: brand/model, storage, condition, network, IMEI-optional, contact preference. Submits to the enquiries table and offers a WhatsApp handoff.
- **Shop** — product search across cases, chargers, cables, accessories, phones; availability badges (Available / Limited / Out of Stock); out-of-stock items show a WhatsApp enquiry CTA instead of a dead end; quick-specs comparison on used handsets.
- **Unlocking** — kept, with WhatsApp quote path and FAQ.
- **Contact** — hours table with today highlighted, open/closed state, directions, map, WhatsApp.

## Site-wide

- **Open / Closed indicator** computed from opening hours, shown in header, contact, and home.
- **Sticky mobile bottom bar**: Call | WhatsApp | Directions (already present, refined and always reachable).
- **Cookie consent banner** with accept/reject; non-essential scripts only load after consent.
- **Offers banner** driven by a settings row so seasonal deals can be switched on later from admin.
- **Social links** (Instagram/Facebook) shown only when the values exist.
- **Structured data**: LocalBusiness with address, phone, opening hours, geo, plus Product schema on handset pages and Breadcrumbs.
- **Accessibility**: keyboard-navigable menus and filters, visible focus rings, labelled form fields, contrast-checked red/white pairs, skip-to-content link.

## Motion (mobile-first, tasteful)

Short, purposeful animations so the site feels crafted rather than generated: staggered reveal on section entry, subtle image parallax on the hero, animated open/closed pulse, press feedback on sticky bar buttons, smooth filter/search transitions, sheet-style mobile menu. All respect `prefers-reduced-motion`.

## Looking hand-built, not AI-made

- Real storefront and bench photography in place of stock-feel imagery (you're uploading these; placeholder slots are clearly marked meanwhile).
- Editorial asymmetry, varied section widths, hand-set type scale rather than repeated identical card grids.
- Copy written in plain UK shop voice with local specifics.

## Real data to replace before launch

Address, phone, WhatsApp number, opening hours, Google Business/reviews link, warranty policy, payment methods, social links, storefront photos. Paste them and I'll write them into the settings data as the first launch step.

## Technical notes

- New routes as TanStack Start file routes, each with its own `head()` metadata, canonical and og tags.
- Reviews link, offers banner, warranty text, payment methods and social links added as columns on the business settings table so they're editable data, not hardcoded.
- Product search/filter done client-side over the existing React Query product cache; new indexed columns only if the catalogue grows.
- Sell-quote fields added to the enquiries table; submission via a server function with validation.
- Cookie consent state in localStorage, read after hydration to avoid SSR mismatch.
- Animations via CSS/Tailwind transitions and a small intersection-observer reveal hook — no heavy animation dependency.
