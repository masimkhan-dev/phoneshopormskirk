import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Globe, Loader2, Search, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  FieldGrid,
  FormDialog,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  SummaryFigure,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { callRpc } from "@/lib/admin/db";
import { adminProductsQuery, type AdminProduct } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: Products,
});

function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery(adminProductsQuery(search));

  // Quick Stock Adjustment Dialog state
  const [adjusting, setAdjusting] = useState<AdminProduct | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  const adjust = useMutation({
    mutationFn: async () =>
      callRpc("adjust_product_stock", {
        p: {
          product_id: adjusting?.id,
          quantity_change: Number(delta),
          reason: reason || "Stock count adjustment",
        },
      }),
    onSuccess: () => {
      toast.success("Stock adjusted successfully.");
      setAdjusting(null);
      setDelta("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to adjust stock."),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products and accessories"
        description="Quantities update automatically on every sale. Adjust here after a stock count or delivery."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to="/admin/products/quick-add">
                <Zap className="mr-1.5 size-4" /> Quick Add Product
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/products/new">
                <Globe className="mr-1.5 size-4" /> Add Website Product
              </Link>
            </Button>
          </div>
        }
      />

      <Section>
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {data.length} {data.length === 1 ? "product" : "products"}
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block">
              <TableShell minWidth="min-w-[56rem]" stickyHeader>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th className="w-32">Category</Th>
                    <Th className="w-28 font-mono">SKU</Th>
                    <Th className="w-24 text-right">Cost</Th>
                    <Th className="w-24 text-right">Selling Price</Th>
                    <Th className="w-20 text-right">Qty</Th>
                    <Th className="w-24 text-center">Website</Th>
                    <Th className="w-36 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/60 transition-colors">
                      <Td>
                        <span className="font-bold text-foreground block">{p.name}</span>
                        {p.brand && (
                          <span className="text-[0.7rem] text-muted-foreground block">
                            {[p.brand, p.model].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </Td>
                      <Td className="text-muted-foreground">
                        {p.product_categories?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td className="font-mono text-[0.75rem] text-foreground/80">
                        {p.sku || "—"}
                      </Td>
                      <Td className="text-right">
                        <Money pence={p.cost_price_pence} />
                      </Td>
                      <Td className="text-right font-bold">
                        <Money pence={p.price_pence} />
                      </Td>
                      <Td className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-extrabold tabular-nums",
                            p.quantity <= 0
                              ? "text-destructive"
                              : p.quantity <= p.reorder_level
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground",
                          )}
                        >
                          {p.quantity}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <StatusBadge
                          tone={p.public_visible ? (p.featured ? "green" : "neutral") : "red"}
                        >
                          {p.public_visible ? (p.featured ? "Featured" : "Visible") : "Hidden"}
                        </StatusBadge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setAdjusting(p);
                              setDelta("");
                              setReason("");
                            }}
                          >
                            Adjust
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Link to="/admin/products/$id/edit" params={{ id: p.id }}>
                              Edit Product
                            </Link>
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>

            {/* Mobile Stacked List (< md) */}
            <div className="divide-y divide-admin-border md:hidden">
              {data.map((p) => (
                <div key={p.id} className="p-3 space-y-1.5 hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-foreground text-xs truncate">
                      {p.name}
                    </span>
                    <StatusBadge
                      tone={p.public_visible ? (p.featured ? "green" : "neutral") : "red"}
                    >
                      {p.public_visible ? (p.featured ? "Featured" : "Visible") : "Hidden"}
                    </StatusBadge>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground font-medium truncate">
                      {p.product_categories?.name || p.brand || "Accessory"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold tabular-nums">
                        <Money pence={p.price_pence} />
                      </span>
                      <span className="text-[0.7rem] font-bold text-muted-foreground">
                        Qty: {p.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-mono text-[0.7rem] text-muted-foreground">
                      {p.sku ? `SKU: ${p.sku}` : "No SKU"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[0.7rem]"
                        onClick={() => {
                          setAdjusting(p);
                          setDelta("");
                          setReason("");
                        }}
                      >
                        Adjust
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[0.7rem]">
                        <Link to="/admin/products/$id/edit" params={{ id: p.id }}>
                          Edit Product
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No products found"
            description="Add your first retail product or accessory to start selling at the counter."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild size="sm">
                  <Link to="/admin/products/quick-add">
                    <Zap className="mr-1.5 size-4" /> Quick Add Product
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/products/new">
                    <Globe className="mr-1.5 size-4" /> Add Website Product
                  </Link>
                </Button>
              </div>
            }
          />
        )}
      </Section>

      {/* Quick Stock Adjustment Modal */}
      <FormDialog
        open={!!adjusting}
        onOpenChange={(o) => !o && setAdjusting(null)}
        title={`Adjust stock — ${adjusting?.name ?? ""}`}
        description={`Currently ${adjusting?.quantity ?? 0} in stock. Use -2 to remove two.`}
        footer={
          <>
            <span className="mr-auto">
              <SummaryFigure
                label="New total"
                value={String((adjusting?.quantity ?? 0) + (Number(delta) || 0))}
                tone="primary"
              />
            </span>
            <Button variant="outline" size="sm" onClick={() => setAdjusting(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => adjust.mutate()}
              disabled={adjust.isPending || !delta || Number(delta) === 0}
            >
              {adjust.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save adjustment
            </Button>
          </>
        }
      >
        <FieldGrid cols={2}>
          <Field label="Change" htmlFor="delta">
            <Input
              id="delta"
              className="h-9"
              inputMode="numeric"
              autoFocus
              value={delta}
              onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="10"
            />
          </Field>
          <Field label="Reason" htmlFor="reason">
            <Input
              id="reason"
              className="h-9"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Delivery, Stock count"
            />
          </Field>
        </FieldGrid>
      </FormDialog>
    </div>
  );
}
