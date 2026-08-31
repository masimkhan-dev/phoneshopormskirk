import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field, PageHeader, Section } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { businessSettingsQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Settings,
});

type Form = {
  id?: string;
  business_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address_line1: string;
  city: string;
  postcode: string;
  warranty_policy: string;
  offer_banner_text: string;
  offer_banner_url: string;
  offer_banner_active: boolean;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(businessSettingsQuery);
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      id: str(data['id']),
      business_name: str(data['business_name']),
      tagline: str(data['tagline']),
      phone: str(data['phone']),
      whatsapp: str(data['whatsapp']),
      email: str(data['email']),
      address_line1: str(data['address_line1']),
      city: str(data['city']),
      postcode: str(data['postcode']),
      warranty_policy: str(data['warranty_policy']),
      offer_banner_text: str(data['offer_banner_text']),
      offer_banner_url: str(data['offer_banner_url']),
      offer_banner_active: data['offer_banner_active'] === true,
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form?.id) throw new Error("Settings not loaded yet.");
      const { id, ...rest } = form;
      const { error } = await supabase.from("business_settings").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Shop details saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "business-settings"] });
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !form) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shop details"
        description="These details appear on the public website and on every printed invoice."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
        }
      />

      <Section title="Contact and address">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="business_name">
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp number" htmlFor="whatsapp">
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Street address" htmlFor="address_line1">
            <Input
              id="address_line1"
              value={form.address_line1}
              onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
            />
          </Field>
          <Field label="Town" htmlFor="city">
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Postcode" htmlFor="postcode">
            <Input
              id="postcode"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Warranty wording">
        <div className="p-4">
          <Field
            label="Repair guarantee shown to customers"
            htmlFor="warranty_policy"
            hint="Printed on invoices and shown on the website."
          >
            <Textarea
              id="warranty_policy"
              rows={3}
              value={form.warranty_policy}
              onChange={(e) => setForm({ ...form, warranty_policy: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Website offer banner">
        <div className="space-y-4 p-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <Checkbox
              checked={form.offer_banner_active}
              onCheckedChange={(v) => setForm({ ...form, offer_banner_active: v === true })}
            />
            Show the banner on the public website
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Banner text" htmlFor="offer_banner_text">
              <Input
                id="offer_banner_text"
                value={form.offer_banner_text}
                onChange={(e) => setForm({ ...form, offer_banner_text: e.target.value })}
              />
            </Field>
            <Field label="Banner link" htmlFor="offer_banner_url">
              <Input
                id="offer_banner_url"
                value={form.offer_banner_url}
                onChange={(e) => setForm({ ...form, offer_banner_url: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
