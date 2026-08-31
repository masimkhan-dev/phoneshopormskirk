import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Printer, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TermsWarranty, useTerms } from "@/components/admin/TermsWarranty";

import { CustomerPicker, type CustomerDraft } from "@/components/admin/CustomerPicker";
import {
  ActionBar,
  ComboBox,
  Field,
  FormSection,
  Kbd,
  MoneyInput,
  MoreDetails,
  PageHeader,
  SelectField,
  SummaryFigure,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import {
  ACCESSORY_OPTIONS,
  BRANDS,
  COMMON_FAULTS,
  CONDITION_OPTIONS,
  modelsFor,
} from "@/lib/admin/options";
import { useHotkeys } from "@/lib/admin/useHotkeys";

export const Route = createFileRoute("/_authenticated/admin/new-repair")({
  component: NewRepair,
});

function NewRepair() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [form, setForm] = useState({
    device_brand: "",
    device_model: "",
    imei: "",
    serial: "",
    fault: "",
    repair_description: "",
    device_condition: "",
    accessories_received: "",
    customer_notes: "",
    internal_notes: "",
    payment_method: "CASH",
  });
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");

  const totals = useMemo(() => {
    const subtotal = poundsToPence(price);
    const disc = Math.min(poundsToPence(discount), subtotal);
    const total = subtotal - disc;
    const amountPaid = Math.min(poundsToPence(paid), total);
    return { subtotal, disc, total, amountPaid, balance: total - amountPaid };
  }, [price, discount, paid]);

  // Auto-prefill paid = total whenever the total changes.
  // Staff can manually reduce it for partial payments.
  useEffect(() => {
    if (totals.total >= 0) {
      setPaid(penceToPounds(totals.total));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const payload = {
        client_ref: clientRef.current,
        customer: customer?.id ? { ...customer, id: customer.id } : customer,
        ...form,
        subtotal_pence: totals.subtotal,
        discount_pence: totals.disc,
        amount_paid_pence: totals.amountPaid,
        terms: terms.createPayload(),
      };
      const result = await callRpc<{
        invoice: { id: string; invoice_number: string };
      }>("create_repair_invoice", { p: payload });
      return { result, print };
    },
    onSuccess: ({ result, print }) => {
      toast.success(`Repair invoice ${result.invoice.invoice_number} saved successfully.`);
      navigate({
        to: "/admin/invoices/$invoiceId",
        params: { invoiceId: result.invoice.id },
        search: print ? { print: "1" } : {},
      });
    },
    onError: (error: Error) => {
      clientRef.current = newClientRef();
      toast.error(error.message);
    },
  });

  const terms = useTerms("REPAIR");

  const disabled = save.isPending || !customer || !form.fault.trim() || totals.subtotal < 0;

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      if (!customer) {
        toast.error("Please add a customer first.");
        return;
      }
      if (!form.fault.trim()) {
        toast.error("Please complete the required fields.");
        return;
      }
      if (terms.acknowledgementMissing) {
        toast.error("Please tick the customer acknowledgement in Terms & warranty.");
        return;
      }
      save.mutate(print);
    },
    [customer, form.fault, save, terms.acknowledgementMissing],
  );

  useHotkeys(
    useMemo(() => ({ F2: () => submit(true), "mod+Enter": () => submit(false) }), [submit]),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
    >
      <PageHeader
        compact
        title="New repair"
        description="Customer, device, fault, payment — then print the receipt."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <FormSection title="Customer" cols={1} step={1}>
            <CustomerPicker value={customer} onChange={setCustomer} label="" />
          </FormSection>

          <FormSection title="Device and fault" cols={3} step={2}>
            <Field label="Brand" htmlFor="brand">
              <ComboBox
                id="brand"
                value={form.device_brand}
                onChange={(device_brand) =>
                  setForm({ ...form, device_brand, device_model: "" })
                }
                options={BRANDS}
                placeholder="Apple"
              />
            </Field>
            <Field label="Model" htmlFor="model">
              <ComboBox
                id="model"
                value={form.device_model}
                onChange={(device_model) => setForm({ ...form, device_model })}
                options={modelsFor(form.device_brand)}
                placeholder="iPhone 13"
              />
            </Field>
            <Field label="Fault / repair" htmlFor="fault">
              <ComboBox
                id="fault"
                value={form.fault}
                onChange={(fault) => setForm({ ...form, fault })}
                options={COMMON_FAULTS}
                placeholder="Screen replacement"
              />
            </Field>
            <Field label="Repair description (optional)" className="xl:col-span-3">
              <Textarea
                rows={2}
                value={form.repair_description}
                onChange={(e) => setForm({ ...form, repair_description: e.target.value })}
              />
            </Field>
          </FormSection>

          <TermsWarranty terms={terms} step={3} />

          <MoreDetails cols={3}>
            <Field label="IMEI" htmlFor="imei">
              <Input
                id="imei"
                className="h-9"
                inputMode="numeric"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
              />
            </Field>
            <Field label="Serial" htmlFor="serial">
              <Input
                id="serial"
                className="h-9"
                value={form.serial}
                onChange={(e) => setForm({ ...form, serial: e.target.value })}
              />
            </Field>
            <Field label="Device condition" htmlFor="condition">
              <SelectField
                id="condition"
                value={form.device_condition}
                onChange={(device_condition) => setForm({ ...form, device_condition })}
                options={CONDITION_OPTIONS}
                allowEmpty
              />
            </Field>
            <Field label="Accessories received" htmlFor="accessories">
              <ComboBox
                id="accessories"
                value={form.accessories_received}
                onChange={(accessories_received) => setForm({ ...form, accessories_received })}
                options={ACCESSORY_OPTIONS}
                placeholder="Case, SIM tray"
              />
            </Field>
            <Field label="Customer notes" className="xl:col-span-1">
              <Textarea
                rows={2}
                value={form.customer_notes}
                onChange={(e) => setForm({ ...form, customer_notes: e.target.value })}
              />
            </Field>
            <Field label="Internal notes">
              <Textarea
                rows={2}
                value={form.internal_notes}
                onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
              />
            </Field>
          </MoreDetails>
        </div>

        <FormSection
          title="Price and payment"
          cols={1}
          step={3}
          className="lg:sticky lg:top-32 lg:self-start"
        >
          <Field label="Repair price" htmlFor="price">
            <MoneyInput id="price" value={price} onChange={setPrice} required />
          </Field>
          <Field label="Discount" htmlFor="discount">
            <MoneyInput id="discount" value={discount} onChange={setDiscount} />
          </Field>
          <Field label="Amount paid now" htmlFor="paid">
            <MoneyInput id="paid" value={paid} onChange={setPaid} />
          </Field>
          <Field label="Payment method" htmlFor="method">
            <SelectField
              id="method"
              value={form.payment_method}
              onChange={(payment_method) => setForm({ ...form, payment_method })}
              options={PAYMENT_METHODS}
            />
          </Field>
          <dl className="rounded-md bg-surface p-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-extrabold tabular-nums">{money(totals.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-extrabold tabular-nums">{money(totals.amountPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="font-extrabold tabular-nums text-primary">
                {money(totals.balance)}
              </dd>
            </div>
          </dl>
        </FormSection>
      </div>

      <ActionBar
        summary={
          <>
            <SummaryFigure label="Total" value={money(totals.total)} />
            <SummaryFigure label="Paid" value={money(totals.amountPaid)} />
            <SummaryFigure label="Balance" value={money(totals.balance)} tone="primary" />
          </>
        }
        hint={
          <>
            <span>
              <Kbd>F2</Kbd> save &amp; print
            </span>
            <span>
              <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save
            </span>
          </>
        }
      >
        <Button type="button" variant="outline" disabled={disabled} onClick={() => submit(false)}>
          {save.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save
        </Button>
        <Button type="submit" disabled={disabled}>
          <Printer className="mr-2 size-4" /> Save &amp; print
        </Button>
      </ActionBar>
    </form>
  );
}
