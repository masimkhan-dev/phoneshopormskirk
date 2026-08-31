import { ukDate } from "@/lib/admin/money";
import type { InvoiceTermsSnapshot } from "@/lib/admin/terms";

/** Read the immutable terms copy stored on the invoice snapshot. */
export function invoiceTerms(
  snapshot: Record<string, unknown> | null | undefined,
): InvoiceTermsSnapshot | null {
  const terms = (snapshot as { terms?: InvoiceTermsSnapshot } | null)?.terms;
  return terms && typeof terms === "object" ? terms : null;
}

const lines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^[•\-\s]+/, "").trim())
    .filter(Boolean);

/** The friendly customer message saved on this invoice, if any. */
const message = (terms: InvoiceTermsSnapshot) => (terms.customer_message ?? "").trim();

/**
 * A4 customer information block. When the invoice carries a saved customer
 * message we print that warm paragraph in one subtle box; older invoices fall
 * back to the legacy legal layout so history stays exactly as it was printed.
 */
export function TermsBlockA4({ terms }: { terms: InvoiceTermsSnapshot }) {
  if (terms.show_on_a4 === false) return null;

  const friendly = message(terms);
  const hasWarranty = (terms.warranty_days ?? 0) > 0;
  const note = terms.print_customer_note !== false ? (terms.customer_note ?? "").trim() : "";

  if (friendly) {
    return (
      <section className="mt-5 rounded-md border border-ink/15 bg-ink/[0.02] p-3 text-xs leading-relaxed text-ink/80">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
          Important information
        </p>
        <p className="mt-1">{friendly}</p>
        {hasWarranty && terms.warranty_expires && (
          <p className="mt-1 font-semibold text-ink">
            Warranty valid until {ukDate(terms.warranty_expires)}
          </p>
        )}
        {note && <p className="mt-1">{note}</p>}
        {terms.additional_terms && <p className="mt-1">{terms.additional_terms}</p>}
      </section>
    );
  }

  const exclusions = lines(terms.exclusions_text);
  const hasContent =
    hasWarranty ||
    exclusions.length > 0 ||
    Boolean((terms.terms_text ?? "").trim()) ||
    Boolean((terms.additional_terms ?? "").trim()) ||
    Boolean(note) ||
    Boolean((terms.footer_note ?? "").trim());
  if (!hasContent) return null;

  return (
    <section className="mt-5 space-y-3 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink/80">
      {hasWarranty && (
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
            {terms.warranty_title || "Warranty"}
          </p>
          <p className="font-bold text-ink">
            {terms.warranty_days} days from the date of this invoice
            {terms.warranty_expires ? ` · expires ${ukDate(terms.warranty_expires)}` : ""}
          </p>
          {terms.warranty_text && <p className="mt-1">{terms.warranty_text}</p>}
        </div>
      )}

      {exclusions.length > 0 && (
        <div>
          <p className="font-bold text-ink">Not covered</p>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
            {exclusions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {terms.terms_text && (
        <div>
          {lines(terms.terms_text).map((line) => (
            <p key={line} className="mt-0.5">
              {line}
            </p>
          ))}
        </div>
      )}

      {terms.additional_terms && <p>{terms.additional_terms}</p>}
      {note && <p>{note}</p>}
      {terms.footer_note && <p className="pt-1 font-semibold text-ink">{terms.footer_note}</p>}
    </section>
  );
}

/** Condense long terms so an 80mm receipt never runs to extra pages. */
function condense(text: string | null | undefined, limit: number) {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const at = cut.lastIndexOf(" ");
  return `${(at > limit * 0.6 ? cut.slice(0, at) : cut).replace(/[.,;:]$/, "")}…`;
}

/** Short customer message for the 80mm receipt. Blank parts are omitted. */
export function TermsBlockThermal({ terms }: { terms: InvoiceTermsSnapshot }) {
  if (terms.show_on_thermal === false) return null;
  const hasWarranty = (terms.warranty_days ?? 0) > 0;
  const friendly = message(terms);

  if (friendly) {
    return (
      <div className="mt-2 border-t border-dashed border-ink/40 pt-1 text-[0.68rem] leading-relaxed">
        <p>{condense(friendly, 420)}</p>
        {hasWarranty && terms.warranty_expires && (
          <p className="mt-1 font-semibold">Warranty until {ukDate(terms.warranty_expires)}</p>
        )}
      </div>
    );
  }

  const heading = hasWarranty
    ? `${terms.warranty_title || "Warranty"}: ${terms.warranty_days} days`
    : terms.invoice_type === "PURCHASE"
      ? "Seller declaration"
      : null;
  const body = condense(terms.warranty_text || terms.terms_text, 220);
  const note = terms.print_customer_note !== false ? condense(terms.customer_note, 120) : "";
  const rows = [heading, body, note].filter(Boolean);
  if (rows.length === 0 && !terms.footer_note) return null;

  return (
    <div className="mt-2 border-t border-dashed border-ink/40 pt-1 text-[0.68rem] leading-relaxed">
      {heading && <p className="font-extrabold uppercase">{heading}</p>}
      {hasWarranty && terms.warranty_expires && <p>Expires {ukDate(terms.warranty_expires)}</p>}
      {body && <p className="mt-1">{body}</p>}
      {note && <p className="mt-1">{note}</p>}
      {terms.footer_note && <p className="mt-1">{condense(terms.footer_note, 120)}</p>}
    </div>
  );
}
