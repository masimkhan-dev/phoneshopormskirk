import { ukDate } from "@/lib/admin/money";
import type { InvoiceTermsSnapshot } from "@/lib/admin/terms";

/** Read the immutable terms copy stored on the invoice snapshot or direct record. */
export function invoiceTerms(
  snapshot: Record<string, unknown> | null | undefined,
  fallbackTermsRecord?: InvoiceTermsSnapshot | null,
): InvoiceTermsSnapshot | null {
  const terms = (snapshot as { terms?: InvoiceTermsSnapshot } | null)?.terms;
  if (terms && typeof terms === "object") return terms;
  if (fallbackTermsRecord && typeof fallbackTermsRecord === "object") return fallbackTermsRecord;
  return null;
}

const lines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^[•\-\s]+/, "").trim())
    .filter(Boolean);

/** The customer message saved on this invoice, if any. */
const message = (terms: InvoiceTermsSnapshot) => (terms.customer_message ?? "").trim();

export function SignatureBlockA4() {
  return (
    <div className="mt-4 break-inside-avoid pt-1">
      <div className="grid grid-cols-2 gap-10 text-xs text-ink/70">
        <div>
          <p className="font-semibold text-ink">Customer signature</p>
          <div className="mt-6 border-b border-ink/30" />
        </div>
        <div>
          <p className="font-semibold text-ink">Staff signature</p>
          <div className="mt-6 border-b border-ink/30" />
        </div>
      </div>
    </div>
  );
}

export function SignatureBlockThermal() {
  return (
    <div className="mt-2.5 space-y-2 text-[0.68rem] leading-tight">
      <div>
        <p className="font-semibold text-ink">Customer signature:</p>
        <div className="mt-4 border-b border-ink/30" />
      </div>
      <div>
        <p className="font-semibold text-ink">Staff signature:</p>
        <div className="mt-4 border-b border-ink/30" />
      </div>
    </div>
  );
}

/**
 * A4 customer information block.
 * Renders ONE clean Important Information section containing customer message,
 * warranty validity, and terms & conditions seamlessly, followed by clean signature lines on every invoice.
 */
export function TermsBlockA4({
  terms,
}: {
  terms?: InvoiceTermsSnapshot | null;
  isRepair?: boolean;
}) {
  if (terms?.show_on_a4 === false) return null;

  const friendly = terms ? message(terms) : "";
  const hasWarranty = (terms?.warranty_days ?? 0) > 0;
  const note = terms?.print_customer_note !== false ? (terms?.customer_note ?? "").trim() : "";
  const termsLines = terms ? lines(terms.terms_text) : [];

  const hasInfoContent =
    Boolean(friendly) ||
    hasWarranty ||
    termsLines.length > 0 ||
    Boolean(terms?.additional_terms?.trim()) ||
    Boolean(note);

  return (
    <div className="mt-4 space-y-4">
      {/* ONE UNIFIED IMPORTANT INFORMATION SECTION */}
      {hasInfoContent && (
        <section className="rounded-md border border-ink/15 bg-ink/[0.02] p-3 text-xs leading-relaxed text-ink/80">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
            Important information
          </p>

          {/* 1. Saved Customer Message */}
          {friendly && <p className="mt-1.5">{friendly}</p>}

          {/* 2. Warranty validity line (if warranty applies) */}
          {hasWarranty && terms?.warranty_expires && (
            <p className="mt-1.5 font-semibold text-ink">
              Warranty valid until {ukDate(terms.warranty_expires)}.
            </p>
          )}

          {/* 3. Saved Terms & Conditions */}
          {termsLines.length > 0 && (
            <div className="mt-2 space-y-1 text-ink/75">
              {termsLines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          )}

          {/* 4. Customer Note & Additional Terms */}
          {note && <p className="mt-1.5 text-ink/80">{note}</p>}
          {terms?.additional_terms && <p className="mt-1.5 text-ink/80">{terms.additional_terms}</p>}
        </section>
      )}

      {/* CLEAN HANDWRITTEN SIGNATURE AREA (Present on all invoices) */}
      <SignatureBlockA4 />
    </div>
  );
}

/** Condense long text for narrow thermal format while preserving readability. */
function condense(text: string | null | undefined, limit: number) {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const at = cut.lastIndexOf(" ");
  return `${(at > limit * 0.6 ? cut.slice(0, at) : cut).replace(/[.,;:]$/, "")}…`;
}

/**
 * 80mm thermal receipt customer information block.
 * Compact Important Information block + clean signature lines on every invoice.
 */
export function TermsBlockThermal({
  terms,
}: {
  terms?: InvoiceTermsSnapshot | null;
  isRepair?: boolean;
}) {
  if (terms?.show_on_thermal === false) return null;
  const hasWarranty = (terms?.warranty_days ?? 0) > 0;
  const friendly = terms ? message(terms) : "";
  const termsText = (terms?.terms_text ?? "").trim();
  const note = terms?.print_customer_note !== false ? (terms?.customer_note ?? "").trim() : "";

  const hasInfoContent =
    Boolean(friendly) ||
    hasWarranty ||
    Boolean(termsText) ||
    Boolean(note);

  return (
    <div className="mt-2 border-t border-dashed border-ink/40 pt-1.5 text-[0.68rem] leading-snug">
      {hasInfoContent && (
        <div className="space-y-1">
          <p className="font-extrabold uppercase text-[0.65rem] tracking-wider text-ink/60">
            Important Information
          </p>

          {/* Customer Message */}
          {friendly && <p>{condense(friendly, 420)}</p>}

          {/* Warranty Line */}
          {hasWarranty && (
            <p className="font-semibold">
              Warranty until {terms?.warranty_expires ? ukDate(terms.warranty_expires) : `${terms?.warranty_days} days`}
            </p>
          )}

          {/* Terms & Conditions Text */}
          {termsText && (
            <p className="text-[0.65rem] text-ink/80">
              {condense(termsText, 350)}
            </p>
          )}

          {/* Customer Note */}
          {note && <p>{condense(note, 120)}</p>}
        </div>
      )}

      {/* Clean Handwritten Signature Lines (Present on all invoices) */}
      <SignatureBlockThermal />
    </div>
  );
}
