import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { submitEnquiry } from "@/lib/site.functions";
import { businessQuery } from "@/lib/queries";
import { whatsappUrl } from "@/lib/whatsapp";

const CONDITIONS = [
  "Like new",
  "Good — light marks",
  "Fair — visible wear",
  "Cracked screen",
  "Not powering on",
];

const STORAGES = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "Not sure"];

const NETWORKS = ["Unlocked", "EE", "O2", "Vodafone", "Three", "Other / not sure"];

const field =
  "w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary";

/** Sell / trade-in valuation lead form with the details needed to price a handset. */
export function SellQuoteForm() {
  const { data: business } = useQuery(businessQuery());
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    device: "",
    storage: "",
    condition: "",
    network: "",
    notes: "",
    website: "",
  });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitEnquiry({
        data: {
          type: "SELL_PHONE",
          name: form.name,
          phone: form.phone,
          email: form.email,
          message: [
            `Device: ${form.device}`,
            `Storage: ${form.storage || "Not given"}`,
            `Condition: ${form.condition || "Not given"}`,
            `Network: ${form.network || "Not given"}`,
            form.notes ? `Notes: ${form.notes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          metadata: {
            device: form.device,
            storage: form.storage,
            condition: form.condition,
            network: form.network,
          },
          website: form.website,
        },
      }),
    onSuccess: () => {
      setDone(true);
      toast.success("Thanks — we'll come back to you with an estimate.");
    },
    onError: () => toast.error("Sorry, that didn't send. Please call or WhatsApp us instead."),
  });

  const waHref = whatsappUrl(business, {
    kind: "sell",
    device: form.device,
    storage: form.storage,
    condition: form.condition,
    network: form.network,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft md:p-8">
      <h2 className="display-3 font-extrabold">Get a valuation for your phone</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Send us the details and we'll come back with an estimate. Estimates are subject to us
        checking the handset in store.
      </p>

      {done ? (
        <div className="mt-6 rounded-md bg-tint p-5 text-sm">
          <p className="font-bold text-foreground">Valuation request received.</p>
          <p className="mt-1 text-muted-foreground">
            We'll be in touch. For a faster reply, message us on WhatsApp.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-4 inline-flex rounded-md bg-whatsapp px-4 py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            Open WhatsApp
          </a>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Your name
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={`mt-1.5 ${field}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Phone number
              <input
                required
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={`mt-1.5 ${field}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Email (optional)
              <input
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={`mt-1.5 ${field}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Make and model
              <input
                required
                maxLength={120}
                placeholder="e.g. iPhone 12 Pro"
                value={form.device}
                onChange={(e) => setForm((f) => ({ ...f, device: e.target.value }))}
                className={`mt-1.5 ${field}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Storage
              <select
                value={form.storage}
                onChange={(e) => setForm((f) => ({ ...f, storage: e.target.value }))}
                className={`mt-1.5 ${field}`}
              >
                <option value="">Select storage</option>
                {STORAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Condition
              <select
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                className={`mt-1.5 ${field}`}
              >
                <option value="">Select condition</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Network
              <select
                value={form.network}
                onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
                className={`mt-1.5 ${field}`}
              >
                <option value="">Select network</option>
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Anything else we should know? (optional)
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Battery health, accessories included, any faults"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={`mt-1.5 ${field}`}
            />
          </label>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="hidden"
          />
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="press inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-60"
            >
              {mutation.isPending ? "Sending…" : "Request a valuation"}
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex rounded-md bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
            >
              Send it on WhatsApp
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            We only use your details to reply about this valuation.
          </p>
        </form>
      )}
    </div>
  );
}
