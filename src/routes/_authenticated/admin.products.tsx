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

      return callRpc("save_product", {
        p: {
          id: form?.id ?? null,
          name: form?.name?.trim(),
          sku: form?.sku?.trim() || null,
          category_id: form?.category_id || null,
          brand: form?.brand?.trim() || null,
          model: form?.model?.trim() || null,
          short_description: form?.short_description?.trim() || null,
          cost_price_pence: costPence,
          price_pence: pricePence,
          opening_quantity: openingQty,
          reorder_level: Math.max(0, Number(form?.reorder_level || 0)),
          public_visible: form?.public_visible,
          featured: form?.featured,
        },
      });
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
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-center">Website</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50">
                  <Td>
                    <span className="block font-bold text-foreground">{p.name}</span>
                    {p.brand && (
                      <span className="text-xs text-muted-foreground">
                        {[p.brand, p.model].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">
                    {p.sku || "—"}
                  </Td>
                  <Td className="text-xs">
                    {p.product_categories?.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                        className="h-7 text-xs"
                        onClick={() => {
                          setAdjusting(p);
                          setDelta("");
                          setReason("");
                        }}
                      >
                        Adjust stock
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
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
        title={form?.id ? "Edit product" : "New product"}
        description={
          form?.id
            ? "Update catalogue details, prices, and website visibility."
            : "Add a quantity-based stock item for counter sales and online catalog."
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {/* Live Price Preview */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {pricePence > 0 ? (
                <>
                  <span className="text-muted-foreground">
                    Profit: <strong className="text-foreground">{money(expectedProfit)}</strong>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Margin:{" "}
                    <strong
                      className={cn(
                        Number(marginPct) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                      )}
                    >
                      {marginPct}%
                    </strong>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Enter prices for margin preview</span>
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
              >
                {saveProduct.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {form?.id ? "Save product" : "Save product"}
              </Button>
            </div>
          </div>
        }
      >
        {form && (() => {
          const selectedCat = categories.find((c) => c.id === form.category_id);
          const catNameLower = (selectedCat?.name ?? "").toLowerCase();
          const isPhoneCategory =
            catNameLower.includes("phone") || catNameLower.includes("handset");
          const isTechCategory =
            isPhoneCategory ||
            catNameLower.includes("tablet") ||
            catNameLower.includes("smartwatch") ||
            catNameLower.includes("watch") ||
            catNameLower.includes("audio") ||
            catNameLower.includes("electronic");

          return (
            <div className="space-y-3">
              {/* Primary 2-Column Grid */}
              <FieldGrid cols={2}>
                <Field label="Product name" htmlFor="p-name">
                  <Input
                    id="p-name"
                    className="h-9"
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={
                      isPhoneCategory ? "e.g. iPhone 15 Pro Max 256GB" : "e.g. 20W USB-C Fast Charger"
                    }
                  />
                </Field>

                <Field label="Category" htmlFor="p-cat">
                  <SelectField
                    id="p-cat"
                    value={form.category_id}
                    onChange={(v) => setForm({ ...form, category_id: v })}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select a product category…"
                  />
                </Field>

                {/* Category-Aware Brand & Model (Phones, Electronics, Audio, Tablets) */}
                {isTechCategory && (
                  <>
                    <Field label="Brand (optional)" htmlFor="p-brand">
                      <ComboBox
                        id="p-brand"
                        value={form.brand}
                        onChange={(v) => setForm({ ...form, brand: v })}
                        options={BRANDS}
                      />
                    </Field>
                    <Field label="Model (optional)" htmlFor="p-model">
                      <Input
                        id="p-model"
                        className="h-9"
                        value={form.model}
                        placeholder="e.g. iPhone 15 Pro"
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                <Field label="Cost price" htmlFor="p-cost">
                  <MoneyInput id="p-cost" value={cost} onChange={setCost} placeholder="0.00" />
                </Field>

                <Field label="Selling price" htmlFor="p-price">
                  <MoneyInput id="p-price" value={price} onChange={setPrice} placeholder="0.00" required />
                </Field>

                {!form.id ? (
                  <Field label="Opening quantity" htmlFor="p-open-qty">
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
                ) : null}

                <Field label="SKU / Barcode" htmlFor="p-sku">
                  <Input
                    id="p-sku"
                    className="h-9"
                    value={form.sku}
                    placeholder="e.g. ACC-20W-01 or scan barcode"
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </Field>

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
              </FieldGrid>

              {/* Phone Category Notice */}
              {isPhoneCategory && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-admin-border bg-surface p-2.5 text-xs text-muted-foreground">
                  <div>
                    <strong className="block text-foreground">Phone Catalogue Item:</strong>
                    This form creates a quantity-based catalogue/product listing. Physical IMEI-tracked
                    handsets are purchased and tracked through Buy Phone / Phone Stock.
                  </div>
                  <Link
                    to="/admin/buy-phone"
                    className="shrink-0 font-bold text-primary hover:underline flex items-center gap-1"
                    onClick={() => setForm(null)}
                  >
                    Go to Buy Phone <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}

              {/* Collapsed More Details */}
              <MoreDetails
                cols={2}
                label={`More details (${!isTechCategory ? "brand, model, " : ""}reorder level, description)`}
              >
                {!isTechCategory && (
                  <>
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
                  </>
                )}

                <Field label="Reorder level" htmlFor="p-reorder" hint="Warn when stock drops to or below this.">
                  <Input
                    id="p-reorder"
                    className="h-9"
                    inputMode="numeric"
                    value={form.reorder_level}
                    onChange={(e) =>
                      setForm({ ...form, reorder_level: e.target.value.replace(/[^0-9]/g, "") })
                    }
                  />
                </Field>

                <Field
                  label="Short description"
                  htmlFor="p-desc"
                  className={!isTechCategory ? "sm:col-span-2" : "sm:col-span-2"}
                >
                  <Textarea
                    id="p-desc"
                    rows={2}
                    value={form.short_description}
                    placeholder="Short product overview for the website…"
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
