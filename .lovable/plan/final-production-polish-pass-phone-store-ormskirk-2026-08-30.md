# Final Production Polish Pass — Phone Store Ormskirk

No redesign, no new modules, no backend rewrites. Existing workflows, RPCs, RLS, invoice/stock/payment history stay exactly as they are. Work is grouped so each batch can be verified before the next.

## What the code review found (confirmed by reading the files)

- The Direct Sale screen is **not** yet split-screen: it is a single column with a product list, then a basket, then payment. The brief assumes split-screen exists, so this pass builds it.
- There is **no live summary strip** with change-due anywhere; Take Payment shows only "This payment" and "Remaining".
- There are **no keyboard shortcuts** (`/`, `F2`, `Ctrl+Enter`) and no step numbering on counter forms.
- Printing goes straight to `window.print()` with an in-page A4/receipt toggle — there is no preview dialog, and the toggle is only on the invoice detail screen.
- Login, forgot-password and reset-password routes all exist; they need verification, not rebuilding.

## Batch 1 — Counter one-screen work

- **Direct Sale split screen.** Left 2/3: search (autofocus), category pills, compact product tiles (name, price, availability badge; out-of-stock tiles disabled with clear feedback). Only the tile grid scrolls. Right 1/3: sticky basket with qty +/- capped at available stock, unit price, line total, remove; customer and payment fields underneath, optional ones collapsed. Mobile: full-width grid plus a sticky bar (items + total) that opens the basket in a sheet.
- **Live summary strips** on New Repair (Total | Paid | Balance), Buy Phone (Buying | Intended selling | Expected gross profit | Margin %), Sell Phone (Subtotal | Discount | Total | Paid | Balance), Direct Sale (Subtotal | Discount | Total | Paid | Change due), Take Payment (Total | Already paid | Outstanding | This payment | Remaining / Change due).
- **Change due rule:** cash only, `received - amount due`; never negative — short payments show "Remaining £X". Preview only; the recorded payment stays capped at the balance and the server stays authoritative.
- Step number chips (1, 2, 3…) on the four counter forms so staff follow a fixed order.
- Re-verify no page scrollbar at 1366×768, 1440×900, 1920×1080 on all five forms, and that sticky bars never overlap the last field.

## Batch 2 — Scrolling, tables, dialogs, states

- Remove double scrollbars and nested scroll traps: exactly one scroll region per screen, page-level scroll only on mobile.
- Confirm dialogs lock body scroll, close on Esc where safe, manage focus, and keep actions sticky with internal scrolling only when unavoidable.
- Standardise tables: row height, uppercase headers, right-aligned tabular currency, hover state, action column, badge placement; mobile switches to cards or an intentional horizontal scroll rather than shrunken text.
- Standardise filters (status, payment status, brand, category, condition, date presets Today / This week / This month / Custom, plus Clear filters).
- Standardise loading (skeletons + inline button spinners, no full-screen blockers), empty states with the relevant primary action, and toast wording; error text stays human-readable with no SQL or backend internals surfaced.
- Badge semantics locked: PAID green, PARTIAL amber, UNPAID red, IN STOCK green, SOLD neutral, VOIDED muted/destructive — always text plus colour.

## Batch 3 — Forms, dropdowns, search, keyboard, mobile

- Every form: visible labels, required markers, validation beside the field, values preserved on failure, submit disabled while pending (double-submit blocked), correct `inputMode`/`type` (tel, email, decimal, numeric for IMEI).
- Selects for small option sets, searchable comboboxes for large ones (customer, supplier, product, stock device, model), all usable on touch.
- Global search: debounce, clear button, grouped results with type labels (customer, invoice, repair, IMEI/serial, SKU, product, device, supplier), keyboard navigation, useful empty state.
- Keyboard accelerators, typing-safe (single-key shortcuts ignored inside inputs/textareas/selects): `/` focus search, `Esc` close, `F2` print finalised invoice, `Ctrl/Cmd+Enter` primary action. Guarded so a shortcut can never fire a second transaction.
- Mobile pass at 375, 430, 768, 1024: one-column forms, large targets, sticky bottom actions, drawer nav closing after navigation, no horizontal overflow.

## Batch 4 — Money, reports, printing

- Audit every calculation path for integer-pence arithmetic: repair subtotal/discount/total/paid/balance and payment status thresholds, quantity × unit price, sale discounts, profit (labelled **gross** profit everywhere), stock value, dashboard and report totals.
- Cross-check dashboard vs Reports for the same date range (sales, repair revenue, purchases, gross profit, outstanding, stock value, payments) and confirm voided records are excluded from active totals.
- Print QA on repair invoice, purchase receipt, phone sale, product sale — both formats, with long names, many items, IMEI, discount and partial payment.
  - 80mm receipt: purpose-built layout, black and white, no wide tables or clipping, full NAP + document type + number + date + party + device/IMEI + items + totals + method + terms.
  - A4: formal UK retail invoice with header, business info, customer, items, totals, payment info, terms, footer.
- Add a shared in-app print preview (Thermal / A4 / Print / Close) reachable from the counter forms and invoice history, replacing ad-hoc browser-only printing.
- Save & Print sequence enforced: validate → submit once → confirm success → load the finalised record → open preview. A print failure never re-submits; message reads "Invoice was saved successfully. You can print it again from Invoice History."

## Batch 5 — Auth, permissions, integrity, cleanup

- Auth walkthrough: login (email/current-password autocomplete, show/hide, generic "Incorrect email or password"), forgot password (neutral "If an account exists…" response, back to login), reset password (new + confirm, show/hide, strength and match validation, success message, safe return), logout, session restore, expired session, and role loading with no flash of the dashboard before authorisation resolves.
- Permissions: role-gated actions hidden or disabled rather than failing on click; staff cannot self-elevate; void and role changes stay manager-only.
- Transaction safety: refresh/back never duplicates a repair, purchase, sale, payment or invoice (client-ref idempotency verified); payments blocked on voided or fully paid invoices, negative and invalid overpayments rejected; void requires a reason and records user + timestamp with correct reversals.
- Confirm audit rows are written for purchase, sale, payment, void, stock adjustment and role change.
- Public-site integration check: business details, opening hours, phone/WhatsApp, repair services and prices, products and featured/visibility flags all reflect admin changes, with no private fields exposed.
- Cleanup: no debug logs, placeholder copy, dead or fake buttons, or console errors.

## Verification

Automated Playwright runs across the seven listed widths capturing scrollbar state and sticky-bar overlap, plus scripted end-to-end runs of the scenarios in the brief: repair £79 − £5 discount, £30 part payment then settle; buy phone at £200 with £300 intended resale; sell that phone by IMEI; duplicate-IMEI sale must fail; two-product direct sale with discount and cash change; void a finalised sale; password reset. Print output inspected in both formats.

## Report

Closing summary will cover the 13 requested headings, including anything that genuinely needs the real thermal printer, live email delivery, or real shop data to confirm.
