import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CheckTile,
  EmptyState,
  Field,
  FieldGrid,
  FilterPills,
  FormDialog,
  MoneyInput,
  MoreDetails,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  SummaryFigure,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { daysInStock, money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { stockQuery, type StockFilter, type StockItem } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  component: Stock,
});

function Stock() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StockFilter>({
    search: "",
    status: "IN_STOCK",
    brand: "",
    condition: "",
    publicOnly: false,
  });
  const { data = [], isLoading } = useQuery(stockQuery(filter));
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [price, setPrice] = useState("");
  const [visible, setVisible] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [notes, setNotes] = useState("");

  function openEdit(item: StockItem) {
    setEditing(item);
    setPrice(item.selling_price_pence ? penceToPounds(item.selling_price_pence) : "");
    setVisible(item.public_visibility);
    setFeatured(item.featured);
    setNotes(item.notes ?? "");
  }

  const pricePence = poundsToPence(price);

  const save = useMutation({
    mutationFn: async () =>
      callRpc("update_stock_item", {
        p: {
          id: editing?.id,
          selling_price_pence: price ? poundsToPence(price) : null,
          public_visibility: visible,
          featured,
          notes,
        },
      }),
    onSuccess: () => {
      toast.success("Phone updated successfully.");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phone stock"
        description="Every handset is tracked individually with its cost, price and margin."
        actions={
          <Button asChild>
            <Link to="/admin/buy-phone">
              <Plus className="mr-2 size-4" /> Buy phone
            </Link>
          </Button>
        }
      />

      <div className="admin-card space-y-3 p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search IMEI, SKU, brand or model"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <FilterPills
            value={filter.status}
            onChange={(status) => setFilter({ ...filter, status })}
            options={[
              { value: "IN_STOCK", label: "In stock" },
              { value: "RESERVED", label: "Reserved" },
              { value: "SOLD", label: "Sold" },
              { value: "all", label: "All" },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
            <Checkbox
              checked={filter.publicOnly}
              onCheckedChange={(v) => setFilter({ ...filter, publicOnly: v === true })}
            />
            Shown on website only
          </label>
        </div>
      </div>

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Handset</Th>
                <Th>IMEI</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Margin</Th>
                <Th className="text-right">Days</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => {
                const days = daysInStock(s.created_at);
                return (
                  <tr key={s.id} className="hover:bg-surface">
                    <Td className="font-bold">{s.sku}</Td>
                    <Td>
                      {[s.brand, s.model].filter(Boolean).join(" ") || "—"}
                      <span className="block text-xs text-muted-foreground">
                        {[s.storage, s.colour, s.condition?.replace("_", " ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Td>
                    <Td className="text-muted-foreground">{s.imei ?? "—"}</Td>
                    <Td className="text-right">
                      <Money pence={s.purchase_cost_pence} />
                    </Td>
                    <Td className="text-right">
                      {s.selling_price_pence ? <Money pence={s.selling_price_pence} /> : "—"}
                    </Td>
                    <Td className="text-right">
                      {s.selling_price_pence ? (
                        <Money pence={s.selling_price_pence - s.purchase_cost_pence} />
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-right">
                      <span
                        className={
                          s.status === "IN_STOCK" && days > 60
                            ? "font-extrabold text-primary"
                            : ""
                        }
                      >
                        {days}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge
                        tone={
                          s.status === "IN_STOCK"
                            ? "green"
                            : s.status === "RESERVED"
                              ? "amber"
                              : "neutral"
                        }
                      >
                        {s.status.replace("_", " ")}
                      </StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        {s.status !== "SOLD" && (
                          <Button size="sm" asChild>
                            <Link to="/admin/sell-phone">Sell</Link>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No phones match this filter." />
        )}
      </Section>

      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={
          editing
            ? [editing.brand, editing.model].filter(Boolean).join(" ") || "Phone"
            : "Phone"
        }
        description={
          editing
            ? `${editing.sku} · cost ${money(editing.purchase_cost_pence)}${
                editing.imei ? ` · IMEI ${editing.imei}` : ""
              }`
            : undefined
        }
        footer={
          <>
            <span className="mr-auto flex items-center gap-3 text-sm font-bold">
              <SummaryFigure label="Price" value={money(pricePence)} />
              <SummaryFigure
                label="Margin"
                value={money(pricePence - (editing?.purchase_cost_pence ?? 0))}
                tone="primary"
              />
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </>
        }
      >
        <FieldGrid cols={3}>
          <Field label="Selling price" htmlFor="price">
            <MoneyInput id="price" value={price} onChange={setPrice} />
          </Field>
          <CheckTile checked={visible} onChange={setVisible} label="Show on website" />
          <CheckTile checked={featured} onChange={setFeatured} label="Feature on homepage" />
        </FieldGrid>
        <MoreDetails cols={1} label="More details (notes)">
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </MoreDetails>
      </FormDialog>

    </div>
  );
}
