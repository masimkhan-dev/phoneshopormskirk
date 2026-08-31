import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field, FilterPills, PageHeader, Section, SelectField } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isManager, useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/admin/db";
import { termsSettingsQuery } from "@/lib/admin/queries";
import {
  TERMS_TYPES,
  TERMS_VARIABLES,
  WARRANTY_DAY_OPTIONS,
  composeCustomerMessage,
  renderCustomerMessage,
  type TermsSettings,
  type TermsType,
} from "@/lib/admin/terms";

export const Route = createFileRoute("/_authenticated/admin/invoice-terms")({
  component: InvoiceTerms,
});

function InvoiceTerms() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const canEdit = isManager(session);
  const { data, isLoading } = useQuery(termsSettingsQuery);
  const [tab, setTab] = useState<TermsType>("REPAIR");
  const [form, setForm] = useState<TermsSettings | null>(null);

  useEffect(() => {
    const row = data?.find((r) => r.type === tab);
    if (row) setForm({ ...row });
  }, [data, tab]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Terms not loaded yet.");
      const { type, label, ...rest } = form;
      void label;
      const { error } = await supabase
        .from("invoice_terms_settings")
        .update(rest)
        .eq("type", type);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      toast.success("Terms template saved. New invoices will use this wording.");
      queryClient.invalidateQueries({ queryKey: ["admin", "invoice-terms-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !form) return <Skeleton className="h-96 w-full rounded-lg" />;

  const set = (patch: Partial<TermsSettings>) => setForm({ ...form, ...patch });
  const dayValue = WARRANTY_DAY_OPTIONS.some(
    (o) => o.value === String(form.default_warranty_days),
  )
    ? String(form.default_warranty_days)
    : "custom";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoice terms & warranty"
        description="Default wording for each type of transaction. Saved invoices keep their own copy, so changes here only affect new ones."
        actions={
          <Button onClick={() => save.mutate()} disabled={!canEdit || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save template
          </Button>
        }
      />

      <FilterPills
        options={TERMS_TYPES.map((t) => ({ value: t.type, label: t.label }))}
        value={tab}
        onChange={setTab}
      />

      {!canEdit && (
        <p className="text-sm font-semibold text-primary">
          Only the owner and admins can change these templates.
        </p>
      )}

      <fieldset disabled={!canEdit} className="space-y-4">
        <Section title="Customer message (printed on the invoice)">
          <div className="grid gap-4 p-4">
            <Field
              label="Message"
              htmlFor="customer-message"
              hint={`Warm, plain English. Variables: ${TERMS_VARIABLES.join(" ")}`}
            >
              <Textarea
                id="customer-message"
                rows={4}
                value={form.customer_message}
                onChange={(e) => set({ customer_message: e.target.value })}
              />
            </Field>
            <Field
              label="Short warranty exclusion sentence"
              htmlFor="short-exclusions"
              hint="One friendly sentence — added to the message when a warranty applies."
            >
              <Textarea
                id="short-exclusions"
                rows={2}
                value={form.short_exclusions}
                onChange={(e) => set({ short_exclusions: e.target.value })}
              />
            </Field>
            <Field label="&quot;Terms available on request&quot; line" htmlFor="on-request">
              <Input
                id="on-request"
                className="h-9"
                value={form.terms_on_request_text}
                onChange={(e) => set({ terms_on_request_text: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["show_exclusions", "Show the short warranty exclusions"],
                  ["show_terms_on_request", "Show the “terms available on request” line"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold"
                >
                  <Checkbox
                    checked={form[key]}
                    onCheckedChange={(v) => set({ [key]: v === true } as Partial<TermsSettings>)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="rounded-md border border-admin-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="admin-label mb-1 block">Preview</span>
              {composeCustomerMessage(
                renderCustomerMessage(form.customer_message, {
                  customer_name: "Sarah",
                  device_model: "iPhone 13",
                  warranty_days: String(form.default_warranty_days),
                  warranty_expiry: "12/09/2026",
                  amount: "£149.00",
                }),
                form,
                form.enable_warranty ? form.default_warranty_days : 0,
              ) || "No customer message will be printed."}
            </p>
          </div>
        </Section>

        <Section title="Warranty">

          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2.5 self-end text-sm font-semibold sm:col-span-3">
              <Checkbox
                checked={form.enable_warranty}
                onCheckedChange={(v) => set({ enable_warranty: v === true })}
              />
              Offer a warranty on this type of transaction
            </label>
            <Field label="Default warranty length" htmlFor="days">
              <SelectField
                id="days"
                value={dayValue}
                onChange={(v) => {
                  if (v === "custom") return;
                  set({ default_warranty_days: Number(v) });
                }}
                options={[...WARRANTY_DAY_OPTIONS, { value: "custom", label: "Custom…" }]}
              />
            </Field>
            <Field label="Custom days" htmlFor="custom-days">
              <Input
                id="custom-days"
                className="h-9"
                inputMode="numeric"
                value={String(form.default_warranty_days)}
                onChange={(e) =>
                  set({
                    default_warranty_days: Math.max(
                      0,
                      Math.min(3650, Number(e.target.value.replace(/[^0-9]/g, "") || 0)),
                    ),
                  })
                }
              />
            </Field>
            <Field label="Warranty title" htmlFor="warranty-title">
              <Input
                id="warranty-title"
                className="h-9"
                value={form.warranty_title}
                onChange={(e) => set({ warranty_title: e.target.value })}
              />
            </Field>
            <Field label="Warranty wording" htmlFor="warranty-text" className="sm:col-span-3">
              <Textarea
                id="warranty-text"
                rows={4}
                value={form.warranty_text}
                onChange={(e) => set({ warranty_text: e.target.value })}
              />
            </Field>
            <Field
              label="Exclusions"
              htmlFor="exclusions"
              className="sm:col-span-3"
              hint="One per line. Printed on A4 when included."
            >
              <Textarea
                id="exclusions"
                rows={5}
                value={form.exclusions_text}
                onChange={(e) => set({ exclusions_text: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Internal / detailed terms (not printed as legal text)">
          <div className="grid gap-4 p-4">
            <Field label="Default terms" htmlFor="default-terms">
              <Textarea
                id="default-terms"
                rows={4}
                value={form.default_terms}
                onChange={(e) => set({ default_terms: e.target.value })}
              />
            </Field>
            <Field label="Footer note" htmlFor="footer-note">
              <Textarea
                id="footer-note"
                rows={2}
                value={form.footer_note}
                onChange={(e) => set({ footer_note: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        {form.type === "PURCHASE" && (
          <Section title="Buying from a customer">
            <div className="grid gap-4 p-4">
              <Field label="Seller declaration" htmlFor="seller-declaration">
                <Textarea
                  id="seller-declaration"
                  rows={4}
                  value={form.seller_declaration}
                  onChange={(e) => set({ seller_declaration: e.target.value })}
                />
              </Field>
              <Field label="Payment acknowledgement" htmlFor="payment-ack">
                <Textarea
                  id="payment-ack"
                  rows={2}
                  value={form.payment_ack_text}
                  onChange={(e) => set({ payment_ack_text: e.target.value })}
                />
              </Field>
              <Field label="ID verification note" htmlFor="id-note">
                <Textarea
                  id="id-note"
                  rows={2}
                  value={form.id_verification_note}
                  onChange={(e) => set({ id_verification_note: e.target.value })}
                />
              </Field>
            </div>
          </Section>
        )}

        {form.type === "SALES" && (
          <Section title="Pre-owned device wording">
            <div className="grid gap-4 p-4">
              <Field label="Battery disclaimer" htmlFor="battery">
                <Textarea
                  id="battery"
                  rows={2}
                  value={form.battery_disclaimer}
                  onChange={(e) => set({ battery_disclaimer: e.target.value })}
                />
              </Field>
              <Field label="Return / exchange policy" htmlFor="returns">
                <Textarea
                  id="returns"
                  rows={4}
                  value={form.returns_policy}
                  onChange={(e) => set({ returns_policy: e.target.value })}
                />
              </Field>
            </div>
          </Section>
        )}

        {form.type === "NEW_PHONE" && (
          <Section title="New phone wording">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Manufacturer warranty note" htmlFor="manufacturer">
                <Textarea
                  id="manufacturer"
                  rows={2}
                  value={form.manufacturer_note}
                  onChange={(e) => set({ manufacturer_note: e.target.value })}
                />
              </Field>
              <Field label="Dead-on-arrival days" htmlFor="doa">
                <Input
                  id="doa"
                  className="h-9"
                  inputMode="numeric"
                  value={String(form.doa_days)}
                  onChange={(e) =>
                    set({
                      doa_days: Math.max(
                        0,
                        Math.min(90, Number(e.target.value.replace(/[^0-9]/g, "") || 0)),
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Activation note" htmlFor="activation">
                <Textarea
                  id="activation"
                  rows={2}
                  value={form.activation_note}
                  onChange={(e) => set({ activation_note: e.target.value })}
                />
              </Field>
              <Field label="Accessories note" htmlFor="accessories">
                <Textarea
                  id="accessories"
                  rows={2}
                  value={form.accessories_note}
                  onChange={(e) => set({ accessories_note: e.target.value })}
                />
              </Field>
            </div>
          </Section>
        )}

        <Section title="Where these terms appear">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {(
              [
                ["show_on_a4", "Print on the A4 invoice"],
                ["show_on_thermal", "Print on the 80mm receipt"],
                ["require_acknowledgement", "Staff must tick the acknowledgement box"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold"
              >
                <Checkbox
                  checked={form[key]}
                  onCheckedChange={(v) => set({ [key]: v === true } as Partial<TermsSettings>)}
                />
                {label}
              </label>
            ))}
          </div>
        </Section>
      </fieldset>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={!canEdit || save.isPending}>
          {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save template
        </Button>
      </div>
    </div>
  );
}
