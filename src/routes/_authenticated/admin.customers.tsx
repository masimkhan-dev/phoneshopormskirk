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

      <div className="admin-card p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, 07496…, email"
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
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Postcode</Th>
                <Th>Added</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-surface">
                  <Td className="font-bold">{c.name}</Td>
                  <Td>
                    <a href={`tel:${c.phone}`} className="text-primary">
                      {c.phone}
                    </a>
                  </Td>
                  <Td className="text-muted-foreground">{c.email ?? "—"}</Td>
                  <Td className="text-muted-foreground">{c.postcode ?? "—"}</Td>
                  <Td className="text-muted-foreground">{ukDate(c.created_at)}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => edit(c)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
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
