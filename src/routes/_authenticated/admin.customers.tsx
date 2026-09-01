import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  PageHeader,
  Section,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { ukDate } from "@/lib/admin/money";
import { customersQuery, type Customer } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: Customers,
});

const blank = {
  id: undefined as string | undefined,
  name: "",
  phone: "",
  email: "",
  address: "",
  postcode: "",
  notes: "",
};

function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery(customersQuery(search));
  const [form, setForm] = useState<typeof blank | null>(null);

  const save = useMutation({
    mutationFn: async () =>
      callRpc("save_customer", {
        p: {
          id: form?.id ?? null,
          name: form?.name,
          phone: form?.phone,
          email: form?.email || null,
          address: form?.address || null,
          postcode: form?.postcode || null,
          notes: form?.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Customer saved successfully.");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function edit(c: Customer) {
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? "",
      address: c.address ?? "",
      postcode: c.postcode ?? "",
      notes: c.notes ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="Search by name, phone or email. Phone numbers match however they are typed."
        actions={
          <Button onClick={() => setForm({ ...blank })}>
            <Plus className="mr-2 size-4" /> New customer
          </Button>
        }
      />

      {/* Compact Filter Toolbar */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone number, email…"
          />
        </div>
        <span className="text-xs text-muted-foreground font-semibold">
          {data.length} {data.length === 1 ? "customer" : "customers"}
        </span>
      </div>

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block">
              <TableShell minWidth="min-w-[50rem]" stickyHeader>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th className="w-36">Phone</Th>
                    <Th className="w-48">Email</Th>
                    <Th className="w-28">Postcode</Th>
                    <Th className="w-28">Added</Th>
                    <Th className="w-20 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                      <Td className="font-bold text-foreground">{c.name}</Td>
                      <Td>
                        <a href={`tel:${c.phone}`} className="font-medium text-primary hover:underline">
                          {c.phone}
                        </a>
                      </Td>
                      <Td className="text-muted-foreground">{c.email ?? "—"}</Td>
                      <Td className="text-muted-foreground uppercase">{c.postcode ?? "—"}</Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{ukDate(c.created_at)}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => edit(c)}>
                          Edit
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>

            {/* Mobile Stacked List (< md) */}
            <div className="divide-y divide-admin-border md:hidden">
              {data.map((c) => (
                <div key={c.id} className="p-3 space-y-1 hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-foreground text-xs">{c.name}</span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[0.7rem]" onClick={() => edit(c)}>
                      Edit
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <a href={`tel:${c.phone}`} className="font-semibold text-primary">
                      {c.phone}
                    </a>
                    {c.postcode && <span className="text-muted-foreground uppercase text-[0.72rem]">{c.postcode}</span>}
                  </div>
                  {c.email && <p className="text-[0.72rem] text-muted-foreground truncate">{c.email}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No customers yet."
            description="Customers are added automatically at the counter, or add one here."
          />
        )}
      </Section>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit customer" : "New customer"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" htmlFor="name">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Postcode" htmlFor="postcode">
                <Input
                  id="postcode"
                  value={form.postcode}
                  onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" htmlFor="address">
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Notes" htmlFor="notes">
                  <Textarea
                    id="notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form?.name.trim() || !form?.phone.trim()}
            >
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
