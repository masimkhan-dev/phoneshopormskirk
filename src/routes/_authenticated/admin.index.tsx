import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgePoundSterling,
  Boxes,
  Inbox,
  Package,
  PoundSterling,
  ShoppingBag,
  Smartphone,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import {
  EmptyState,
  Money,
  PageHeader,
  RecordStatusBadge,
  Section,
  StatCard,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { money, paymentMethodLabel, ukDateTime } from "@/lib/admin/money";
import { dashboardQuery } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const QUICK_ACTIONS = [
  { to: "/admin/new-repair", label: "New Repair", icon: Wrench, primary: true },
  { to: "/admin/buy-phone", label: "Buy Phone", icon: Smartphone, primary: false },
  { to: "/admin/sell-phone", label: "Sell Phone", icon: BadgePoundSterling, primary: false },
  { to: "/admin/direct-sale", label: "Direct Sale", icon: ShoppingBag, primary: true },
] as const;

function Dashboard() {
  const { data, isLoading } = useQuery(dashboardQuery);

  const newEnquiriesCount = data?.recentEnquiries
    ? data.recentEnquiries.filter((e) => e.status === "NEW").length
    : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Today at the shop"
        description="Live counter activity, stock position and money taken today."
      />

      {/* Row 1: Quick Actions */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3.5 py-3 sm:px-4 sm:py-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              a.primary
                ? "bg-primary text-primary-foreground border border-primary/20 shadow-2xs hover:bg-brand-deep hover:shadow-soft"
                : "admin-card bg-admin-panel text-foreground border border-admin-border shadow-2xs hover:border-primary/40 hover:bg-surface/60 hover:shadow-soft",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-md transition-transform duration-150 group-hover:scale-105",
                a.primary
                  ? "bg-white/20 text-white"
                  : "bg-muted text-foreground/80 group-hover:bg-primary/10 group-hover:text-primary transition-colors",
              )}
            >
              <a.icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm tracking-tight truncate",
                  a.primary ? "font-bold text-white" : "font-semibold text-foreground",
                )}
              >
                {a.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Row 2: Primary KPI cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Today's revenue"
              value={money(data.revenueToday)}
              sub={`${data.salesCountToday} sales · ${data.repairCountToday} repairs`}
              icon={PoundSterling}
              tone="emerald"
              size="lg"
            />
            <StatCard
              label="Outstanding payments"
              value={money(data.outstandingTotal)}
              sub="Across unpaid and partly paid invoices"
              icon={TriangleAlert}
              tone={data.outstandingTotal > 0 ? "amber" : "slate"}
              size="lg"
              to="/admin/invoices"
            />
            <StatCard
              label="Phones in stock"
              value={String(data.stockCount)}
              sub={`${money(data.stockValue)} at cost`}
              icon={Boxes}
              tone="slate"
              size="lg"
              to="/admin/stock"
            />
          </div>

          {/* Row 3: Secondary KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Repair revenue today"
              value={money(data.repairRevenueToday)}
              sub={`${data.repairCountToday} repair invoices`}
              icon={Wrench}
              tone="plain"
              to="/admin/repairs"
            />
            <StatCard
              label="Phones bought today"
              value={String(data.phonesBoughtToday)}
              sub={`${money(data.purchaseSpendToday)} spent`}
              icon={Smartphone}
              tone="plain"
              to="/admin/stock"
            />
            <StatCard
              label="Phones sold today"
              value={String(data.phonesSoldToday)}
              sub={`${data.productSalesToday} product sales`}
              icon={BadgePoundSterling}
              tone="plain"
              to="/admin/invoices"
            />
            <StatCard
              label="Low stock products"
              value={String(data.lowStockProducts.length)}
              sub={
                data.lowStockProducts[0]
                  ? `Lowest: ${data.lowStockProducts[0].name}`
                  : "All products above reorder level"
              }
              icon={Package}
              tone={data.lowStockProducts.length > 0 ? "amber" : "plain"}
              to="/admin/products"
            />
            <StatCard
              label="New enquiries"
              value={String(newEnquiriesCount)}
              sub="From the public website"
              icon={Inbox}
              tone={newEnquiriesCount > 0 ? "blue" : "plain"}
              to="/admin/enquiries"
            />
          </div>

          {/* Row 4: Recent Repair Invoices & Recent Payments */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Recent repair invoices"
              action={
                <Link
                  to="/admin/repairs"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-deep transition-colors"
                >
                  View all
                  <span aria-hidden className="text-[10px]">→</span>
                </Link>
              }
            >
              {data.recentRepairs.length ? (
                <TableShell minWidth={false} className="overflow-hidden" tableClassName="table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[32%] sm:w-[26%]">Repair #</Th>
                      <Th className="w-[36%] sm:w-[28%]">Customer</Th>
                      <Th className="hidden sm:table-cell sm:w-[26%]">Device</Th>
                      <Th className="w-[32%] sm:w-[20%] text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRepairs.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/40 transition-colors duration-100">
                        <Td className="truncate font-semibold text-foreground">
                          {r.repair_number}
                        </Td>
                        <Td className="truncate font-medium text-foreground/90">{r.customers?.name ?? "—"}</Td>
                        <Td className="hidden sm:table-cell truncate text-muted-foreground">
                          {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "—"}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                          <Money pence={r.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No repair invoices yet." compact />
              )}
            </Section>

            <Section
              title="Recent payments"
              action={
                <Link
                  to="/admin/payments"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-deep transition-colors"
                >
                  View all
                  <span aria-hidden className="text-[10px]">→</span>
                </Link>
              }
            >
              {data.recentPayments.length ? (
                <TableShell minWidth={false} className="overflow-hidden" tableClassName="table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[32%] sm:w-[28%]">Invoice</Th>
                      <Th className="w-[28%] sm:w-[22%]">Method</Th>
                      <Th className="w-[40%] sm:w-[25%] text-right">Amount</Th>
                      <Th className="hidden sm:table-cell sm:w-[25%] text-right">When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors duration-100">
                        <Td className="truncate font-semibold text-foreground">
                          {p.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="truncate text-muted-foreground">
                          {paymentMethodLabel(p.method)}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                          <Money
                            pence={p.direction === "IN" ? p.amount_pence : -p.amount_pence}
                          />
                        </Td>
                        <Td className="hidden sm:table-cell text-right truncate text-muted-foreground text-xs tabular-nums">
                          {ukDateTime(p.created_at)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No payments recorded yet." compact />
              )}
            </Section>
          </div>

          {/* Row 5: Recent Phone Sales & Recent Phone Purchases */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Recent phone sales"
              action={
                <Link
                  to="/admin/invoices"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-deep transition-colors"
                >
                  View all
                  <span aria-hidden className="text-[10px]">→</span>
                </Link>
              }
            >
              {data.recentSales.length ? (
                <TableShell minWidth={false} className="overflow-hidden" tableClassName="table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[32%] sm:w-[26%]">Invoice</Th>
                      <Th className="hidden sm:table-cell sm:w-[26%]">Device</Th>
                      <Th className="w-[36%] sm:w-[28%]">Customer</Th>
                      <Th className="w-[32%] sm:w-[20%] text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors duration-100">
                        <Td className="truncate font-semibold text-foreground">
                          {s.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="hidden sm:table-cell truncate text-muted-foreground">
                          {s.sale_kind === "PHONE" ? "Phone" : "Products"}
                        </Td>
                        <Td className="truncate font-medium text-foreground/90">{s.customers?.name ?? "Walk-in"}</Td>
                        <Td className="text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                          <Money pence={s.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No sales recorded yet." compact />
              )}
            </Section>

            <Section
              title="Recent phone purchases"
              action={
                <Link
                  to="/admin/stock"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-deep transition-colors"
                >
                  View all
                  <span aria-hidden className="text-[10px]">→</span>
                </Link>
              }
            >
              {data.recentPurchases.length ? (
                <TableShell minWidth={false} className="overflow-hidden" tableClassName="table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[32%] sm:w-[28%]">Purchase #</Th>
                      <Th className="w-[36%] sm:w-[28%]">Seller</Th>
                      <Th className="hidden sm:table-cell sm:w-[24%] text-right">When</Th>
                      <Th className="w-[32%] sm:w-[20%] text-right">Cost</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors duration-100">
                        <Td className="truncate font-semibold text-foreground">
                          {p.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="truncate font-medium text-foreground/90">{p.customers?.name ?? "—"}</Td>
                        <Td className="hidden sm:table-cell text-right truncate text-muted-foreground text-xs tabular-nums">
                          {ukDateTime(p.created_at)}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                          <Money pence={p.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No phones bought yet." compact />
              )}
            </Section>
          </div>

          {/* Row 6: Website Enquiries */}
          <Section
            title="Website enquiries"
            action={
              <Link
                to="/admin/enquiries"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-deep transition-colors"
              >
                View all
                <span aria-hidden className="text-[10px]">→</span>
              </Link>
            }
          >
            {data.recentEnquiries.length ? (
              <TableShell minWidth={false} className="overflow-hidden" tableClassName="table-fixed">
                <thead>
                  <tr>
                    <Th className="w-[28%] sm:w-[18%]">Type</Th>
                    <Th className="w-[40%] sm:w-[24%]">Name</Th>
                    <Th className="hidden sm:table-cell sm:w-[22%]">Phone</Th>
                    <Th className="hidden sm:table-cell sm:w-[20%] text-muted-foreground">When</Th>
                    <Th className="w-[32%] sm:w-[16%] text-right sm:text-left">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEnquiries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/40 transition-colors duration-100">
                      <Td className="font-semibold truncate text-foreground">{e.type.replace("_", " ")}</Td>
                      <Td className="truncate font-medium text-foreground/90">{e.name}</Td>
                      <Td className="hidden sm:table-cell truncate text-muted-foreground font-mono text-xs">{e.phone}</Td>
                      <Td className="hidden sm:table-cell truncate text-muted-foreground text-xs tabular-nums">
                        {ukDateTime(e.created_at)}
                      </Td>
                      <Td className="text-right sm:text-left">
                        <RecordStatusBadge status={e.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : (
              <EmptyState title="No enquiries waiting." compact />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
