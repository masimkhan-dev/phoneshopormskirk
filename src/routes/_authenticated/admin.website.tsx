import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Section, StatusBadge, TableShell, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ukDate } from "@/lib/admin/money";

export const Route = createFileRoute("/_authenticated/admin/website")({
  component: WebsiteContent,
});

type Review = {
  id: string;
  author_name: string;
  rating: number | null;
  quote: string;
  source: string;
  reviewed_on: string | null;
  public_visible: boolean;
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  topic: string;
  public_visible: boolean;
};

function WebsiteContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"reviews" | "faqs">("reviews");

  const reviews = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("id,author_name,rating,quote,source,reviewed_on,public_visible")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Review[];
    },
  });

  const faqs = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id,question,answer,topic,public_visible")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Faq[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      table,
      id,
      next,
    }: {
      table: "customer_reviews" | "faqs";
      id: string;
      next: boolean;
    }) => {
      const { error } = await supabase
        .from(table)
        .update({ public_visible: next })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Website content updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website content"
        description="Choose which customer reviews and questions appear on the public site."
      />

      <div className="flex gap-2">
        {(["reviews", "faqs"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "reviews" ? "Customer reviews" : "Questions"}
          </Button>
        ))}
      </div>

      {tab === "reviews" ? (
        <Section title="Customer reviews">
          {reviews.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : reviews.data?.length ? (
            <TableShell>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Review</Th>
                  <Th>Rating</Th>
                  <Th>Date</Th>
                  <Th>Website</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reviews.data.map((r) => (
                  <tr key={r.id} className="hover:bg-surface">
                    <Td className="font-bold">{r.author_name}</Td>
                    <Td className="max-w-md text-muted-foreground">{r.quote}</Td>
                    <Td>{r.rating ? `${r.rating}/5` : "—"}</Td>
                    <Td className="text-muted-foreground">
                      {r.reviewed_on ? ukDate(r.reviewed_on) : "—"}
                    </Td>
                    <Td>
                      <StatusBadge tone={r.public_visible ? "green" : "neutral"}>
                        {r.public_visible ? "Shown" : "Hidden"}
                      </StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle.mutate({
                            table: "customer_reviews",
                            id: r.id,
                            next: !r.public_visible,
                          })
                        }
                      >
                        {r.public_visible ? "Hide" : "Show"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No reviews saved yet." />
          )}
        </Section>
      ) : (
        <Section title="Questions and answers">
          {faqs.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : faqs.data?.length ? (
            <TableShell>
              <thead>
                <tr>
                  <Th>Question</Th>
                  <Th>Topic</Th>
                  <Th>Website</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {faqs.data.map((f) => (
                  <tr key={f.id} className="hover:bg-surface">
                    <Td>
                      <span className="font-bold">{f.question}</span>
                      <span className="mt-0.5 block max-w-xl text-xs text-muted-foreground">
                        {f.answer}
                      </span>
                    </Td>
                    <Td className="capitalize text-muted-foreground">
                      {f.topic.replace(/_/g, " ").toLowerCase()}
                    </Td>
                    <Td>
                      <StatusBadge tone={f.public_visible ? "green" : "neutral"}>
                        {f.public_visible ? "Shown" : "Hidden"}
                      </StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle.mutate({ table: "faqs", id: f.id, next: !f.public_visible })
                        }
                      >
                        {f.public_visible ? "Hide" : "Show"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No questions saved yet." />
          )}
        </Section>
      )}
    </div>
  );
}
