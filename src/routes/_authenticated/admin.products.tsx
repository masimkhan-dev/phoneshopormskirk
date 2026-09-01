import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, Package, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CheckTile,
  ComboBox,
  EmptyState,
  Field,
  FieldGrid,
  FormDialog,
  Money,
  MoneyInput,
  MoreDetails,
  PageHeader,
  Section,
  SelectField,
  StatusBadge,
  SummaryFigure,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { BRANDS } from "@/lib/admin/options";
import {
  adminProductsQuery,
  categoriesQuery,
  type AdminProduct,
} from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: Products,
});

const blank = {
  id: undefined as string | undefined,
  name: "",
  sku: "",
  category_id: "",
  brand: "",
  model: "",
  opening_quantity: "0",
  short_description: "",
  reorder_level: "0",
  public_visible: false,
  featured: false,
};

function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery(adminProductsQuery(search));
  const { data: categories = [] } = useQuery(categoriesQuery);

  const [form, setForm] = useState<typeof blank | null>(null);
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");

  const [adjusting, setAdjusting] = useState<AdminProduct | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  function openNew() {
    setForm({ ...blank });
    setCost("");
    setPrice("");
  }

  function openEdit(p: AdminProduct) {
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      category_id: p.category_id ?? "",
      brand: p.brand ?? "",
      model: p.model ?? "",
      opening_quantity: String(p.quantity ?? 0),
      short_description: p.short_description ?? "",
      reorder_level: String(p.reorder_level ?? 0),
      public_visible: p.public_visible,
      featured: p.featured,
    });
    setCost(penceToPounds(p.cost_price_pence));
    setPrice(penceToPounds(p.price_pence));
  }

  const costPence = poundsToPence(cost);
  const pricePence = poundsToPence(price);
  const expectedProfit = pricePence - costPence;
  const marginPct = pricePence > 0 ? ((expectedProfit / pricePence) * 100).toFixed(1) : "0.0";

  const saveProduct = useMutation({
    mutationFn: async () => {
      const isNew = !form?.id;
      const openingQty = isNew
        ? Math.max(0, Number(form?.opening_quantity?.replace(/[^0-9]/g, "") || 0))
        : undefined;

      const p: Record<string, unknown> = {
        name: form?.name?.trim(),
        sku: form?.sku?.trim() || null,
        category_id: form?.category_id || null,
        brand: form?.brand?.trim() || null,
        model: form?.model?.trim() || null,
        short_description: form?.short_description?.trim() || null,
        cost_price_pence: costPence,
        price_pence: pricePence,
        reorder_level: Math.max(0, Number(form?.reorder_level || 0)),
        public_visible: Boolean(form?.public_visible),
        featured: Boolean(form?.featured),
      };

      if (isNew) {
        p["opening_quantity"] = openingQty;
      } else {
        p["id"] = form.id;
      }

      return callRpc("save_product", { p });
    },
    onSuccess: (_, __, ___) => {
      const isNew = !form?.id;
      toast.success(isNew ? "Product added successfully." : "Product saved successfully.");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save product."),
  });

  const adjust = useMutation({
    mutationFn: async () =>
      callRpc("adjust_product_stock", {
        p: {
          product_id: adjusting?.id,
          quantity_change: Number(delta),
          reason: reason || "Stock count adjustment",
        },
      }),
    onSuccess: () => {
      toast.success("Stock adjusted successfully.");
      setAdjusting(null);
      setDelta("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to adjust stock."),
  });

  const handleFormSubmit = () => {
    if (!form?.name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    if (!form?.category_id) {
      toast.error("Select a product category.");
      return;
    }
    if (pricePence <= 0) {
      toast.error("Please enter a valid selling price.");
      return;
    }

    // Opening quantity validation for new product
    if (!form?.id) {
      const parsedQty = Number(form.opening_quantity);
      if (isNaN(parsedQty) || parsedQty < 0) {
        toast.error("Opening quantity cannot be negative.");
        return;
      }
    }

    // Check duplicate SKU if SKU entered
    if (form?.sku?.trim()) {
      const normalizedSku = form.sku.trim().toLowerCase();
      const existingDuplicate = data.find(
        (p) => p.id !== form.id && p.sku && p.sku.trim().toLowerCase() === normalizedSku,
      );
      if (existingDuplicate) {
        toast.error(`An item with this SKU already exists ("${existingDuplicate.name}").`);
        return;
      }
    }

    saveProduct.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products and accessories"
        description="Quantities update automatically on every sale. Adjust here after a stock count or delivery."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 size-4" /> New product
          </Button>
        }
      />

      <Section>
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {data.length} {data.length === 1 ? "product" : "products"}
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block">
              <TableShell minWidth="min-w-[56rem]" stickyHeader>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th className="w-32">Category</Th>
                    <Th className="w-28 font-mono">SKU</Th>
                    <Th className="w-24 text-right">Cost</Th>
                    <Th className="w-24 text-right">Selling Price</Th>
                    <Th className="w-20 text-right">Qty</Th>
                    <Th className="w-24 text-center">Website</Th>
                    <Th className="w-36 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/60 transition-colors">
                      <Td>
                        <span className="font-bold text-foreground block">{p.name}</span>
                        {p.brand && (
                          <span className="text-[0.7rem] text-muted-foreground block">
                            {[p.brand, p.model].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </Td>
                      <Td className="text-muted-foreground">
                        {p.product_categories?.name || <span className="text-muted-foreground">—</span>}
                      </Td>
                      <Td className="font-mono text-[0.75rem] text-foreground/80">
                        {p.sku || "—"}
                      </Td>
                      <Td className="text-right">
                        <Money pence={p.cost_price_pence} />
                      </Td>
                      <Td className="text-right font-bold">
                        <Money pence={p.price_pence} />
                      </Td>
                      <Td className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-extrabold tabular-nums",
                            p.quantity <= 0
                              ? "text-destructive"
                              : p.quantity <= p.reorder_level
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground",
                          )}
                        >
                          {p.quantity}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <StatusBadge tone={p.public_visible ? (p.featured ? "green" : "neutral") : "red"}>
                          {p.public_visible ? (p.featured ? "Featured" : "Visible") : "Hidden"}
                        </StatusBadge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setAdjusting(p);
                              setDelta("");
                              setReason("");
                            }}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>

            {/* Mobile Stacked List (< md) */}
            <div className="divide-y divide-admin-border md:hidden">
              {data.map((p) => (
                <div key={p.id} className="p-3 space-y-1.5 hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-foreground text-xs truncate">{p.name}</span>
                    <StatusBadge tone={p.public_visible ? (p.featured ? "green" : "neutral") : "red"}>
                      {p.public_visible ? (p.featured ? "Featured" : "Visible") : "Hidden"}
                    </StatusBadge>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground font-medium truncate">
                      {p.product_categories?.name || p.brand || "Accessory"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold tabular-nums"><Money pence={p.price_pence} /></span>
                      <span className="text-[0.7rem] font-bold text-muted-foreground">Qty: {p.quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-mono text-[0.7rem] text-muted-foreground">
                      {p.sku ? `SKU: ${p.sku}` : "No SKU"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[0.7rem]"
                        onClick={() => {
                          setAdjusting(p);
                          setDelta("");
                          setReason("");
                        }}
                      >
                        Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[0.7rem]"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No products found"
            description="Add your first retail product or accessory to start selling at the counter."
            action={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-2 size-4" /> Add product
              </Button>
            }
          />
        )}
      </Section>

      {/* New / Edit Product Dialog */}
      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title={form?.id ? "Edit product" : "Add product"}
        description={
          form?.id
            ? "Update stock details, prices, or website publishing."
            : "Quickly add a retail accessory or product to counter stock."
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {/* Live Profit & Margin Preview */}
            <div className="text-xs font-semibold">
              {pricePence > 0 && costPence > 0 ? (
                <span className="text-muted-foreground">
                  Margin:{" "}
                  <strong
                    className={cn(
                      expectedProfit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {money(expectedProfit)}
                  </strong>{" "}
                  · {marginPct}%
                </span>
              ) : pricePence > 0 ? (
                <span className="text-muted-foreground">Selling at {money(pricePence)}</span>
              ) : (
                <span className="text-muted-foreground/60">Enter price for margin preview</span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFormSubmit}
                disabled={saveProduct.isPending || !form?.name.trim()}
                className="font-bold shadow-soft"
              >
                {saveProduct.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {form?.id ? "Save product" : "Add product"}
              </Button>
            </div>
          </div>
        }
      >
        {form && (() => {
          const accessoryCategories = categories.filter((c) => {
            const name = c.name.toLowerCase();
            return !name.includes("phone") && !name.includes("handset");
          });

          return (
            <div
              className="space-y-3"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleFormSubmit();
                }
              }}
            >
              {/* PRIMARY 6 FIELDS IN 2-COLUMN DESKTOP GRID */}
              <FieldGrid cols={2}>
                {/* Row 1: Product Name | Category */}
                <Field label="Product name" htmlFor="p-name">
                  <Input
                    id="p-name"
                    className="h-9"
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. 20W USB-C Fast Charger"
                  />
                </Field>

                <Field label="Category" htmlFor="p-cat">
                  <SelectField
                    id="p-cat"
                    value={form.category_id}
                    onChange={(v) => setForm({ ...form, category_id: v })}
                    options={accessoryCategories.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select a category…"
                  />
                </Field>

                {/* Row 2: Cost Price | Selling Price */}
                <Field label="Cost price" htmlFor="p-cost">
                  <MoneyInput id="p-cost" value={cost} onChange={setCost} placeholder="0.00" />
                </Field>

                <Field label="Selling price" htmlFor="p-price">
                  <MoneyInput id="p-price" value={price} onChange={setPrice} placeholder="0.00" required />
                </Field>

                {/* Row 3: Opening Quantity | SKU / Barcode */}
                {!form.id ? (
                  <Field label="Opening quantity" htmlFor="p-open-qty" hint="Current stock on hand">
                    <Input
                      id="p-open-qty"
                      className="h-9 tabular-nums"
                      inputMode="numeric"
                      value={form.opening_quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          opening_quantity: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      placeholder="0"
                    />
                  </Field>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground px-1">
                    <span>Stock managed via Adjust stock</span>
                  </div>
                )}

                <Field label="SKU / Barcode (optional)" htmlFor="p-sku">
                  <Input
                    id="p-sku"
                    className="h-9 font-mono text-xs"
                    value={form.sku}
                    placeholder="Scan or type barcode"
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault(); // Scanner sends Enter; prevent accidental submit
                      }
                    }}
                  />
                </Field>
              </FieldGrid>

              {/* WEBSITE PUBLISHING TOGGLES (OPTIONAL & OFF BY DEFAULT) */}
              <div className="rounded-md border border-admin-border/80 bg-surface/40 p-2.5 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <CheckTile
                    checked={form.public_visible}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        public_visible: v,
                        // If website is turned off, automatically disable homepage feature
                        featured: v ? form.featured : false,
                      })
                    }
                    label="Show on website"
                  />

                  <CheckTile
                    checked={form.featured}
                    disabled={!form.public_visible}
                    onChange={(v) => setForm({ ...form, featured: v })}
                    label="Feature on homepage"
                  />
                </div>
                {!form.public_visible && (
                  <p className="text-[0.7rem] text-muted-foreground px-1">
                    Website publishing is OFF. Product will immediately be available in POS / Direct Sale.
                  </p>
                )}
              </div>

              {/* COLLAPSED MORE DETAILS */}
              <MoreDetails cols={2} label="+ More details">
                <Field label="Brand (optional)" htmlFor="p-brand-opt">
                  <ComboBox
                    id="p-brand-opt"
                    value={form.brand}
                    onChange={(v) => setForm({ ...form, brand: v })}
                    options={BRANDS}
                  />
                </Field>

                <Field label="Model (optional)" htmlFor="p-model-opt">
                  <Input
                    id="p-model-opt"
                    className="h-9"
                    value={form.model}
                    placeholder="e.g. Universal / MagSafe"
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </Field>

                <Field
                  label="Reorder level (optional)"
                  htmlFor="p-reorder"
                  hint="Low-stock alert threshold."
                >
                  <Input
                    id="p-reorder"
                    className="h-9 tabular-nums"
                    inputMode="numeric"
                    value={form.reorder_level}
                    onChange={(e) =>
                      setForm({ ...form, reorder_level: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="0"
                  />
                </Field>

                <Field
                  label="Short description (optional)"
                  htmlFor="p-desc"
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="p-desc"
                    rows={2}
                    value={form.short_description}
                    placeholder="Brief description for online store or receipts…"
                    onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  />
                </Field>
              </MoreDetails>
            </div>
          );
        })()}
      </FormDialog>

      {/* Stock Adjustment Dialog */}
      <FormDialog
        open={!!adjusting}
        onOpenChange={(o) => !o && setAdjusting(null)}
        title={`Adjust stock — ${adjusting?.name ?? ""}`}
        description={`Currently ${adjusting?.quantity ?? 0} in stock. Use -2 to remove two.`}
        footer={
          <>
            <span className="mr-auto">
              <SummaryFigure
                label="New total"
                value={String((adjusting?.quantity ?? 0) + (Number(delta) || 0))}
                tone="primary"
              />
            </span>
            <Button variant="outline" size="sm" onClick={() => setAdjusting(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => adjust.mutate()}
              disabled={adjust.isPending || !delta || Number(delta) === 0}
            >
              {adjust.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save adjustment
            </Button>
          </>
        }
      >
        <FieldGrid cols={2}>
          <Field label="Change" htmlFor="delta">
            <Input
              id="delta"
              className="h-9"
              inputMode="numeric"
              autoFocus
              value={delta}
              onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="10"
            />
          </Field>
          <Field label="Reason" htmlFor="reason">
            <Input
              id="reason"
              className="h-9"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Delivery, Stock count"
            />
          </Field>
        </FieldGrid>
      </FormDialog>
    </div>
  );
}
