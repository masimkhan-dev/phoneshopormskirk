import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Field, SelectField, StepBadge } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ukDate } from "@/lib/admin/money";
import { termsSettingsQuery } from "@/lib/admin/queries";
import {
  WARRANTY_DAY_OPTIONS,
  draftFromSettings,
  termsDraftPayload,
  termsPayload,
  warrantyExpiry,
  type TermsDraft,
  type TermsSettings,
  type TermsType,
} from "@/lib/admin/terms";

export type TermsController = {
  type: TermsType;
  settings: TermsSettings | undefined;
  draft: TermsDraft;
  setDraft: (patch: Partial<TermsDraft>) => void;
  reset: () => void;
  /** Always false so counter forms are never blocked */
  acknowledgementMissing: boolean;
  /** Staff-edited copy to embed in a counter create payload (atomic save). */
  createPayload: () => Record<string, unknown>;
  /** Full payload for the standalone attach_invoice_terms workflow. */
  payload: (invoiceId: string) => Record<string, unknown>;
};

/**
 * Loads the template for a transaction type and keeps a per-invoice draft that
 * staff may edit freely. The draft is snapshotted onto the invoice on save.
 */
export function useTerms(type: TermsType): TermsController {
  const { data: all } = useQuery(termsSettingsQuery);
  const settings = useMemo(() => all?.find((s) => s.type === type), [all, type]);
  const [draft, setDraftState] = useState<TermsDraft | null>(null);
  const [loadedFor, setLoadedFor] = useState<TermsType | null>(null);

  useEffect(() => {
    if (settings && (!draft || loadedFor !== type)) {
      setDraftState(draftFromSettings(settings));
      setLoadedFor(type);
    }
  }, [settings, draft, loadedFor, type]);

  const current: TermsDraft =
    draft ??
    (settings
      ? draftFromSettings(settings)
      : {
          warranty_days: 0,
          warranty_title: "Warranty",
          warranty_text: "",
          terms_text: "",
          exclusions_text: "",
          footer_note: "",
          additional_terms: "",
          internal_note: "",
          customer_note: "",
          print_customer_note: true,
          customer_acknowledged: true,
          include_exclusions: false,
          customer_message: "",
        });

  return {
    type,
    settings,
    draft: current,
    setDraft: (patch) => setDraftState({ ...current, ...patch }),
    reset: () => setDraftState(settings ? draftFromSettings(settings) : null),
    acknowledgementMissing: false,
    createPayload: () => termsDraftPayload(type, current, settings),
    payload: (invoiceId) => termsPayload(invoiceId, type, current, settings),
  };
}

const isPurchase = (t: TermsType) => t === "PURCHASE";

/** Compact counter section showing Warranty length, Customer message, and Terms & conditions. */
export function TermsWarranty({
  terms,
  step,
  collapsible = true,
}: {
  terms: TermsController;
  step?: number;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { draft, setDraft } = terms;
  const expiry = warrantyExpiry(draft.warranty_days);
  const dayValue = WARRANTY_DAY_OPTIONS.some((o) => o.value === String(draft.warranty_days))
    ? String(draft.warranty_days)
    : "custom";

  const summary = isPurchase(terms.type)
    ? "Seller declaration & terms"
    : draft.warranty_days > 0
      ? `${draft.warranty_days} day warranty${expiry ? ` · expires ${ukDate(expiry)}` : ""}`
      : "No warranty";

  const content = (
    <div className="space-y-2.5">
      {!isPurchase(terms.type) && (
        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-3">
          <Field label="Warranty length" htmlFor="terms-days">
            <SelectField
              id="terms-days"
              value={dayValue}
              onChange={(v) => {
                if (v === "custom") return;
                setDraft({ warranty_days: Number(v) });
              }}
              options={[...WARRANTY_DAY_OPTIONS, { value: "custom", label: "Custom…" }]}
            />
          </Field>
          <Field label="Custom days" htmlFor="terms-custom-days">
            <Input
              id="terms-custom-days"
              className="h-9"
              inputMode="numeric"
              value={String(draft.warranty_days)}
              onChange={(e) =>
                setDraft({
                  warranty_days: Math.max(
                    0,
                    Math.min(3650, Number(e.target.value.replace(/[^0-9]/g, "") || 0)),
                  ),
                })
              }
            />
          </Field>
          <Field label="Expires" hint="Calculated from today.">
            <p className="flex h-9 items-center text-xs font-extrabold text-foreground">
              {expiry ? ukDate(expiry) : "No expiry"}
            </p>
          </Field>
        </div>
      )}

      <Field
        label="Customer message (printed)"
        htmlFor="terms-customer-message"
      >
        <Textarea
          id="terms-customer-message"
          rows={2}
          placeholder="Customer message printed on receipt/invoice…"
          value={draft.customer_message}
          onChange={(e) => setDraft({ customer_message: e.target.value })}
        />
      </Field>

      <Field
        label="Terms & conditions"
        htmlFor="terms-text"
      >
        <Textarea
          id="terms-text"
          rows={3}
          placeholder="Terms & conditions for this invoice…"
          value={draft.terms_text}
          onChange={(e) => setDraft({ terms_text: e.target.value })}
        />
      </Field>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="admin-card p-3">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="admin-label flex items-center gap-2">
            {step !== undefined && <StepBadge step={step} />}
            Terms &amp; warranty
          </p>
          <span className="text-xs font-semibold text-muted-foreground">{summary}</span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="admin-card px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="admin-label flex items-center gap-2">
          {step !== undefined && <StepBadge step={step} />}
          Terms &amp; warranty
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">{summary}</span>
          <span className="text-xs font-bold text-primary">{open ? "Hide" : "Edit"}</span>
        </span>
      </button>

      {open && <div className="mt-2.5 pb-1">{content}</div>}
    </div>
  );
}
