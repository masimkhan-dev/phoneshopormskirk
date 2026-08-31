import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Field, SelectField, StepBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ukDate } from "@/lib/admin/money";
import { termsSettingsQuery } from "@/lib/admin/queries";
import {
  WARRANTY_DAY_OPTIONS,
  composeCustomerMessage,
  draftFromSettings,
  renderCustomerMessage,
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
  /** True when the template insists staff tick the acknowledgement box. */
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
          customer_acknowledged: false,
          include_exclusions: false,
          customer_message: "",

        });

  return {
    type,
    settings,
    draft: current,
    setDraft: (patch) => setDraftState({ ...current, ...patch }),
    reset: () => setDraftState(settings ? draftFromSettings(settings) : null),
    acknowledgementMissing:
      settings?.require_acknowledgement === true && !current.customer_acknowledged,
    createPayload: () => termsDraftPayload(type, current, settings),
    payload: (invoiceId) => termsPayload(invoiceId, type, current, settings),
  };
}

const isPurchase = (t: TermsType) => t === "PURCHASE";

/** Collapsible counter section for warranty length, wording and notes. */
export function TermsWarranty({ terms, step }: { terms: TermsController; step?: number }) {
  const [open, setOpen] = useState(false);
  const { draft, setDraft, settings } = terms;
  const expiry = warrantyExpiry(draft.warranty_days);
  const dayValue = WARRANTY_DAY_OPTIONS.some((o) => o.value === String(draft.warranty_days))
    ? String(draft.warranty_days)
    : "custom";

  const summary = isPurchase(terms.type)
    ? "Seller declaration"
    : draft.warranty_days > 0
      ? `${draft.warranty_days} day warranty${expiry ? ` · expires ${ukDate(expiry)}` : ""}`
      : "No warranty";

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

      {open && (
        <div className="mt-3 space-y-3 pb-1">
          <Field
            label="Customer message (printed)"
            htmlFor="terms-customer-message"
            hint="Variables: {{customer_name}} {{device_model}} {{warranty_days}} {{warranty_expiry}} {{amount}}"
          >
            <Textarea
              id="terms-customer-message"
              rows={3}
              value={draft.customer_message}
              onChange={(e) => setDraft({ customer_message: e.target.value })}
            />
          </Field>
          <p className="rounded-md border border-admin-border bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground">
            {composeCustomerMessage(
              renderCustomerMessage(draft.customer_message, {
                customer_name: "customer",
                device_model: "your device",
                warranty_days: String(draft.warranty_days),
                warranty_expiry: expiry ? ukDate(expiry) : "",
              }),
              settings,
              draft.warranty_days,
            ) || "No customer message will be printed."}
          </p>

          {!isPurchase(terms.type) && (

            <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-3">
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
                <p className="flex h-9 items-center text-sm font-extrabold">
                  {expiry ? ukDate(expiry) : "—"}
                </p>
              </Field>
              <Field label="Warranty title" htmlFor="terms-title" className="sm:col-span-3">
                <Input
                  id="terms-title"
                  className="h-9"
                  value={draft.warranty_title}
                  onChange={(e) => setDraft({ warranty_title: e.target.value })}
                />
              </Field>
              <Field
                label="Warranty wording"
                htmlFor="terms-warranty-text"
                className="sm:col-span-3"
                hint="Edited here for this invoice only."
              >
                <Textarea
                  id="terms-warranty-text"
                  rows={3}
                  value={draft.warranty_text}
                  onChange={(e) => setDraft({ warranty_text: e.target.value })}
                />
              </Field>
            </div>
          )}

          <Field
            label={isPurchase(terms.type) ? "Seller declaration and terms" : "Terms"}
            htmlFor="terms-text"
          >
            <Textarea
              id="terms-text"
              rows={isPurchase(terms.type) ? 5 : 3}
              value={draft.terms_text}
              onChange={(e) => setDraft({ terms_text: e.target.value })}
            />
          </Field>

          {draft.exclusions_text.trim() && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <Checkbox
                checked={draft.include_exclusions}
                onCheckedChange={(v) => setDraft({ include_exclusions: v === true })}
              />
              Include standard exclusions on the printed document
            </label>
          )}

          <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <Field label="Additional terms for this invoice" htmlFor="terms-additional">
              <Textarea
                id="terms-additional"
                rows={2}
                value={draft.additional_terms}
                onChange={(e) => setDraft({ additional_terms: e.target.value })}
              />
            </Field>
            <Field
              label="Internal note"
              htmlFor="terms-internal"
              hint="Staff only — never printed."
            >
              <Textarea
                id="terms-internal"
                rows={2}
                value={draft.internal_note}
                onChange={(e) => setDraft({ internal_note: e.target.value })}
              />
            </Field>
            <Field label="Customer note" htmlFor="terms-customer" className="sm:col-span-2">
              <Textarea
                id="terms-customer"
                rows={2}
                value={draft.customer_note}
                onChange={(e) => setDraft({ customer_note: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <Checkbox
                  checked={draft.print_customer_note}
                  onCheckedChange={(v) => setDraft({ print_customer_note: v === true })}
                />
                Print the customer note
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <Checkbox
                  checked={draft.customer_acknowledged}
                  onCheckedChange={(v) => setDraft({ customer_acknowledged: v === true })}
                />
                {isPurchase(terms.type)
                  ? "Seller confirmed the declaration"
                  : "Customer acknowledged the terms"}
                {settings?.require_acknowledgement && (
                  <span className="text-xs font-bold text-primary">Required</span>
                )}
              </label>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={terms.reset}>
              <RotateCcw className="mr-2 size-3.5" /> Reset to default
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
