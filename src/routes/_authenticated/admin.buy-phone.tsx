import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Printer, Save } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, poundsToPence } from "@/lib/admin/money";
import {
  ACCESSORY_OPTIONS,
  BATTERY_OPTIONS,
  BRANDS,
  COLOUR_OPTIONS,
  CONDITION_OPTIONS,
  NETWORK_OPTIONS,
  STORAGE_OPTIONS,
  modelsFor,
} from "@/lib/admin/options";
import { useHotkeys } from "@/lib/admin/useHotkeys";

export const Route = createFileRoute("/_authenticated/admin/buy-phone")({
  component: BuyPhone,
});

const CHECKS = [
  ["id_seen", "Photo ID seen"],
  ["icloud_removed", "iCloud / Google removed"],
  ["factory_reset", "Factory reset done"],
  ["screen_ok", "Screen and touch"],
  ["cameras_ok", "Cameras"],
  ["buttons_ok", "Buttons and speakers"],
  ["charging_ok", "Charging port"],
  ["network_ok", "SIM / network"],
] as const;

function BuyPhone() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    imei: "",
    serial: "",
    storage: "",
    colour: "",
    network: "",
    condition: "GOOD",
    battery_health: "",
    faults: "",
    accessories: "",
    notes: "",
    payment_method: "CASH",
  });
  const [cost, setCost] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const terms = useTerms("PURCHASE");

  const costPence = poundsToPence(cost);
  const askingPence = askingPrice ? poundsToPence(askingPrice) : 0;
  const expectedProfit = askingPence ? askingPence - costPence : 0;

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const result = await callRpc<{ invoice: { id: string; invoice_number: string } }>(
        "buy_phone",
        {
          p: {
            client_ref: clientRef.current,
            customer,
            ...form,
            purchase_price_pence: costPence,
            selling_price_pence: askingPrice ? poundsToPence(askingPrice) : null,
            device_checks: checks,
            terms: terms.createPayload(),
          },
        },
      );
      return { result, print };
    },
    onSuccess: ({ result, print }) => {
      toast.success(`Purchase ${result.invoice.invoice_number} saved and added to stock.`);
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

  const disabled = save.isPending || !customer || !form.model.trim() || costPence <= 0;
  const marginPct = askingPence > 0 ? (expectedProfit / askingPence) * 100 : 0;

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      if (disabled) {
        toast.error("Please complete the seller, model and price.");
        return;
      }
      if (terms.acknowledgementMissing) {
        toast.error("Please confirm the seller declaration in Terms & warranty.");
        return;
      }
      save.mutate(print);
    },
    [disabled, save, terms.acknowledgementMissing],
  );

  useHotkeys(
    useMemo(
      () => ({ F2: () => submit(true), "mod+Enter": () => submit(false) }),
      [submit],
    ),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
    >

      <PageHeader compact title="Buy a phone" description="Seller, handset, checks, payout." />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2">
          <FormSection title="Seller" cols={1} step={1}>
            <CustomerPicker value={customer} onChange={setCustomer} label="" />
          </FormSection>

          <FormSection title="Handset" cols={3} step={2}>
            <Field label="Brand" htmlFor="brand">
              <ComboBox
                id="brand"
                value={form.brand}
                onChange={(brand) => setForm({ ...form, brand, model: "" })}
                options={BRANDS}
                placeholder="Apple"
              />
            </Field>
            <Field label="Model" htmlFor="model">
              <ComboBox
                id="model"
                value={form.model}
                onChange={(model) => setForm({ ...form, model })}
                options={modelsFor(form.brand)}
                placeholder="iPhone 12 Pro"
              />
            </Field>
            <Field label="IMEI" htmlFor="imei">
              <Input
                id="imei"
                className="h-9"
                inputMode="numeric"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
              />
            </Field>
            <Field label="Storage" htmlFor="storage">
              <SelectField
                id="storage"
                value={form.storage}
                onChange={(storage) => setForm({ ...form, storage })}
                options={STORAGE_OPTIONS}
                allowEmpty
              />
            </Field>
            <Field label="Condition" htmlFor="condition">
              <SelectField
                id="condition"
                value={form.condition}
                onChange={(condition) => setForm({ ...form, condition })}
                options={CONDITION_OPTIONS}
              />
            </Field>
            <Field label="Battery" htmlFor="battery">
              <SelectField
                id="battery"
                value={form.battery_health}
                onChange={(battery_health) => setForm({ ...form, battery_health })}
                options={BATTERY_OPTIONS}
                allowEmpty
              />
            </Field>
          </FormSection>

          <FormSection title="Device checks" cols={1} step={3}>
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
              {CHECKS.map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-admin-border px-2.5 py-2 text-xs font-semibold"
                >
                  <Checkbox
                    checked={!!checks[key]}
                    onCheckedChange={(v) => setChecks({ ...checks, [key]: v === true })}
                  />
                  <span className="leading-tight">{label}</span>
                </label>
              ))}
            </div>
          </FormSection>

          <TermsWarranty terms={terms} step={4} />

          <MoreDetails cols={3}>
            <Field label="Colour" htmlFor="colour">
              <SelectField
                id="colour"
                value={form.colour}
                onChange={(colour) => setForm({ ...form, colour })}
                options={COLOUR_OPTIONS}
                allowEmpty
              />
            </Field>
            <Field label="Network" htmlFor="network">
              <SelectField
                id="network"
                value={form.network}
                onChange={(network) => setForm({ ...form, network })}
                options={NETWORK_OPTIONS}
                allowEmpty
              />
            </Field>
            <Field label="Serial" htmlFor="serial">
              <Input
                id="serial"
                className="h-9"
                value={form.serial}
                onChange={(e) => setForm({ ...form, serial: e.target.value })}
              />
            </Field>
            <Field label="Faults" htmlFor="faults">
              <Input
                id="faults"
                className="h-9"
                value={form.faults}
                onChange={(e) => setForm({ ...form, faults: e.target.value })}
              />
            </Field>
            <Field label="Accessories" htmlFor="accessories">
              <ComboBox
                id="accessories"
                value={form.accessories}
                onChange={(accessories) => setForm({ ...form, accessories })}
                options={ACCESSORY_OPTIONS}
                placeholder="Box, cable"
              />
            </Field>
            <Field label="Notes" className="xl:col-span-3">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </MoreDetails>
        </div>

        <FormSection title="Money" cols={1} step={4} className="lg:sticky lg:top-32 lg:self-start">
          <Field label="Price paid to seller" htmlFor="cost">
            <MoneyInput id="cost" value={cost} onChange={setCost} required />
          </Field>
          <Field label="Intended selling price" htmlFor="asking">
            <MoneyInput id="asking" value={askingPrice} onChange={setAskingPrice} />
          </Field>
          <Field label="Paid by" htmlFor="method">
            <SelectField
              id="method"
              value={form.payment_method}
              onChange={(payment_method) => setForm({ ...form, payment_method })}
              options={PAYMENT_METHODS}
            />
          </Field>
        </FormSection>
      </div>

      <ActionBar
        summary={
          <>
            <SummaryFigure label="Buying" value={money(costPence)} />
            <SummaryFigure
              label="Intended selling"
              value={askingPence ? money(askingPence) : "—"}
              tone="muted"
            />
            <SummaryFigure
              label="Expected gross profit"
              value={askingPence ? money(expectedProfit) : "—"}
              tone={
                !askingPence ? "muted" : expectedProfit > 0 ? "good" : "primary"
              }
            />
            <SummaryFigure
              label="Margin"
              value={askingPence ? `${marginPct.toFixed(1)}%` : "—"}
              tone={
                !askingPence
                  ? "muted"
                  : marginPct >= 15
                    ? "good"
                    : marginPct > 0
                      ? "warn"
                      : "primary"
              }
            />
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
            <span>Preview only — server totals are authoritative.</span>
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
        <Button type="submit" disabled={disabled}>
          <Printer className="mr-2 size-4" /> Save &amp; print
        </Button>
      </ActionBar>
    </form>
  );
}
