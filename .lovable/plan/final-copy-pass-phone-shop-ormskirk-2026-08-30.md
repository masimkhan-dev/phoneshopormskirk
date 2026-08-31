# Final copy pass — Phone Shop Ormskirk

Apply the approved final content across every public page. No structural redesign: same routes, same sections, same red rhythm — only wording, headings, CTA labels and a few small content blocks change. Existing "from" prices stay as they are, and no [VERIFY] markers ever appear to visitors.

## Site-wide wording fixes

- "Two minutes from the town centre" → "Right in Ormskirk town centre" (homepage location block and anywhere else it appears).
- "a public record we can't edit" / "where we can't edit or hand-pick a word" → "Read the latest feedback directly on our Google profile." (trust cards, reviews section, reviews page, about page).
- Unlocking language → "so the phone can be used with other compatible networks"; drop "any network" phrasing from the unlocking headline.
- Business name reads "Phone Shop Ormskirk" in body copy; the shopfront sign reference stays ("look for 'Phone Store' on our shopfront — same business, same people").

## Homepage

- Hero: headline "Phone repairs done properly, right here in Ormskirk town centre"; tightened single-paragraph subcopy mentioning 4 Aughton St and WhatsApp; CTAs Get a Repair Quote / WhatsApp Us / Get Directions.
- Why Choose Phone Shop Ormskirk: five trust cards — local shop and straight answers, quote before you decide, everything in one place, 4.8 from 152 Google reviews with the new Google-profile line, easy to contact.
- "A simpler way to sort your phone" four-point block (message us, visit us in town, speak face-to-face, decide before any work starts).
- What we fix most: keep the card grid, add the standing note "Starting prices — not fixed promises… we confirm the price before any work begins", plus a "See full price guide" link to the repairs page.
- Sell/trade-in red section: heading "Turn the phone in your drawer into cash", the two options (WhatsApp valuation / walk-in valuation), CTA "Get a valuation on WhatsApp".
- Phones & accessories: "Checked handsets and everyday accessories" with the "message us before you travel" line and "Browse all stock".
- Find us: address, "Right in Ormskirk town centre", call-ahead line, Get Directions + Message on WhatsApp.
- Final CTA: "Need a repair? Message us now." with the moisture/battery urgency line and WhatsApp / Call +44 7496 499992 / Get Directions.

## Repairs page

Keep the searchable price guide, and add a detailed per-repair section above it for screen, battery, charging port, camera and unlocking, each with The problem / What we do / How long and its own WhatsApp CTA. Replace the current four generic steps with the five-point "Our repair approach" (quote first, no work without your go-ahead, guarantee in writing on your receipt, data stays put, honest advice).

## Sell page

Three-step how-it-works (WhatsApp figure, free in-store check, get paid by cash or bank transfer), "What we buy" list, a "What affects the price?" factor table, the iCloud/Google-account tip, and a trade-in block with WhatsApp + See phones in stock CTAs. The existing detailed valuation form stays.

## Shop page

Split the page clearly: a pre-owned handsets block led by the four-point checklist (tested in store, unlocked for any UK network, wiped to factory settings, sold with a written guarantee) and the "stock moves quickly" line, then a separate accessories block, then a "Why buy from a shop?" online-vs-us comparison. Product data keeps coming from the database; only surrounding copy and headings change.

## Unlocking page

Rewrite to: what phone unlocking is, "Is my phone eligible?" (usually possible / may not be possible lists, "we check eligibility first — no charge if we cannot proceed"), how long it takes by device family, and pricing by model/network with a WhatsApp quote CTA. Keep the enquiry form.

## Reviews, FAQ, About, Contact

- Reviews: "What Ormskirk customers say about us", 4.8 from 152 reviews prominent, "Why we link to Google" block, Read / Leave a review CTAs.
- FAQ: replace the database FAQ rows with the approved twelve questions and answers, keeping the same accordion.
- About: independent-shop story, three beliefs (honesty first, local service, simple contact), "Why we're on Aughton St", Google reviews block.
- Contact: address heading, directions block, contact methods, full weekly hours with the Europe/London note, nearby parking list, and nearby-areas line (Skelmersdale, Burscough, Southport, Maghull, Formby, West Lancashire). The email row is left out until an address is supplied.

## Technical notes

- Copy edits land in `src/routes/*.tsx` and `src/components/site/*.tsx`; per-page `head()` titles and descriptions are refreshed to match the new headings.
- FAQ content is data, so it is updated with a database migration against the `faqs` table rather than hardcoded.
- Repair "from" prices and product prices continue to come from the database and are left unchanged.
- Mobile check afterwards on hero, cards, tables (converted to stacked layouts on small screens) and CTA rows for overflow and readability.
