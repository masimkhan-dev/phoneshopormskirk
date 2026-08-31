import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  FieldGrid,
  FormDialog,
  MoreDetails,
  PageHeader,
  Section,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { suppliersQuery, type Supplier } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  component: Suppliers,
});

const blank = {
  id: undefined as string | undefined,
  name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery(suppliersQuery(search));
  const [form, setForm] = useState<typeof blank | null>(null);

  const save = useMutation({
    mutationFn: async () =>
      callRpc("save_supplier", {
        p: {
          id: form?.id ?? null,
          name: form?.name,
          company: form?.company || null,
          phone: form?.phone || null,
          email: form?.email || null,
          address: form?.address || null,
          notes: form?.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Supplier saved successfully.");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function edit(s: Supplier) {
    setForm({
      id: s.id,
      name: s.name,
      company: s.company ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Parts and trade suppliers used for repairs and stock purchases."
        actions={
          <Button onClick={() => setForm({ ...blank })}>
            <Plus className="mr-2 size-4" /> New supplier
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
            placeholder="Search suppliers"
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
                <Th>Company</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-surface">
                  <Td className="font-bold">{s.name}</Td>
                  <Td className="text-muted-foreground">{s.company ?? "—"}</Td>
                  <Td>{s.phone ?? "—"}</Td>
                  <Td className="text-muted-foreground">{s.email ?? "—"}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => edit(s)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No suppliers yet." />
        )}
      </Section>

      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title={form?.id ? "Edit supplier" : "New supplier"}
        description="Contact details only — extras live under More details."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form?.name.trim()}
            >
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save supplier
            </Button>
          </>
        }
      >
        {form && (
          <>
            <FieldGrid cols={3}>
              <Field label="Contact name" htmlFor="name">
                <Input
                  id="name"
                  className="h-9"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Company" htmlFor="company">
                <Input
                  id="company"
                  className="h-9"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  className="h-9"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <MoreDetails cols={2} label="More details (email, address, notes)">
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  className="h-9"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Address" htmlFor="address">
                <Input
                  id="address"
                  className="h-9"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </MoreDetails>
          </>
        )}
      </FormDialog>

    </div>
  );
}
