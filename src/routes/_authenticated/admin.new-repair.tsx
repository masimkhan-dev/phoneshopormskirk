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
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<Array<{ id: string; method: string; amount: string }>>([
    { id: "1", method: "CASH", amount: "" },
    { id: "2", method: "CARD", amount: "" },
  ]);

  const totals = useMemo(() => {
    const subtotal = poundsToPence(price);
    const disc = Math.min(poundsToPence(discount), subtotal);
    const total = subtotal - disc;
    const splitSum = splits.reduce(
      (sum, s) => sum + Math.max(poundsToPence(s.amount), 0),
      0,
    );
    const received = isSplit ? splitSum : Math.max(poundsToPence(paid), 0);
    const amountPaid = Math.min(received, total);

    const cashSplitAmt = isSplit
      ? splits
          .filter((s) => s.method === "CASH")
          .reduce((sum, s) => sum + Math.max(poundsToPence(s.amount), 0), 0)
      : form.payment_method === "CASH"
        ? received
        : 0;
    const nonCashSplitAmt = isSplit ? splitSum - cashSplitAmt : 0;
    const effectiveCashNeeded = Math.max(total - nonCashSplitAmt, 0);
    const change =
      cashSplitAmt > effectiveCashNeeded ? cashSplitAmt - effectiveCashNeeded : 0;

    return { subtotal, disc, total, received, amountPaid, balance: total - amountPaid, change };
  }, [price, discount, paid, form.payment_method, isSplit, splits]);

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
        split_payments: isSplit
          ? splits
              .map((s) => ({
                amount_pence: poundsToPence(s.amount),
                method: s.method,
              }))
              .filter((s) => s.amount_pence > 0)
          : undefined,
        amount_paid_pence: !isSplit ? totals.amountPaid : undefined,
        payment_method: !isSplit ? form.payment_method : undefined,
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

  const phoneDigits = (customer?.phone ?? "").replace(/\D/g, "").length;
  const phoneInvalid = phoneDigits > 0 && phoneDigits !== 11;
  const hasValidCustomer = !!customer?.name?.trim() && !phoneInvalid;
  const disabled = save.isPending || !hasValidCustomer || !form.fault.trim() || totals.subtotal < 0;

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      if (!customer?.name?.trim()) {
        toast.error("Please enter the customer's name.");
        return;
      }
      if (phoneInvalid) {
        toast.error("Enter a complete 11-digit UK phone number or leave this field blank.");
        return;
      }
      if (!form.fault.trim()) {
        toast.error("Please complete the required fields.");
        return;
      }
      save.mutate(print);
    },
    [customer?.name, phoneInvalid, form.fault, save],
  );

  useHotkeys(
    useMemo(() => ({ F2: () => submit(true), "mod+Enter": () => submit(false) }), [submit]),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <PageHeader
        compact
        title="New repair"
        description="Customer, device, fault, payment — then print the receipt."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2.5">
          <FormSection title="Customer" cols={1} step={1}>
            <CustomerPicker value={customer} onChange={setCustomer} required />
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
                placeholder="iPhone 15"
              />
            </Field>
            <Field label="IMEI or serial" htmlFor="imei">
              <Input
                id="imei"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                placeholder="15 digits"
              />
            </Field>
            <Field label="Fault description" htmlFor="fault" className="sm:col-span-3">
              <Input
                id="fault"
                value={form.fault}
                onChange={(e) => setForm({ ...form, fault: e.target.value })}
                placeholder="Screen replacement"
                required
              />
            </Field>
          </FormSection>

          <TermsWarranty terms={terms} step={3} />

          <MoreDetails cols={1} label="Extra notes (optional)">
            <Field label="Condition notes">
              <Textarea
                rows={2}
                value={form.device_condition}
                onChange={(e) => setForm({ ...form, device_condition: e.target.value })}
                placeholder="Scratch on back, minor dent…"
              />
            </Field>
          </MoreDetails>
        </div>

        <div className="space-y-2.5 lg:sticky lg:top-20 lg:self-start">
          <FormSection
            title="Price and payment"
            cols={1}
            step={4}
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="Repair price" htmlFor="price">
                <MoneyInput id="price" value={price} onChange={setPrice} required />
              </Field>
              <Field label="Discount" htmlFor="discount">
                <MoneyInput id="discount" value={discount} onChange={setDiscount} />
              </Field>
            </div>
            {!isSplit ? (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Amount paid" htmlFor="paid">
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
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplit(true);
                      const halfPence = Math.floor(totals.total / 2);
                      const remPence = totals.total - halfPence;
                      setSplits([
                        { id: "1", method: "CASH", amount: penceToPounds(halfPence) },
                        { id: "2", method: "CARD", amount: penceToPounds(remPence) },
                      ]);
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + Split payment (Cash + Card)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 rounded-md border border-admin-border bg-surface p-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span>Split payments</span>
                  <button
                    type="button"
                    onClick={() => setIsSplit(false)}
                    className="text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Single payment mode
                  </button>
                </div>
                <div className="space-y-1.5 pt-1">
                  {splits.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-1/2">
                        <SelectField
                          id={`split-method-${s.id}`}
                          value={s.method}
                          onChange={(v) => {
                            setSplits((prev) =>
                              prev.map((item) => (item.id === s.id ? { ...item, method: v } : item)),
                            );
                          }}
                          options={PAYMENT_METHODS}
                        />
                      </div>
                      <div className="w-1/2">
                        <MoneyInput
                          id={`split-amount-${s.id}`}
                          value={s.amount}
                          onChange={(v) => {
                            setSplits((prev) =>
                              prev.map((item) => (item.id === s.id ? { ...item, amount: v } : item)),
                            );
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      {splits.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setSplits(splits.filter((x) => x.id !== s.id))}
                          className="text-xs text-muted-foreground hover:text-destructive px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                  <button
                    type="button"
                    onClick={() =>
                      setSplits([
                        ...splits,
                        { id: crypto.randomUUID(), method: "BANK_TRANSFER", amount: "" },
                      ])
                    }
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + Add method
                  </button>
                  <span className="text-[0.7rem] font-bold text-muted-foreground">
                    Sum: {money(splits.reduce((sum, s) => sum + Math.max(poundsToPence(s.amount), 0), 0))} / {money(totals.total)}
                  </span>
                </div>
              </div>
            )}
            <dl className="rounded-md bg-surface p-2.5 text-xs space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-extrabold tabular-nums">{money(totals.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-extrabold tabular-nums">{money(totals.amountPaid)}</dd>
              </div>
              <div className="flex justify-between border-t border-admin-border pt-1">
                <dt className="text-muted-foreground">Balance</dt>
                <dd className="font-extrabold tabular-nums text-primary">
                  {money(totals.balance)}
                </dd>
              </div>
            </dl>

            <div className="pt-1.5 space-y-2">
              <Button
                type="button"
                className="w-full h-10 text-sm font-extrabold shadow-soft"
                disabled={disabled}
                onClick={() => submit(true)}
              >
                <Printer className="mr-2 size-4" /> Save &amp; print (F2)
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-8 text-xs font-semibold"
                disabled={disabled}
                onClick={() => submit(false)}
              >
                {save.isPending ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-2 size-3.5" />
                )}
                Save (Ctrl+Enter)
              </Button>
            </div>
          </FormSection>
        </div>
      </div>

      <div className="lg:hidden">
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
          <Button type="button" disabled={disabled} onClick={() => submit(true)}>
            <Printer className="mr-2 size-4" /> Save &amp; print
          </Button>
        </ActionBar>
      </div>
    </form>
  );
}
