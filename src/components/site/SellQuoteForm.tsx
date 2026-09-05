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
  "w-full rounded-xl border border-input bg-surface/50 px-4 py-2.5 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15";

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
    <div className="rounded-2xl border border-border/85 bg-card p-6 sm:p-8 shadow-soft">
      <h2 className="display-3 font-extrabold">Get a valuation for your phone</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Send us your device details and we'll provide an estimate. Final valuation is confirmed upon
        inspection in store.
      </p>

      {done ? (
        <div className="mt-6 rounded-xl border border-primary/20 bg-tint p-5 text-sm">
          <p className="font-bold text-foreground">Valuation request received.</p>
          <p className="mt-1 text-muted-foreground">
            We'll be in touch. For a faster reply, message us on WhatsApp.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-4 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-bold text-whatsapp-foreground shadow-soft"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your name
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={`mt-1.5 ${field}`}
                placeholder="Full name"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Phone number
              <input
                required
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={`mt-1.5 ${field}`}
                placeholder="07xxx xxxxxx"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email (optional)
              <input
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={`mt-1.5 ${field}`}
                placeholder="you@example.co.uk"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground sm:col-span-2">
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
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="press inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-lift transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {mutation.isPending ? "Sending…" : "Request a valuation"}
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center justify-center rounded-full bg-whatsapp px-6 py-3 text-sm font-extrabold text-whatsapp-foreground shadow-soft hover:opacity-95"
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
