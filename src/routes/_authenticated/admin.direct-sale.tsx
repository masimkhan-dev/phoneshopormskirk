import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CustomerPicker, type CustomerDraft } from "@/components/admin/CustomerPicker";
import {
  ActionBar,
  Field,
  Kbd,
  MoneyInput,
  SelectField,
  SummaryFigure,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, penceToPounds, poundsToPence, ukDate } from "@/lib/admin/money";
import { adminProductsQuery, categoriesQuery, type AdminProduct } from "@/lib/admin/queries";
import { WARRANTY_DAY_OPTIONS, warrantyExpiry } from "@/lib/admin/terms";
import { useHotkeys } from "@/lib/admin/useHotkeys";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/direct-sale")({
  component: DirectSale,
});

type Line = {
  product_id: string;
  name: string;
  quantity: number;
  price: string;
  available: number;
};

const DEFAULT_DIRECT_SALE_MESSAGE =
  "Dear customer, thank you for your purchase. Please keep this receipt as proof of purchase. Full terms and conditions are available on request at the counter.";

const DEFAULT_DIRECT_SALE_TERMS =
  "All products remain the property of the store until paid for in full. Unopened and unused items in original packaging may be returned with receipt within 14 days. Faulty items are eligible for exchange or repair under applicable warranty.";

