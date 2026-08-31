import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CheckTile,
  ComboBox,
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
  SelectField,
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
import {
  BATTERY_OPTIONS,
  BRANDS,
  COLOUR_OPTIONS,
  CONDITION_OPTIONS,
  NETWORK_OPTIONS,
  STORAGE_OPTIONS,
} from "@/lib/admin/options";
import { stockQuery, type StockFilter, type StockItem } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  component: Stock,
});

const blankNewPhone = {
  brand: "Apple",
  model: "",
  imei: "",
  serial: "",
  storage: "128GB",
  colour: "Midnight",
  network: "Unlocked",
  condition: "GOOD",
  battery_health: "90%",
  cost: "",
  price: "",
  notes: "",
};

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

  // Edit price / visibility
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [price, setPrice] = useState("");
  const [visible, setVisible] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [notes, setNotes] = useState("");

  // Add existing opening phone
  const [newPhoneOpen, setNewPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState({ ...blankNewPhone });

  function openEdit(item: StockItem) {
    setEditing(item);
    setPrice(item.selling_price_pence ? penceToPounds(item.selling_price_pence) : "");
    setVisible(item.public_visibility);
    setFeatured(item.featured);
    setNotes(item.notes ?? "");
  }

  function openAddPhone() {
    setNewPhone({ ...blankNewPhone });
    setNewPhoneOpen(true);
  }

  const pricePence = poundsToPence(price);
  const newPhoneCostPence = poundsToPence(newPhone.cost);
  const newPhonePricePence = poundsToPence(newPhone.price);
  const newPhoneMargin = newPhonePricePence - newPhoneCostPence;

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

  const addExistingPhone = useMutation({
    mutationFn: async () =>
      callRpc("add_existing_phone_stock", {
        p: {
          brand: newPhone.brand,
          model: newPhone.model.trim(),
          imei: newPhone.imei.replace(/[^0-9]/g, ""),
          serial: newPhone.serial.trim() || null,
          storage: newPhone.storage,
          colour: newPhone.colour,
          network: newPhone.network,
          condition: newPhone.condition,
          battery_health: newPhone.battery_health || null,
          purchase_cost_pence: newPhoneCostPence,
          selling_price_pence: newPhonePricePence > 0 ? newPhonePricePence : null,
          notes: newPhone.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Existing handset added to stock successfully.");
      setNewPhoneOpen(false);
      setNewPhone({ ...blankNewPhone });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add phone stock."),
  });

  const handleAddPhoneSubmit = () => {
    if (!newPhone.model.trim()) {
      toast.error("Please enter a device model.");
      return;
    }
    const cleanImei = newPhone.imei.replace(/[^0-9]/g, "");
    if (!cleanImei) {
      toast.error("Please enter a 15-digit IMEI number.");
      return;
    }
    if (cleanImei.length !== 15) {
      toast.error(`IMEI must be exactly 15 digits (currently ${cleanImei.length}).`);
      return;
    }

    addExistingPhone.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phone stock"
        description="Every handset is tracked individually with its cost, price and margin."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openAddPhone}>
              <Plus className="mr-2 size-4" /> Add existing phone
            </Button>
            <Button asChild>
              <Link to="/admin/buy-phone">
                <Plus className="mr-2 size-4" /> Buy phone
              </Link>
            </Button>
          </div>
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

      {/* Edit Phone Price & Visibility */}
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

      {/* Add Existing Phone Dialog (Opening Inventory) */}
      <FormDialog
        open={newPhoneOpen}
        onOpenChange={(o) => !o && setNewPhoneOpen(false)}
        title="Add existing phone"
        description="Record an already-owned handset into phone stock. Does not create a purchase invoice or seller payment."
        footer={
          <>
            <span className="mr-auto flex items-center gap-3 text-sm font-bold">
              {newPhonePricePence > 0 ? (
                <>
                  <SummaryFigure label="Cost" value={money(newPhoneCostPence)} />
                  <SummaryFigure
                    label="Margin"
                    value={money(newPhoneMargin)}
                    tone={newPhoneMargin >= 0 ? "good" : "warn"}
                  />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Enter prices for margin preview</span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => setNewPhoneOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddPhoneSubmit}
              disabled={addExistingPhone.isPending || !newPhone.model.trim()}
            >
              {addExistingPhone.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save to stock
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FieldGrid cols={2}>
            <Field label="Brand" htmlFor="np-brand">
              <ComboBox
                id="np-brand"
                value={newPhone.brand}
                onChange={(v) => setNewPhone({ ...newPhone, brand: v })}
                options={BRANDS}
              />
            </Field>

            <Field label="Model" htmlFor="np-model">
              <Input
                id="np-model"
                className="h-9"
                autoFocus
                value={newPhone.model}
                onChange={(e) => setNewPhone({ ...newPhone, model: e.target.value })}
                placeholder="e.g. iPhone 13 128GB"
              />
            </Field>

            <Field label="IMEI (15 digits)" htmlFor="np-imei" hint="Must be unique to this handset">
              <Input
                id="np-imei"
                className="h-9 font-mono"
                maxLength={15}
                inputMode="numeric"
                value={newPhone.imei}
                onChange={(e) =>
                  setNewPhone({
                    ...newPhone,
                    imei: e.target.value.replace(/[^0-9]/g, "").slice(0, 15),
                  })
                }
                placeholder="354892091234567"
              />
            </Field>

            <Field label="Storage" htmlFor="np-storage">
              <SelectField
                id="np-storage"
                value={newPhone.storage}
                onChange={(v) => setNewPhone({ ...newPhone, storage: v })}
                options={STORAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </Field>

            <Field label="Colour" htmlFor="np-colour">
              <SelectField
                id="np-colour"
                value={newPhone.colour}
                onChange={(v) => setNewPhone({ ...newPhone, colour: v })}
                options={COLOUR_OPTIONS.map((c) => ({ value: c, label: c }))}
              />
            </Field>

            <Field label="Network" htmlFor="np-network">
              <SelectField
                id="np-network"
                value={newPhone.network}
                onChange={(v) => setNewPhone({ ...newPhone, network: v })}
                options={NETWORK_OPTIONS.map((n) => ({ value: n, label: n }))}
              />
            </Field>

            <Field label="Condition" htmlFor="np-cond">
              <SelectField
                id="np-cond"
                value={newPhone.condition}
                onChange={(v) => setNewPhone({ ...newPhone, condition: v })}
                options={CONDITION_OPTIONS}
              />
            </Field>

            <Field label="Battery health (optional)" htmlFor="np-battery">
              <SelectField
                id="np-battery"
                value={newPhone.battery_health}
                onChange={(v) => setNewPhone({ ...newPhone, battery_health: v })}
                options={BATTERY_OPTIONS.map((b) => ({ value: b, label: b }))}
              />
            </Field>

            <Field label="Purchase / Cost price (£)" htmlFor="np-cost">
              <MoneyInput
                id="np-cost"
                value={newPhone.cost}
                onChange={(v) => setNewPhone({ ...newPhone, cost: v })}
                placeholder="0.00"
              />
            </Field>

            <Field label="Selling price (£)" htmlFor="np-price">
              <MoneyInput
                id="np-price"
                value={newPhone.price}
                onChange={(v) => setNewPhone({ ...newPhone, price: v })}
                placeholder="0.00"
              />
            </Field>
          </FieldGrid>

          <MoreDetails cols={1} label="More details (serial number, notes)">
            <Field label="Serial number (optional)" htmlFor="np-serial">
              <Input
                id="np-serial"
                className="h-9 font-mono"
                value={newPhone.serial}
                onChange={(e) => setNewPhone({ ...newPhone, serial: e.target.value })}
                placeholder="e.g. F2LL89…"
              />
            </Field>
            <Field label="Notes" htmlFor="np-notes">
              <Textarea
                id="np-notes"
                rows={2}
                value={newPhone.notes}
                onChange={(e) => setNewPhone({ ...newPhone, notes: e.target.value })}
                placeholder="e.g. Clean handset with original box"
              />
            </Field>
          </MoreDetails>
        </div>
      </FormDialog>
    </div>
  );
}
