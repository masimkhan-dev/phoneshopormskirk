import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, Plus, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Field,
  FieldGrid,
  MoneyInput,
  PageHeader,
  Section,
  SelectField,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { categoriesQuery, type AdminProduct } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/products/quick-add")({
  component: QuickAddProductPage,
});

function QuickAddProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery(categoriesQuery);
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [openingQuantity, setOpeningQuantity] = useState("0");
  const [sku, setSku] = useState("");

  const costPence = poundsToPence(cost);
  const pricePence = poundsToPence(price);
  const expectedProfit = pricePence - costPence;
  const marginPct = pricePence > 0 ? ((expectedProfit / pricePence) * 100).toFixed(1) : "0.0";

  const saveMutation = useMutation({
    mutationFn: async (opts: { addAnother?: boolean }) => {
      if (!name.trim()) {
        throw new Error("Please enter a product name.");
      }
      if (!categoryId) {
        throw new Error("Please select a category.");
      }
      if (pricePence <= 0) {
        throw new Error("Please enter a valid selling price greater than £0.00.");
      }

      const openQty = Math.max(0, Number(openingQuantity.replace(/[^0-9]/g, "") || 0));

      const p: Record<string, unknown> = {
        name: name.trim(),
        category_id: categoryId || null,
        sku: sku.trim() || null,
        cost_price_pence: costPence,
        price_pence: pricePence,
        opening_quantity: openQty,
        public_visible: false, // Counter stock: hidden from website by default
        featured: false,
      };

      const saved = await callRpc<AdminProduct>("save_product", { p });
      return { saved, addAnother: opts.addAnother };
    },
    onSuccess: ({ saved, addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });

      if (addAnother) {
        toast.success(`"${saved.name}" added to counter stock. Ready for next item.`);
        setName("");
        setCost("");
        setPrice("");
        setOpeningQuantity("0");
        setSku("");
        nameInputRef.current?.focus();
      } else {
        toast.success(`"${saved.name}" added to counter stock.`);
        navigate({ to: "/admin/products" });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save product.");
    },
  });

  const isPending = saveMutation.isPending;

  function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    saveMutation.mutate({ addAnother });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <PageHeader
        title="Quick Add Product"
        description="Fast stock entry for counter sales & accessories. Products are saved to POS inventory and hidden from website by default."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/admin/products" })}
          >
            <ArrowLeft className="mr-1.5 size-4" /> Back to products
          </Button>
        }
      />

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <Section title="Counter Stock Details">
          <div className="p-4">
            <FieldGrid cols={2}>
              {/* Product Name */}
              <Field label="Product name *" htmlFor="quick-name">
                <Input
                  id="quick-name"
                  ref={nameInputRef}
                  autoFocus
                  required
                  className="h-9 text-sm font-medium"
                  placeholder="e.g. 20W USB-C Charger / iPhone 15 Glass"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              {/* Category */}
              <Field label="Category *" htmlFor="quick-cat">
                <SelectField
                  id="quick-cat"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryOptions}
                  placeholder={
                    categories.length === 0 ? "No categories in database" : "Select a category…"
                  }
                />
              </Field>

              {/* Cost Price */}
              <Field label="Cost price (GBP)" htmlFor="quick-cost" hint="Shop purchase cost">
                <MoneyInput id="quick-cost" value={cost} onChange={setCost} placeholder="0.00" />
              </Field>

              {/* Selling Price */}
              <Field
                label="Selling price (GBP) *"
                htmlFor="quick-price"
                hint="Retail counter price"
              >
                <MoneyInput
                  id="quick-price"
                  value={price}
                  onChange={setPrice}
                  placeholder="0.00"
                  required
                />
              </Field>

              {/* Opening Quantity */}
              <Field
                label="Opening stock quantity"
                htmlFor="quick-qty"
                hint="Current units on shelf"
              >
                <Input
                  id="quick-qty"
                  className="h-9 tabular-nums font-semibold"
                  inputMode="numeric"
                  value={openingQuantity}
                  onChange={(e) => setOpeningQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                />
              </Field>

              {/* SKU / Barcode */}
              <Field
                label="SKU / Barcode (optional)"
                htmlFor="quick-sku"
                hint="Scan barcode or leave blank to auto-generate"
              >
                <Input
                  id="quick-sku"
                  className="h-9 font-mono text-xs"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Scan or type barcode"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // Scanner sends Enter; prevent accidental submit
                    }
                  }}
                />
              </Field>
            </FieldGrid>

            {/* Profit Margin Summary */}
            {pricePence > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-admin-border bg-surface/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground font-medium">
                  Selling at <strong className="text-foreground">{money(pricePence)}</strong>
                </span>
                {costPence > 0 && (
                  <span
                    className={
                      expectedProfit >= 0
                        ? "font-bold text-emerald-600 dark:text-emerald-400"
                        : "font-bold text-destructive"
                    }
                  >
                    Profit: {money(expectedProfit)} ({marginPct}% margin)
                  </span>
                )}
                <span className="rounded bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                  Website: OFF · Counter only
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => navigate({ to: "/admin/products" })}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !name.trim()}
              onClick={(e) => handleSubmit(e, true)}
              className="font-semibold"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-4" />
              )}
              Save & Add Another
            </Button>

            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="font-bold shadow-soft"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-4" />
              )}
              Save Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
