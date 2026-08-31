import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, FilterPills, PageHeader, Section, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ukDateTime } from "@/lib/admin/money";
import { enquiriesQuery, type Enquiry } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  component: Enquiries,
});

const TYPE_LABEL: Record<string, string> = {
  REPAIR: "Repair quote",
  SELL: "Wants to sell",
  UNLOCK: "Unlocking",
  CONTACT: "General",
  PRODUCT: "Product",
};

function waLink(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "44");
  return `https://wa.me/${digits}?text=${encodeURIComponent(
    `Hi ${name}, this is Phone Shop Ormskirk replying to your website enquiry.`,
  )}`;
}

function Enquiries() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | Enquiry["status"]>("NEW");
  const { data = [], isLoading } = useQuery(enquiriesQuery(status));

  const setEnquiryStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Enquiry["status"] }) => {
      const { error } = await supabase
        .from("website_enquiries")
        .update({ status: next })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Enquiry updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website enquiries"
        description="Repair quotes, sell valuations and unlocking requests from the public site."
      />

      <FilterPills
        value={status}
        onChange={setStatus}
        options={[
          { value: "NEW", label: "New" },
          { value: "CONTACTED", label: "Contacted" },
          { value: "CONVERTED", label: "Converted" },
          { value: "CLOSED", label: "Closed" },
          { value: "all", label: "All" },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.map((e) => (
            <article key={e.id} className="admin-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{ukDateTime(e.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge tone="red">{TYPE_LABEL[e.type] ?? e.type}</StatusBadge>
                  <StatusBadge tone={e.status === "NEW" ? "amber" : "neutral"}>
                    {e.status.toLowerCase()}
                  </StatusBadge>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-semibold">{e.phone}</p>
                {e.email && <p className="text-muted-foreground">{e.email}</p>}
                {e.message && <p className="text-muted-foreground">{e.message}</p>}
              </div>

              {Object.keys(e.metadata ?? {}).length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-surface p-3 text-xs">
                  {Object.entries(e.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                      <dd className="font-semibold">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${e.phone}`}>
                    <Phone className="mr-1.5 size-3.5" /> Call
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={waLink(e.phone, e.name)} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-1.5 size-3.5" /> WhatsApp
                  </a>
                </Button>
                {e.status === "NEW" && (
                  <Button
                    size="sm"
                    onClick={() => setEnquiryStatus.mutate({ id: e.id, next: "CONTACTED" })}
                  >
                    Mark contacted
                  </Button>
                )}
                {e.status !== "CONVERTED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEnquiryStatus.mutate({ id: e.id, next: "CONVERTED" })}
                  >
                    Converted
                  </Button>
                )}
                {e.status !== "CLOSED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEnquiryStatus.mutate({ id: e.id, next: "CLOSED" })}
                  >
                    Close
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Section>
          <EmptyState title="No enquiries in this list." />
        </Section>
      )}
    </div>
  );
}
