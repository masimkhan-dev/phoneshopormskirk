import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { penceToPounds, poundsToPence } from "@/lib/admin/money";
import { repairServicesAdminQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/repair-services")({
  component: RepairServices,
});

type Service = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  starting_price_pence: number | null;
  public_visible: boolean;
  featured: boolean;
};

function RepairServices() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery(repairServicesAdminQuery);
  const [editing, setEditing] = useState<Service | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [visible, setVisible] = useState(true);
  const [featured, setFeatured] = useState(false);

  function open(s: Service) {
    setEditing(s);
    setPrice(s.starting_price_pence ? penceToPounds(s.starting_price_pence) : "");
    setDescription(s.description ?? "");
    setVisible(s.public_visible);
    setFeatured(s.featured);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase
        .from("repair_services")
        .update({
          starting_price_pence: price ? poundsToPence(price) : null,
          description: description || null,
          public_visible: visible,
          featured,
        })
        .eq("id", editing.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Repair service updated successfully.");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "repair-services"] });
      queryClient.invalidateQueries({ queryKey: ["repair-services"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Repair services"
        description="Prices and wording shown in the public repair price guide."
      />

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Category</Th>
                <Th>Brand</Th>
                <Th className="text-right">From price</Th>
                <Th>Website</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-surface">
                  <Td className="font-bold">{s.name}</Td>
                  <Td className="text-muted-foreground capitalize">
                    {s.category.replace(/_/g, " ").toLowerCase()}
                  </Td>
                  <Td className="text-muted-foreground">{s.brand ?? "All"}</Td>
                  <Td className="text-right">
                    {s.starting_price_pence ? <Money pence={s.starting_price_pence} /> : "On request"}
                  </Td>
                  <Td>
                    <StatusBadge tone={s.public_visible ? "green" : "neutral"}>
                      {s.public_visible ? "Listed" : "Hidden"}
                    </StatusBadge>
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => open(s)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No repair services yet." />
        )}
      </Section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field
              label="Starting price"
              htmlFor="price"
              hint="Leave empty to show “On request” on the website."
            >
              <Input
                id="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <Checkbox checked={visible} onCheckedChange={(v) => setVisible(v === true)} />
              Show on the public website
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <Checkbox checked={featured} onCheckedChange={(v) => setFeatured(v === true)} />
              Feature on the homepage
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
