import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TermsWarranty, useTerms } from "@/components/admin/TermsWarranty";

import { CustomerPicker, type CustomerDraft } from "@/components/admin/CustomerPicker";
import {
  ActionBar,
  Field,
  Kbd,
  MoneyInput,
  MoreDetails,
  PageHeader,
  SelectField,
  StepBadge,
  SummaryFigure,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { adminProductsQuery, categoriesQuery, type AdminProduct } from "@/lib/admin/queries";
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

function DirectSale() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("CASH");
  const [basketOpen, setBasketOpen] = useState(false);

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
    const received = Math.max(poundsToPence(paid), 0);
    const amountPaid = Math.min(received, total);
    return {
      subtotal,
      disc,
      total,
      received,
      amountPaid,
      balance: total - amountPaid,
      // Cash change is a preview only; the recorded payment stays capped.
      change: method === "CASH" ? Math.max(received - total, 0) : 0,
      items: lines.reduce((n, l) => n + l.quantity, 0),
    };
  }, [lines, discount, paid, method]);

  // Auto-prefill paid = total whenever the total changes.
  // Staff can manually reduce it for partial payments.
  useEffect(() => {
    if (totals.total >= 0) {
      setPaid(penceToPounds(totals.total));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

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

  const terms = useTerms("SALES");

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const result = await callRpc<{ invoice: { id: string; invoice_number: string } }>(
        "direct_sale",
        {
          p: {
            client_ref: clientRef.current,
            customer,
            items: lines.map((l) => ({
              product_id: l.product_id,
              quantity: l.quantity,
              unit_price_pence: poundsToPence(l.price),
            })),
            discount_pence: totals.disc,
            amount_paid_pence: totals.amountPaid,
            payment_method: method,
            terms: terms.createPayload(),
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
      if (lines.length === 0) {
        toast.error("Add at least one product to the basket.");
        return;
      }
      if (terms.acknowledgementMissing) {
        toast.error("Please tick the customer acknowledgement in Terms & warranty.");
        return;
      }
      save.mutate(print);
    },
    [lines.length, save, terms.acknowledgementMissing],
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

  const basket = (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="admin-label flex items-center gap-2">
          <StepBadge step={2} /> Basket
        </p>
        <span className="text-xs font-bold text-muted-foreground">{totals.items} items</span>
      </div>

      {lines.length ? (
        <ul className="min-h-0 flex-1 divide-y divide-admin-border overflow-y-auto pr-0.5">
          {lines.map((l) => (
            <li key={l.product_id} className="py-2">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{l.name}</span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {l.available} in stock
                  </span>
                </span>
                <span className="w-20 text-right text-sm font-extrabold tabular-nums">
                  {money(poundsToPence(l.price) * l.quantity)}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${l.name}`}
                  title="Remove"
                  className="size-8 shrink-0 text-muted-foreground"
                  onClick={() =>
                    setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Decrease quantity"
                    className="size-8"
                    onClick={() => setQty(l.product_id, -1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-7 text-center text-sm font-extrabold tabular-nums">
                    {l.quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Increase quantity"
                    className="size-8"
                    disabled={l.quantity >= l.available}
                    onClick={() => setQty(l.product_id, 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </span>
                <span className="w-24">
                  <MoneyInput
                    value={l.price}
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
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
          <ShoppingCart className="size-6 text-muted-foreground" />
          <p className="text-sm font-bold">Basket is empty</p>
          <p className="text-xs text-muted-foreground">Tap a product to add it.</p>
        </div>
      )}

      <dl className="shrink-0 space-y-1 rounded-md bg-surface p-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-bold tabular-nums">{money(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="font-bold tabular-nums">−{money(totals.disc)}</dd>
        </div>
        <div className="flex justify-between border-t border-admin-border pt-1">
          <dt className="font-bold">Total</dt>
          <dd className="font-extrabold tabular-nums">{money(totals.total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="font-bold tabular-nums">{money(totals.amountPaid)}</dd>
        </div>
        <div className="flex justify-between">
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

      <div className="shrink-0 space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Amount received" htmlFor="paid">
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
        <MoreDetails cols={1} label="Customer & discount (optional)">
          <Field label="Discount" htmlFor="discount">
            <MoneyInput id="discount" value={discount} onChange={setDiscount} />
          </Field>
          <CustomerPicker value={customer} onChange={setCustomer} label="" optional />
        </MoreDetails>

        <TermsWarranty terms={terms} />
      </div>
    </div>
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
        title="Direct sale"
        description="Accessories and parts across the counter. Stock reduces automatically."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* products */}
        <fieldset className="admin-card flex min-h-0 flex-col p-3">
          <legend className="sr-only">Products</legend>
          <div className="mb-2 flex items-center gap-2">
            <p className="admin-label flex items-center gap-2">
              <StepBadge step={1} /> Products
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="h-9 pl-9 pr-9"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU or brand"
              aria-label="Search products"
            />
            {search && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Clear search"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSearch("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
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

          <div className="mt-2 grid max-h-[calc(100dvh-23rem)] min-h-40 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {isLoading ? (
              [0, 1, 2, 3, 4, 5].map((i) => (
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
                      "admin-tile flex flex-col justify-between gap-1.5 p-2.5 text-left",
                      inBasket && "admin-tile-on",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Package className="size-3.5" />
                      </span>
                      <span className="line-clamp-2 text-xs font-bold leading-snug">
                        {p.name}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <StockBadge quantity={p.quantity} reorder={p.reorder_level} />
                      <span className="text-sm font-extrabold tabular-nums">
                        {money(p.price_pence)}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No products match that search.
              </p>
            )}
          </div>
        </fieldset>

        {/* basket — desktop column */}
        <fieldset className="admin-card hidden max-h-[calc(100dvh-15rem)] flex-col p-3 lg:flex lg:sticky lg:top-32 lg:self-start">
          <legend className="sr-only">Basket</legend>
          {basket}
        </fieldset>
      </div>

      {/* basket — mobile sheet */}
      <Sheet open={basketOpen} onOpenChange={setBasketOpen}>
        <SheetContent side="bottom" className="flex h-[85dvh] flex-col p-4 lg:hidden">
          <SheetTitle className="sr-only">Basket</SheetTitle>
          {basket}
          <Button type="button" className="mt-2 h-11" onClick={() => setBasketOpen(false)}>
            Done
          </Button>
        </SheetContent>
      </Sheet>

      <ActionBar
        summary={
          <>
            <SummaryFigure label="Items" value={String(totals.items)} />
            <SummaryFigure label="Subtotal" value={money(totals.subtotal)} tone="muted" />
            <SummaryFigure label="Discount" value={money(totals.disc)} tone="muted" />
            <SummaryFigure label="Total" value={money(totals.total)} />
            {totals.change > 0 ? (
              <SummaryFigure label="Change due" value={money(totals.change)} tone="good" />
            ) : (
              <SummaryFigure label="Balance" value={money(totals.balance)} tone="primary" />
            )}
          </>
        }
        hint={
          <>
            <span>
              <Kbd>/</Kbd> search
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
        <Button type="submit" disabled={disabled}>
          <Printer className="mr-2 size-4" /> Complete sale &amp; print
        </Button>
      </ActionBar>
    </form>
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
        "rounded-full border px-2.5 py-1 text-xs font-bold transition-colors duration-150",
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
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
        Out of stock
      </span>
    );
  }
  const low = quantity <= Math.max(reorder, 0);
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold",
        low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
      )}
    >
      {quantity} in stock
    </span>
  );
}
