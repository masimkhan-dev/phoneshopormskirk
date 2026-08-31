import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { submitEnquiry } from "@/lib/site.functions";
import { businessQuery } from "@/lib/queries";
import { whatsappUrl, type WhatsAppContext } from "@/lib/whatsapp";
import type { EnquiryType } from "@/lib/types";

type Props = {
  type: EnquiryType;
  title: string;
  description?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  whatsappContext?: WhatsAppContext;
};

export function EnquiryForm({
  type,
  title,
  description,
  messageLabel = "Details",
  messagePlaceholder,
  whatsappContext = { kind: "general" },
}: Props) {
  const { data: business } = useQuery(businessQuery());
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitEnquiry({
        data: {
          type,
          name: form.name,
          phone: form.phone,
          email: form.email,
          message: form.message,
          website: form.website,
        },
      }),
    onSuccess: () => {
      setDone(true);
      setForm({ name: "", phone: "", email: "", message: "", website: "" });
      toast.success("Thanks — we'll get back to you shortly.");
    },
    onError: () => toast.error("Sorry, that didn't send. Please call or WhatsApp us instead."),
  });

  const field =
    "w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft md:p-8">
      <h2 className="display-3 font-extrabold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}

      {done ? (
        <div className="mt-6 rounded-md bg-tint p-5 text-sm">
          <p className="font-bold text-foreground">Enquiry received.</p>
          <p className="mt-1 text-muted-foreground">
            We'll be in touch soon. For a faster reply, message us on WhatsApp.
          </p>
          <a
            href={whatsappUrl(business, whatsappContext)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-md bg-whatsapp px-4 py-2.5 text-sm font-bold text-whatsapp-foreground"
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
                className={`mt-1.5 font-normal ${field}`}
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
                className={`mt-1.5 font-normal ${field}`}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Email (optional)
            <input
              type="email"
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={`mt-1.5 font-normal ${field}`}
            />
          </label>
          <label className="block text-sm font-semibold">
            {messageLabel}
            <textarea
              rows={4}
              maxLength={2000}
              placeholder={messagePlaceholder}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className={`mt-1.5 font-normal ${field}`}
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
              className="inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? "Sending…" : "Send enquiry"}
            </button>
            <a
              href={whatsappUrl(business, whatsappContext)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
            >
              Or WhatsApp us
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            We only use your details to reply to this enquiry.
          </p>
        </form>
      )}
    </div>
  );
}
