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
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Repair #</Th>
                      <Th>Customer</Th>
                      <Th>Device</Th>
                      <Th className="text-right">Total</Th>
                      <Th>Payment</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRepairs.map((r) => (
                      <tr key={r.id}>
                        <Td className="font-bold">{r.repair_number}</Td>
                        <Td>{r.customers?.name ?? "—"}</Td>
                        <Td className="text-muted-foreground">
                          {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "—"}
                        </Td>
                        <Td className="text-right">
                          <Money pence={r.total_pence} />
                        </Td>
                        <Td>
                          {r.record_status === "VOIDED" ? (
                            <RecordStatusBadge status="VOIDED" />
                          ) : (
                            <PaymentStatusBadge status={r.payment_status} />
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No repair invoices yet." />
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
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Method</Th>
                      <Th>When</Th>
                      <Th className="text-right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <Td className="font-bold">{p.invoices?.invoice_number ?? "—"}</Td>
                        <Td>{paymentMethodLabel(p.method)}</Td>
                        <Td className="text-muted-foreground">{ukDateTime(p.created_at)}</Td>
                        <Td className="text-right">
                          <Money
                            pence={p.direction === "IN" ? p.amount_pence : -p.amount_pence}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No payments found for this period." />
              )}
            </Section>

            <Section title="Recent phone sales">
              {data.recentSales.length ? (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Type</Th>
                      <Th>Customer</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((s) => (
                      <tr key={s.id}>
                        <Td className="font-bold">{s.invoices?.invoice_number ?? "—"}</Td>
                        <Td>{s.sale_kind === "PHONE" ? "Phone" : "Products"}</Td>
                        <Td>{s.customers?.name ?? "Walk-in"}</Td>
                        <Td className="text-right">
                          <Money pence={s.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No sales recorded yet." />
              )}
            </Section>

            <Section title="Recent phone purchases">
              {data.recentPurchases.length ? (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Receipt</Th>
                      <Th>Seller</Th>
                      <Th>When</Th>
                      <Th className="text-right">Paid out</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPurchases.map((p) => (
                      <tr key={p.id}>
                        <Td className="font-bold">{p.invoices?.invoice_number ?? "—"}</Td>
                        <Td>{p.customers?.name ?? "—"}</Td>
                        <Td className="text-muted-foreground">{ukDateTime(p.created_at)}</Td>
                        <Td className="text-right">
                          <Money pence={p.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No phones bought yet." />
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
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th>Name</Th>
                      <Th>Phone</Th>
                      <Th>When</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEnquiries.map((e) => (
                      <tr key={e.id}>
                        <Td className="font-semibold">{e.type.replace("_", " ")}</Td>
                        <Td>{e.name}</Td>
                        <Td>{e.phone}</Td>
                        <Td className="text-muted-foreground">{ukDateTime(e.created_at)}</Td>
                        <Td>
                          <RecordStatusBadge status={e.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No enquiries waiting." />
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
