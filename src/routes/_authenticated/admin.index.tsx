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
  PaymentStatusBadge,
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

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const QUICK_ACTIONS = [
  { to: "/admin/new-repair", label: "New Repair", icon: Wrench },
  { to: "/admin/buy-phone", label: "Buy Phone", icon: Smartphone },
  { to: "/admin/sell-phone", label: "Sell Phone", icon: BadgePoundSterling },
  { to: "/admin/direct-sale", label: "Direct Sale", icon: ShoppingBag },
];

function Dashboard() {
  const { data, isLoading } = useQuery(dashboardQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today at the shop"
        description="Live counter activity, stock position and money taken today."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-3 rounded-lg bg-primary px-4 py-4 text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-10 place-items-center rounded-md bg-white/15">
              <a.icon className="size-5" />
            </span>
            <span className="text-base font-extrabold tracking-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Today's revenue"
              value={money(data.revenueToday)}
              sub={`${data.salesCountToday} sales · ${data.repairCountToday} repairs`}
              icon={PoundSterling}
              tone="brand"
            />
            <StatCard
              label="Repair revenue today"
              value={money(data.repairRevenueToday)}
              sub={`${data.repairCountToday} repair invoices`}
              icon={Wrench}
              to="/admin/repairs"
            />
            <StatCard
              label="Phones bought today"
              value={String(data.phonesBoughtToday)}
              sub={`${money(data.purchaseSpendToday)} spent`}
              icon={Smartphone}
              to="/admin/stock"
            />
            <StatCard
              label="Phones sold today"
              value={String(data.phonesSoldToday)}
              sub={`${data.productSalesToday} product sales`}
              icon={BadgePoundSterling}
              to="/admin/invoices"
            />
            <StatCard
              label="Phones in stock"
              value={String(data.stockCount)}
              sub={`${money(data.stockValue)} at cost`}
              icon={Boxes}
              to="/admin/stock"
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
              to="/admin/products"
            />
            <StatCard
              label="Outstanding payments"
              value={money(data.outstandingTotal)}
              sub="Across unpaid and partly paid invoices"
              icon={TriangleAlert}
              to="/admin/invoices"
            />
            <StatCard
              label="New enquiries"
              value={String(
                data.recentEnquiries.filter((e) => e.status === "NEW").length,
              )}
              sub="From the public website"
              icon={Inbox}
              to="/admin/enquiries"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Recent repair invoices"
              action={
                <Link to="/admin/repairs" className="text-xs font-bold text-primary">
                  View all
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
                      <tr key={r.id} className="hover:bg-surface/50">
                        <Td className="truncate font-bold text-foreground">
                          {r.repair_number}
                        </Td>
                        <Td className="truncate font-medium">{r.customers?.name ?? "—"}</Td>
                        <Td className="hidden sm:table-cell truncate text-muted-foreground">
                          {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "—"}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold">
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
                <Link to="/admin/payments" className="text-xs font-bold text-primary">
                  View all
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
                      <tr key={p.id} className="hover:bg-surface/50">
                        <Td className="truncate font-bold text-foreground">
                          {p.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="truncate text-muted-foreground">
                          {paymentMethodLabel(p.method)}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold">
                          <Money
                            pence={p.direction === "IN" ? p.amount_pence : -p.amount_pence}
                          />
                        </Td>
                        <Td className="hidden sm:table-cell text-right truncate text-muted-foreground">
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

            <Section
              title="Recent phone sales"
              action={
                <Link to="/admin/invoices" className="text-xs font-bold text-primary">
                  View all
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
                      <tr key={s.id} className="hover:bg-surface/50">
                        <Td className="truncate font-bold text-foreground">
                          {s.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="hidden sm:table-cell truncate text-muted-foreground">
                          {s.sale_kind === "PHONE" ? "Phone" : "Products"}
                        </Td>
                        <Td className="truncate font-medium">{s.customers?.name ?? "Walk-in"}</Td>
                        <Td className="text-right whitespace-nowrap font-bold">
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
                <Link to="/admin/stock" className="text-xs font-bold text-primary">
                  View all
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
                      <tr key={p.id} className="hover:bg-surface/50">
                        <Td className="truncate font-bold text-foreground">
                          {p.invoices?.invoice_number ?? "—"}
                        </Td>
                        <Td className="truncate font-medium">{p.customers?.name ?? "—"}</Td>
                        <Td className="hidden sm:table-cell text-right truncate text-muted-foreground">
                          {ukDateTime(p.created_at)}
                        </Td>
                        <Td className="text-right whitespace-nowrap font-bold">
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

            <Section
              title="Website enquiries"
              action={
                <Link to="/admin/enquiries" className="text-xs font-bold text-primary">
                  View all
                </Link>
              }
              className="lg:col-span-2"
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
                      <tr key={e.id} className="hover:bg-surface/50">
                        <Td className="font-semibold truncate">{e.type.replace("_", " ")}</Td>
                        <Td className="truncate font-medium">{e.name}</Td>
                        <Td className="hidden sm:table-cell truncate">{e.phone}</Td>
                        <Td className="hidden sm:table-cell truncate text-muted-foreground">
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
          </div>
        </>
      )}
    </div>
  );
}
