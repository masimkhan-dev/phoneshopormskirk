# Production readiness — what's done, what's missing

Site + admin/POS are functionally complete and the build is clean. Below is what still stands between "working" and "safe to run the shop on it".

## Must do before going live

1. **Full security scan + fix**
   Only the dependency scan has run recently. Run the complete scan (RLS, policies, grants, exposed data) and fix anything critical before publishing.

2. **Refunds / returns flow (missing)**
   There is currently no way to refund a customer or take a handset back. Today the only option is voiding an invoice, which is wrong after money has changed hands. Add:
   - Refund action on a paid invoice (full or partial), recorded as a negative payment
   - Return of a serialised handset back into stock, or accessory quantity back
   - Refund receipt print (A4 + thermal) reusing the existing documents

3. **Day-end / cash reconciliation (missing)**
   No end-of-day summary. Add a "Day end" screen: takings by payment method (cash/card), count of invoices, refunds, expected cash in drawer, and a printable summary.

4. **Sitemap + search-engine finish**
   `public/sitemap.xml` does not exist and robots.txt does not reference one. Add a sitemap covering all public pages and link it from robots.txt.

5. **Staff accounts + roles for real use**
   Only the owner account exists. Create the actual counter staff logins with the correct role, and confirm each role can only reach the screens it should.

## Should do (strongly recommended)

6. **Low-stock alerts** — a threshold per accessory and a warning list on the admin dashboard so items don't run out silently.
7. **Business settings sanity pass** — VAT number, company registration (if any), invoice number prefix, opening hours and bank/payment details verified with Altaf so printed invoices are correct.
8. **Backup/export** — one-click CSV export of invoices, stock and customers so the shop is never locked into one system.
9. **Final live QA on the counter** — one real pass of repair, buy, sell, direct sale, part payment, refund, and print on the actual 80mm printer.

## Nice to have (later)

- Customer SMS/email notification when a repair is ready
- Repair job status board for the workshop
- Supplier purchase orders
- Monthly profit/VAT report export for the accountant

## Technical notes

- Refunds: new `refund_invoice` RPC mirroring `void_invoice` but money-aware — inserts a negative payment row, reverses stock (serialised item back to `in_stock`, accessory quantity incremented), writes an audit log entry, never mutates the original invoice or its terms snapshot.
- Day end: server-side aggregate query over payments grouped by method for a date range, printed through the existing thermal document component.
- Sitemap: static `public/sitemap.xml` listing `/`, `/repairs`, `/phone-repair-ormskirk`, `/shop`, `/sell-your-phone`, `/unlocking`, `/reviews`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`; add `Sitemap:` line to robots.txt.
- Low stock: `low_stock_threshold` column on products, dashboard widget filtering below it.

## Suggested order

Security scan → refunds/returns → day end → sitemap → staff accounts → low stock + settings + export → final counter QA → publish.
