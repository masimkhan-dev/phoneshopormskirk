import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Printer, Save, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TermsWarranty, useTerms } from "@/components/admin/TermsWarranty";

import { CustomerPicker, type CustomerDraft } from "@/components/admin/CustomerPicker";
import {
  ActionBar,
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
import { availableStockQuery, type StockItem } from "@/lib/admin/queries";
import { useHotkeys } from "@/lib/admin/useHotkeys";

export const Route = createFileRoute("/_authenticated/admin/sell-phone")({
  component: SellPhone,
});

function SellPhone() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [item, setItem] = useState<StockItem | null>(null);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("CASH");
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<Array<{ id: string; method: string; amount: string }>>([
    { id: "1", method: "CASH", amount: "" },
    { id: "2", method: "CARD", amount: "" },
  ]);
  const [notes, setNotes] = useState("");

  const { data: results = [], isFetching } = useQuery({
    ...availableStockQuery(search),
    enabled: !item,
  });

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
      : method === "CASH"
        ? received
        : 0;
    const nonCashSplitAmt = isSplit ? splitSum - cashSplitAmt : 0;
    const effectiveCashNeeded = Math.max(total - nonCashSplitAmt, 0);
    const change =
      cashSplitAmt > effectiveCashNeeded ? cashSplitAmt - effectiveCashNeeded : 0;

    return {
      subtotal,
      disc,
      total,
      received,
      amountPaid,
      balance: total - amountPaid,
      change,
    };
  }, [price, discount, paid, method, isSplit, splits]);

  // Auto-prefill paid = total whenever the total changes.
  // Staff can manually reduce it for partial payments.
  useEffect(() => {
    if (totals.total >= 0) {
      setPaid(penceToPounds(totals.total));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  const margin = item ? totals.total - item.purchase_cost_pence : 0;

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const result = await callRpc<{ invoice: { id: string; invoice_number: string } }>(
        "sell_phone",
        {
          p: {
            client_ref: clientRef.current,
            stock_item_id: item?.id,
            customer: customer?.name?.trim() || customer?.phone?.trim() ? customer : undefined,
            selling_price_pence: totals.subtotal,
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
            payment_method: !isSplit ? method : undefined,
            notes,
            terms: terms.createPayload(),
          },
        },
      );
      return { result, print };
    },
    onSuccess: ({ result, print }) => {
      toast.success(`Sale ${result.invoice.invoice_number} saved successfully.`);
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

  const terms = useTerms(
    (item?.condition ?? "").toUpperCase().includes("NEW") ? "NEW_PHONE" : "SALES",
  );

  const disabled = save.isPending || !item || totals.subtotal <= 0;

  function pick(stock: StockItem) {
    setItem(stock);
    setSearch("");
    if (stock.selling_price_pence) setPrice(penceToPounds(stock.selling_price_pence));
  }

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      const phoneDigits = (customer?.phone ?? "").replace(/\D/g, "");
      if (phoneDigits.length > 0 && phoneDigits.length !== 11) {
        toast.error("Enter a complete 11-digit UK phone number or leave this field blank.");
        return;
      }
      if (disabled) {
        toast.error("Please choose a phone and enter a price.");
        return;
      }
      save.mutate(print);
    },
    [customer?.phone, disabled, save],
  );

  useHotkeys(
    useMemo(
      () => ({
        "/": () => searchRef.current?.focus(),
        F2: () => submit(true),
        "mod+Enter": () => submit(false),
      }),
      [submit],
    ),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <PageHeader compact title="Sell a phone" description="Handset from stock, price, buyer." />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2.5">
          <FormSection title="Handset from stock" cols={1} step={1}>
            {item ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-admin-border bg-surface px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {[item.brand, item.model, item.storage, item.colour].filter(Boolean).join(" ")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    IMEI: {item.imei}
                    {item.condition ? ` · ${item.condition}` : ""}
                    {item.battery_health ? ` · ${item.battery_health}` : ""} · Cost:{" "}
                    {money(item.purchase_cost_pence)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setItem(null);
                    setPrice("");
                  }}
                  aria-label="Change phone"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    className="h-9 pl-9"
                    placeholder="Search available stock by model, brand or IMEI (/)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 divide-y divide-admin-border overflow-y-auto rounded-md border border-admin-border scrollbar-hidden">
                  {results.length ? (
                    results.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface"
                        onClick={() => pick(s)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {[s.brand, s.model, s.storage, s.colour].filter(Boolean).join(" ")}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            IMEI: {s.imei}
                            {s.condition ? ` · ${s.condition}` : ""}
                            {s.battery_health ? ` · ${s.battery_health}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums">
                          {money(s.selling_price_pence ?? s.purchase_cost_pence)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {isFetching
                        ? "Searching stock…"
                        : search
                          ? "No phones match that search."
                          : "No phones available in stock."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Buyer (optional)" cols={1} step={2}>
            <CustomerPicker value={customer} onChange={setCustomer} label="" optional />
          </FormSection>

          <TermsWarranty terms={terms} step={3} />

          <MoreDetails cols={1} label="Notes and extra details">
            <Field label="Notes">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </MoreDetails>
        </div>

        <div className="space-y-2.5 lg:sticky lg:top-20 lg:self-start">
          <FormSection
            title="Price and payment"
            cols={1}
            step={3}
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="Selling price" htmlFor="price">
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
                      value={method}
                      onChange={setMethod}
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
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {totals.change > 0 ? "Change due" : "Balance"}
                </dt>
                <dd
                  className={
                    totals.change > 0
                      ? "font-extrabold tabular-nums text-emerald-600"
                      : "font-extrabold tabular-nums text-primary"
                  }
                >
                  {money(totals.change > 0 ? totals.change : totals.balance)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-admin-border pt-1">
                <dt className="text-muted-foreground">Gross profit</dt>
                <dd className="font-extrabold tabular-nums">{item ? money(margin) : "—"}</dd>
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
              <SummaryFigure label="Subtotal" value={money(totals.subtotal)} tone="muted" />
              <SummaryFigure label="Discount" value={money(totals.disc)} tone="muted" />
              <SummaryFigure label="Total" value={money(totals.total)} />
              <SummaryFigure label="Paid" value={money(totals.amountPaid)} />
              {totals.change > 0 ? (
                <SummaryFigure label="Change due" value={money(totals.change)} tone="good" />
              ) : (
                <SummaryFigure label="Balance" value={money(totals.balance)} tone="primary" />
              )}
              <SummaryFigure
                label="Gross profit"
                value={item ? money(margin) : "—"}
                tone={!item ? "muted" : margin > 0 ? "good" : "primary"}
              />
            </>
          }
          hint={
            <>
              <span>
                <Kbd>/</Kbd> search stock
              </span>
              <span>
                <Kbd>F2</Kbd> save &amp; print
              </span>
              <span>
                <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save
              </span>
            </>
          }
        >
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => submit(false)}
          >
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