function DirectSale() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [discount, setDiscount] = useState("");
  const [isStudent, setIsStudent] = useState(false);
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("CASH");
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<Array<{ id: string; method: string; amount: string }>>([
    { id: "1", method: "CASH", amount: "" },
    { id: "2", method: "CARD", amount: "" },
  ]);
  const [basketOpen, setBasketOpen] = useState(false);

  // Warranty configuration
  const [showWarranty, setShowWarranty] = useState(false);
  const [warrantyDays, setWarrantyDays] = useState(0);

  // Terms & Message customization
  const [showTermsEditor, setShowTermsEditor] = useState(false);
  const [customerMessage, setCustomerMessage] = useState(DEFAULT_DIRECT_SALE_MESSAGE);
  const [termsText, setTermsText] = useState(DEFAULT_DIRECT_SALE_TERMS);

  const { data: products = [], isLoading } = useQuery(adminProductsQuery(search));
  const { data: categories = [] } = useQuery(categoriesQuery);

  const visible = useMemo(
    () => (categoryId ? products.filter((p) => p.category_id === categoryId) : products),
    [products, categoryId],
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + poundsToPence(l.price) * l.quantity, 0);
    const disc = Math.min(Math.max(poundsToPence(discount), 0), subtotal);
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
      items: lines.reduce((n, l) => n + l.quantity, 0),
    };
  }, [lines, discount, paid, method, isSplit, splits]);

  // Auto-apply 10% student discount if student radio is selected
  useEffect(() => {
    if (isStudent) {
      const subtotal = lines.reduce((sum, l) => sum + poundsToPence(l.price) * l.quantity, 0);
      const studentDiscPence = Math.round(subtotal * 0.10);
      setDiscount(studentDiscPence > 0 ? penceToPounds(studentDiscPence) : "");
    }
  }, [lines, isStudent]);

  // Auto-prefill paid = total whenever the total changes.
  useEffect(() => {
    if (totals.total >= 0) {
      setPaid(penceToPounds(totals.total));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  // Auto-focus search input on initial page mount only
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const addProduct = useCallback((p: AdminProduct) => {
    if (p.quantity <= 0) return;
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === p.id);
      if (found) {
        if (found.quantity >= p.quantity) {
          toast.error(`Only ${p.quantity} of ${p.name} in stock.`);
          return prev;
        }
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          quantity: 1,
          price: penceToPounds(p.price_pence ?? 0),
          available: p.quantity,
        },
      ];
    });
  }, []);

  // Handle barcode / SKU scanner Enter key in search box
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = search.trim().toLowerCase();
      if (!q) return;

      const match =
        visible.find(
          (p) =>
            p.sku?.toLowerCase() === q ||
            p.name.toLowerCase() === q,
        ) || visible[0];

      if (match) {
        if (match.quantity <= 0) {
          toast.error(`${match.name} is out of stock.`);
        } else {
          addProduct(match);
          setSearch("");
          toast.success(`Added ${match.name}`);
        }
      } else {
        toast.error(`No product found for "${search}".`);
      }
    }
  };

  function setQty(id: string, delta: number) {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.product_id !== id) return [l];
        const next = l.quantity + delta;
        if (next <= 0) return [];
        if (next > l.available) {
          toast.error(`Only ${l.available} in stock.`);
          return [l];
        }
        return [{ ...l, quantity: next }];
      }),
    );
  }

  const effectiveWarrantyDays = showWarranty ? warrantyDays : 0;
  const expiry = effectiveWarrantyDays > 0 ? warrantyExpiry(effectiveWarrantyDays) : null;
  const dayValue = WARRANTY_DAY_OPTIONS.some((o) => o.value === String(effectiveWarrantyDays))
    ? String(effectiveWarrantyDays)
    : "custom";

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const termsPayload = {
        invoice_type: "PRODUCT_SALE",
        warranty_days: effectiveWarrantyDays,
        warranty_expires: expiry,
        warranty_title: effectiveWarrantyDays > 0 ? "Product Warranty" : "",
        warranty_text:
          effectiveWarrantyDays > 0
            ? "Standard warranty covers manufacturing defects on accessories and electronics."
            : "",
        customer_message: customerMessage.trim() || DEFAULT_DIRECT_SALE_MESSAGE,
        terms_text: termsText.trim() || DEFAULT_DIRECT_SALE_TERMS,
        exclusions_text: "",
        footer_note: "",
        additional_terms: "",
        customer_note: "",
        print_customer_note: false,
        customer_acknowledged: true,
        show_on_thermal: true,
        show_on_a4: true,
        show_signature_line: false,
      };

      const result = await callRpc<{ invoice: { id: string; invoice_number: string } }>(
        "direct_sale",
        {
          p: {
            client_ref: clientRef.current,
            customer: customer?.name?.trim() || customer?.phone?.trim() ? customer : undefined,
            items: lines.map((l) => ({
              product_id: l.product_id,
              quantity: l.quantity,
              unit_price_pence: poundsToPence(l.price),
            })),
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
            terms: termsPayload,
          },
        },
      );
      return { result, print };
    },
    onSuccess: ({ result, print }) => {
      toast.success(`Sale ${result.invoice.invoice_number} completed successfully.`);
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

  const disabled = save.isPending || lines.length === 0 || totals.total < 0;

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      const phoneDigits = (customer?.phone ?? "").replace(/\D/g, "");
      if (phoneDigits.length > 0 && phoneDigits.length !== 11) {
        toast.error("Enter a complete 11-digit UK phone number or leave this field blank.");
        return;
      }
      if (lines.length === 0) {
        toast.error("Add at least one product to the basket.");
        return;
      }
      save.mutate(print);
    },
    [customer?.phone, lines.length, save],
  );

  useHotkeys(
    useMemo(
      () => ({
        "/": () => searchRef.current?.focus(),
        Escape: () => {
          if (basketOpen) setBasketOpen(false);
          else if (search) setSearch("");
        },
        F2: () => submit(true),
        "mod+Enter": () => submit(false),
      }),
      [basketOpen, search, submit],
    ),
  );

  const checkoutPanel = (
    <div className="flex h-full flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hidden">
      {/* Zone A: Scrollable Basket */}
      <div className="flex min-h-[90px] flex-1 flex-col overflow-hidden rounded-md border border-admin-border bg-card">
        {/* 44px Basket Header */}
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-admin-border px-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <ShoppingCart className="size-3.5 text-primary" /> Basket
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              · {totals.items} {totals.items === 1 ? "item" : "items"}
            </span>
          </div>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => setLines([])}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
          )}
        </div>

        {lines.length ? (
          <ul className="min-h-0 flex-1 divide-y divide-admin-border overflow-y-auto px-2.5 py-1 scrollbar-hidden">
            {lines.map((l) => (
              <li key={l.product_id} className="py-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{l.name}</span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {l.available} in stock
                    </span>
                  </span>
                  <span className="w-16 text-right text-xs font-extrabold tabular-nums">
                    {money(poundsToPence(l.price) * l.quantity)}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${l.name}`}
                    title="Remove"
                    className="size-5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))
                    }
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Decrease quantity"
                      className="size-5 h-5 w-5"
                      onClick={() => setQty(l.product_id, -1)}
                    >
                      <Minus className="size-2.5" />
                    </Button>
                    <span className="w-5 text-center text-xs font-extrabold tabular-nums">
                      {l.quantity}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Increase quantity"
                      className="size-5 h-5 w-5"
                      disabled={l.quantity >= l.available}
                      onClick={() => setQty(l.product_id, 1)}
                    >
                      <Plus className="size-2.5" />
                    </Button>
                  </span>
                  <span className="w-20">
                    <MoneyInput
                      value={l.price}
                      className="h-6 text-xs"
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.product_id === l.product_id ? { ...x, price: v } : x,
                          ),
                        )
                      }
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 text-center text-muted-foreground">
            <ShoppingCart className="size-5 opacity-40 text-muted-foreground" />
            <p className="text-xs font-bold text-foreground">Basket is empty</p>
            <p className="text-[0.7rem] text-muted-foreground">
              Scan or select a product to begin.
            </p>
          </div>
        )}
      </div>

      {/* Zone B: Compact Checkout Details */}
      <div className="shrink-0 space-y-2 rounded-md border border-admin-border bg-card p-2.5">
        {/* Customer Fields (Direct 2-column) */}
        <div>
          <CustomerPicker value={customer} onChange={setCustomer} label="" optional />
        </div>

        {/* Discount & Payment 3-Column Grid */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="font-semibold text-muted-foreground">Discount</span>
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                <input
                  type="radio"
                  name="ds-discount-type"
                  checked={!isStudent}
                  onChange={() => {
                    setIsStudent(false);
                    setDiscount("");
                  }}
                  className="accent-primary size-3.5"
                />
                <span>Standard</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-foreground hover:text-primary">
                <input
                  type="radio"
                  name="ds-discount-type"
                  checked={isStudent}
                  onChange={() => setIsStudent(true)}
                  className="accent-primary size-3.5"
                />
                <span className="inline-flex items-center gap-1 text-primary">
                  🎓 Student 10%
                </span>
              </label>
            </div>
          </div>

          {!isSplit ? (
            <div>
              <div className="grid grid-cols-3 gap-2">
                <Field label={isStudent ? "Discount (10%)" : "Discount (£)"} htmlFor="discount">
                  <MoneyInput
                    id="discount"
                    value={discount}
                    onChange={(v) => {
                      setDiscount(v);
                      if (isStudent) setIsStudent(false);
                    }}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Amount paid" htmlFor="paid">
                  <MoneyInput id="paid" value={paid} onChange={setPaid} />
                </Field>
                <Field label="Method" htmlFor="method">
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
        </div>

        {/* Action Toggles Toolbar: Warranty & Receipt message */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-admin-border/50">
          {!showWarranty ? (
            <button
              type="button"
              onClick={() => {
                setShowWarranty(true);
                setWarrantyDays(30);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>+ Add warranty</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowWarranty(false);
                setWarrantyDays(0);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-destructive"
            >
              <span>✓ Warranty ({effectiveWarrantyDays}d) · ✕ Remove</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTermsEditor((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            <span>Receipt message {showTermsEditor ? "(Hide)" : "(Edit)"}</span>
          </button>
        </div>

        {/* Warranty Configuration Panel */}
        {showWarranty && (
          <div className="rounded-md border border-admin-border bg-surface p-2 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">
                Warranty: {effectiveWarrantyDays} days
                {expiry ? ` · until ${ukDate(expiry)}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowWarranty(false);
                  setWarrantyDays(0);
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                ✕ Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                id="ds-warranty"
                value={dayValue}
                onChange={(v) => {
                  if (v === "custom") {
                    setWarrantyDays(warrantyDays || 30);
                  } else {
                    setWarrantyDays(Number(v));
                  }
                }}
                options={[...WARRANTY_DAY_OPTIONS, { value: "custom", label: "Custom…" }]}
              />
              {dayValue === "custom" ? (
                <Input
                  id="ds-custom-days"
                  className="h-9 text-xs"
                  inputMode="numeric"
                  placeholder="Days"
                  value={String(warrantyDays)}
                  onChange={(e) =>
                    setWarrantyDays(
                      Math.max(
                        0,
                        Math.min(3650, Number(e.target.value.replace(/[^0-9]/g, "") || 0)),
                      ),
                    )
                  }
                />
              ) : (
                <div className="flex items-center text-[0.72rem] text-muted-foreground px-1">
                  Covers manufacturer defects
                </div>
              )}
            </div>
          </div>
        )}

        {/* Optional Receipt Message Editor */}
        {showTermsEditor && (
          <div className="rounded-md border border-admin-border bg-surface p-2 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">Receipt message</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerMessage(DEFAULT_DIRECT_SALE_MESSAGE)}
                  className="text-[0.7rem] font-semibold text-primary hover:underline"
                >
                  Reset default
                </button>
                <button
                  type="button"
                  onClick={() => setShowTermsEditor(false)}
                  className="text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              </div>
            </div>
            <Textarea
              id="ds-message"
              rows={2}
              className="text-xs"
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder={DEFAULT_DIRECT_SALE_MESSAGE}
            />
          </div>
        )}
      </div>

      {/* Zone C: Permanent Sticky Totals & Action Buttons */}
      <div className="shrink-0 space-y-2 rounded-md border border-admin-border bg-surface p-2.5 shadow-sm">
        <dl className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-bold tabular-nums">{money(totals.subtotal)}</dd>
          </div>
          {totals.disc > 0 && (
            <div className="flex justify-between text-emerald-600">
              <dt>Discount</dt>
              <dd className="font-bold tabular-nums">−{money(totals.disc)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-admin-border pt-1">
            <dt className="text-sm font-black tracking-tight text-foreground">TOTAL</dt>
            <dd className="text-lg font-black text-foreground tabular-nums">
              {money(totals.total)}
            </dd>
          </div>
          <div className="flex justify-between text-[0.75rem]">
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="font-bold tabular-nums">{money(totals.amountPaid)}</dd>
          </div>
          <div className="flex justify-between text-[0.75rem]">
            <dt className="text-muted-foreground">
              {totals.change > 0 ? "Change due" : "Balance"}
            </dt>
            <dd
              className={cn(
                "font-extrabold tabular-nums",
                totals.change > 0 ? "text-emerald-600" : "text-primary",
              )}
            >
              {money(totals.change > 0 ? totals.change : totals.balance)}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5 pt-1">
          <Button
            type="button"
            className="w-full h-10 text-sm font-extrabold shadow-soft"
            disabled={disabled}
            onClick={() => submit(true)}
          >
            <Printer className="mr-2 size-4" /> Complete sale &amp; print (F2)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-8 text-xs font-semibold"
            disabled={disabled}
            onClick={() => submit(false)}
          >
            {save.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            Save (Ctrl+Enter)
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-5rem)] lg:overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-black tracking-tight flex items-center gap-2">
            Direct sale
            <span className="text-xs font-semibold text-muted-foreground font-normal">
              (POS counter till)
            </span>
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground font-semibold">
          <span>
            <Kbd>/</Kbd> search / scan
          </span>
          <span>
            <Kbd>F2</Kbd> complete &amp; print
          </span>
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save
          </span>
        </div>
      </div>

      {/* Main Viewport-Locked Split Workspace */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* Left Pane: Product Catalog */}
        <div className="admin-card flex min-h-0 flex-1 flex-col overflow-hidden p-2.5">
          {/* Fixed Search Bar & Category Chips */}
          <div className="shrink-0 space-y-2 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                className="h-9 pl-9 pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode or search name / SKU (press /)"
                aria-label="Scan or search products"
              />
              {search && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-0.5 scrollbar-hidden">
              <CategoryPill
                label="All"
                active={categoryId === null}
                onClick={() => setCategoryId(null)}
              />
              {categories.map((c) => (
                <CategoryPill
                  key={c.id}
                  label={c.name}
                  active={categoryId === c.id}
                  onClick={() => setCategoryId(c.id)}
                />
              ))}
            </div>
          </div>

          {/* High-Density Scrollable Product Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
              {isLoading ? (
                [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
                ))
              ) : visible.length ? (
                visible.map((p) => {
                  const out = p.quantity <= 0;
                  const inBasket = lines.some((l) => l.product_id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => addProduct(p)}
                      className={cn(
                        "admin-tile flex flex-col justify-between gap-1 p-2 text-left transition-all rounded-md border",
                        out
                          ? "opacity-40 cursor-not-allowed bg-muted/40"
                          : inBasket
                            ? "admin-tile-on ring-1 ring-primary/40"
                            : "hover:border-primary/50",
                      )}
                    >
                      <span className="flex items-start gap-1.5">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Package className="size-3" />
                        </span>
                        <span className="line-clamp-2 text-[0.75rem] font-bold leading-tight">
                          {p.name}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-1.5 pt-1">
                        <StockBadge quantity={p.quantity} reorder={p.reorder_level} />
                        <span className="text-xs font-extrabold tabular-nums">
                          {money(p.price_pence)}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No products match that search.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Checkout & Cart (Desktop Viewport Locked) */}
        <div className="hidden lg:flex min-h-0 flex-col overflow-y-auto scrollbar-hidden">
          {checkoutPanel}
        </div>
      </div>

      {/* Mobile Drawer / Bottom Bar for Mobile & Tablet */}
      <Sheet open={basketOpen} onOpenChange={setBasketOpen}>
        <SheetContent side="bottom" className="flex h-[88dvh] flex-col overflow-y-auto p-3 lg:hidden scrollbar-hidden">
          <SheetTitle className="sr-only">Checkout</SheetTitle>
          {checkoutPanel}
          <Button type="button" className="mt-2 h-9" onClick={() => setBasketOpen(false)}>
            Close
          </Button>
        </SheetContent>
      </Sheet>

      <div className="lg:hidden mt-2">
        <ActionBar
          summary={
            <>
              <SummaryFigure label="Items" value={String(totals.items)} />
              <SummaryFigure label="Total" value={money(totals.total)} />
              {totals.change > 0 ? (
                <SummaryFigure label="Change" value={money(totals.change)} tone="good" />
              ) : (
                <SummaryFigure label="Balance" value={money(totals.balance)} tone="primary" />
              )}
            </>
          }
        >
          <Button
            type="button"
            variant="outline"
            className="lg:hidden"
            onClick={() => setBasketOpen(true)}
          >
            <ShoppingCart className="mr-2 size-4" /> Basket ({totals.items})
          </Button>
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
            <Printer className="mr-2 size-4" /> Complete sale &amp; print
          </Button>
        </ActionBar>
      </div>
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-bold transition-colors duration-150",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-admin-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function StockBadge({ quantity, reorder }: { quantity: number; reorder: number }) {
  if (quantity <= 0) {
    return (
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-bold text-muted-foreground">
        Out
      </span>
    );
  }
  const low = quantity <= Math.max(reorder, 0);
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold",
        low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
      )}
    >
      {quantity} in stock
    </span>
  );
}
