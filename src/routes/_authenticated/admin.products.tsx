import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
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
  short_description: "",
  reorder_level: "",
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

  const saveProduct = useMutation({
    mutationFn: async () =>
      callRpc("save_product", {
        p: {
          id: form?.id ?? null,
          name: form?.name,
          sku: form?.sku,
          category_id: form?.category_id,
          brand: form?.brand,
          model: form?.model,
          short_description: form?.short_description,
          cost_price_pence: costPence,
          price_pence: pricePence,
          reorder_level: Number(form?.reorder_level || 0),
          public_visible: form?.public_visible,
          featured: form?.featured,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved successfully.");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
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
    onError: (error: Error) => toast.error(error.message),
  });

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

      <div className="admin-card p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
          />
        </div>
      </div>

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">In stock</Th>
                <Th>Website</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-surface">
                  <Td>
                    <span className="font-bold">{p.name}</span>
                    {p.sku && (
                      <span className="block text-xs text-muted-foreground">{p.sku}</span>
                    )}
                  </Td>
                  <Td className="text-muted-foreground">
                    {p.product_categories?.name ?? "—"}
                  </Td>
                  <Td className="text-right">
                    <Money pence={p.cost_price_pence} />
                  </Td>
                  <Td className="text-right">
                    <Money pence={p.price_pence} />
                  </Td>
                  <Td className="text-right">
                    <span
                      className={
                        p.reorder_level > 0 && p.quantity <= p.reorder_level
                          ? "font-extrabold text-primary"
                          : "font-semibold"
                      }
                    >
                      {p.quantity}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge tone={p.public_visible ? "green" : "neutral"}>
                      {p.public_visible ? "Listed" : "Hidden"}
                    </StatusBadge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAdjusting(p)}>
                        Adjust stock
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No products found." />
        )}
      </Section>

      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title={form?.id ? `Edit ${form.name || "product"}` : "New product"}
        description="Name, price and category are enough — everything else is optional."
        width="xl"
        footer={
          <>
            <span className="mr-auto flex items-center gap-3">
              <SummaryFigure label="Price" value={money(pricePence)} />
              <SummaryFigure
                label="Margin"
                value={money(pricePence - costPence)}
                tone="primary"
              />
            </span>
            <Button variant="outline" size="sm" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveProduct.mutate()}
              disabled={saveProduct.isPending || !form?.name.trim()}
            >
              {saveProduct.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save product
            </Button>
          </>
        }
      >
        {form && (
          <>
            <FieldGrid cols={3}>
              <Field label="Product name" htmlFor="p-name">
                <Input
                  id="p-name"
                  className="h-9"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="20W USB-C fast charger"
                />
              </Field>
              <Field label="Category" htmlFor="p-cat">
                <SelectField
                  id="p-cat"
                  value={form.category_id}
                  onChange={(v) => setForm({ ...form, category_id: v })}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  allowEmpty
                  placeholder="Not set"
                />
              </Field>
              <Field label="Brand" htmlFor="p-brand">
                <ComboBox
                  id="p-brand"
                  value={form.brand}
                  onChange={(v) => setForm({ ...form, brand: v })}
                  options={BRANDS}
                />
              </Field>
              <Field label="Cost price" htmlFor="p-cost">
                <MoneyInput id="p-cost" value={cost} onChange={setCost} />
              </Field>
              <Field label="Selling price" htmlFor="p-price">
                <MoneyInput id="p-price" value={price} onChange={setPrice} required />
              </Field>
              <Field label="SKU" htmlFor="p-sku">
                <Input
                  id="p-sku"
                  className="h-9"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </Field>
              <CheckTile
                checked={form.public_visible}
                onChange={(v) => setForm({ ...form, public_visible: v })}
                label="Show on website"
              />
              <CheckTile
                checked={form.featured}
                onChange={(v) => setForm({ ...form, featured: v })}
                label="Feature on homepage"
              />
            </FieldGrid>
            <MoreDetails cols={3} label="More details (model, reorder level, description)">
              <Field label="Model" htmlFor="p-model">
                <Input
                  id="p-model"
                  className="h-9"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </Field>
              <Field label="Reorder level" htmlFor="p-reorder" hint="Warn when stock drops here.">
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
                className="sm:col-span-2 xl:col-span-1"
              >
                <Textarea
                  id="p-desc"
                  rows={2}
                  value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                />
              </Field>
            </MoreDetails>
          </>
        )}
      </FormDialog>

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
              placeholder="Delivery from supplier"
            />
          </Field>
        </FieldGrid>
      </FormDialog>
    </div>
  );
}
