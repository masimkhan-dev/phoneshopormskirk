import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  EmptyState,
  Money,
  PageHeader,
  Section,
  StatCard,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/admin/ui";
import { daysInStock, money } from "@/lib/admin/money";
import { reportsQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: Reports,
});

function isoDay(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function Reports() {
  const [preset, setPreset] = useState<"7" | "30" | "90" | "custom">("30");
  const [from, setFrom] = useState(isoDay(30));
  const [to, setTo] = useState(isoDay(0));

  const range = useMemo(() => {
    const start = preset === "custom" ? from : isoDay(Number(preset));
    const end = preset === "custom" ? to : isoDay(0);
    return { from: `${start}T00:00:00.000Z`, to: `${end}T23:59:59.999Z` };
  }, [preset, from, to]);

  const { data, isLoading } = useQuery(reportsQuery(range.from, range.to));

  const live = <T extends { record_status?: string }>(records: T[]) =>
    records.filter((r) => r.record_status !== "VOIDED");

  const salesLive = live(data?.sales ?? []);
  const repairsLive = live(data?.repairs ?? []);
  const purchasesLive = live(data?.purchases ?? []);

  const liveDailySales = (data?.dailySales ?? []).filter((s) => s.status !== "VOIDED");
  const liveExpenses = (data?.expenses ?? []).filter((e) => e.status !== "VOIDED");

  const totalCashSales = liveDailySales.reduce((s, r) => s + r.cash_sale_pence, 0);
  const totalCardSales = liveDailySales.reduce((s, r) => s + r.card_sale_pence, 0);
  const totalDailyRevenue = totalCashSales + totalCardSales;
  const totalOperatingExpenses = liveExpenses.reduce((s, e) => s + e.amount_pence, 0);
  const netSurplus = totalDailyRevenue - totalOperatingExpenses;

  // Operational metrics (preserved for operational monitoring)
  const salesRevenue = salesLive.reduce((s, r) => s + r.total_pence, 0);
  const salesCost = salesLive.reduce((s, r) => s + r.cost_pence, 0);
  const repairRevenue = repairsLive.reduce((s, r) => s + r.total_pence, 0);
  const outstanding = repairsLive.reduce((s, r) => s + r.balance_pence, 0);
  const spentOnPhones = purchasesLive.reduce((s, r) => s + r.total_pence, 0);

  const stock = data?.stock ?? [];
  const inStock = stock.filter((s) => s.status === "IN_STOCK");
  const stockValue = inStock.reduce((s, i) => s + i.purchase_cost_pence, 0);
  const ageBands = [
    { label: "0–30 days", test: (d: number) => d <= 30 },
    { label: "31–60 days", test: (d: number) => d > 30 && d <= 60 },
    { label: "61–90 days", test: (d: number) => d > 60 && d <= 90 },
    { label: "Over 90 days", test: (d: number) => d > 90 },
  ].map((band) => {
    const items = inStock.filter((i) => band.test(daysInStock(i.created_at)));
    return {
      label: band.label,
      count: items.length,
      value: items.reduce((s, i) => s + i.purchase_cost_pence, 0),
    };
  });

  const lowStock = (data?.products ?? []).filter(
    (p) => p.active && p.reorder_level > 0 && p.quantity <= p.reorder_level,
  );

  const topFaults = Object.entries(
    repairsLive.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
      const key = r.fault.trim().toLowerCase().slice(0, 40) || "other";
      acc[key] = { count: (acc[key]?.count ?? 0) + 1, total: (acc[key]?.total ?? 0) + r.total_pence };
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const byMethod = (data?.payments ?? [])
    .filter((p) => p.direction === "IN")
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + p.amount_pence;
      return acc;
    }, {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Revenue, profit and stock health for the period you choose."
      />

      {/* Transition Notice */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-primary" />
          <span className="font-medium">
            Sales totals and financial revenue figures are currently based on <strong>Daily Sales entries</strong> during the stock transition period.
          </span>
        </div>
        <span className="text-muted-foreground font-semibold">
          {liveDailySales.length} daily entries in period
        </span>
      </div>

      <div className="admin-card flex flex-wrap items-end gap-4 p-4">
        <FilterPills
          value={preset}
          onChange={setPreset}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 w-36"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-9 w-36"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={money(totalDailyRevenue)}
              sub={`Cash: ${money(totalCashSales)} · Card: ${money(totalCardSales)}`}
            />
            <StatCard
              label="Operating Expenses"
              value={money(totalOperatingExpenses)}
              sub="From Expenses module"
            />
            <StatCard
              label="Net Surplus"
              value={money(netSurplus)}
              sub="Sales less expenses"
            />
            <StatCard
              label="Stock Value Held"
              value={money(stockValue)}
              sub={`${inStock.length} phones in inventory`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title="Financial Breakdown (Daily Sales Master)">
              <TableShell minWidth={false} tableClassName="w-full table-fixed">
                <tbody>
                  <tr>
                    <Td className="truncate">Cash Sales</Td>
                    <Td className="text-right">
                      <Money pence={totalCashSales} />
                    </Td>
                  </tr>
                  <tr>
                    <Td className="truncate">Card Sales</Td>
                    <Td className="text-right">
                      <Money pence={totalCardSales} />
                    </Td>
                  </tr>
                  <tr className="bg-muted/30 font-semibold">
                    <Td className="truncate">Total Daily Sales</Td>
                    <Td className="text-right font-bold text-foreground">
                      <Money pence={totalDailyRevenue} />
                    </Td>
                  </tr>
                  {totalOperatingExpenses > 0 && (
                    <tr>
                      <Td className="truncate">Operating Expenses</Td>
                      <Td className="text-right text-destructive">
                        −<Money pence={totalOperatingExpenses} />
                      </Td>
                    </tr>
                  )}
                  <tr className="bg-surface font-extrabold">
                    <Td className="truncate">Net Period Surplus</Td>
                    <Td className={`text-right font-extrabold ${netSurplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      <Money pence={netSurplus} />
                    </Td>
                  </tr>
                </tbody>
              </TableShell>
            </Section>

            <Section title="Payments taken by method">
              {Object.keys(byMethod).length ? (
                <TableShell minWidth={false} tableClassName="w-full table-fixed">
                  <tbody>
                    {Object.entries(byMethod).map(([method, amount]) => (
                      <tr key={method}>
                        <Td className="truncate font-semibold">{method}</Td>
                        <Td className="text-right font-semibold">
                          <Money pence={amount} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No payments in this period." />
              )}
            </Section>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title={`Stock ageing — ${money(stockValue)} held in ${inStock.length} phones`}>
              <TableShell minWidth={false} tableClassName="w-full table-fixed">
                <thead>
                  <tr>
                    <Th className="w-[45%]">Age</Th>
                    <Th className="w-[25%] text-right">Phones</Th>
                    <Th className="w-[30%] text-right">Cost value</Th>
                  </tr>
                </thead>
                <tbody>
                  {ageBands.map((b) => (
                    <tr key={b.label}>
                      <Td className="truncate">{b.label}</Td>
                      <Td className="text-right font-semibold">{b.count}</Td>
                      <Td className="text-right">
                        <Money pence={b.value} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </Section>

            <Section title="Most common repairs">
              {topFaults.length ? (
                <TableShell minWidth={false} tableClassName="w-full table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[50%]">Fault</Th>
                      <Th className="w-[20%] text-right">Jobs</Th>
                      <Th className="w-[30%] text-right">Revenue</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFaults.map(([fault, v]) => (
                      <tr key={fault}>
                        <Td className="truncate capitalize">{fault}</Td>
                        <Td className="text-right font-semibold">{v.count}</Td>
                        <Td className="text-right">
                          <Money pence={v.total} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No repairs in this period." />
              )}
            </Section>
          </div>

          <Section title="Products to reorder">
            {lowStock.length ? (
              <TableShell minWidth={false} tableClassName="w-full table-fixed">
                <thead>
                  <tr>
                    <Th className="w-[50%]">Product</Th>
                    <Th className="w-[25%] text-right">In stock</Th>
                    <Th className="w-[25%] text-right">Reorder at</Th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <Td className="truncate font-semibold">{p.name}</Td>
                      <Td className="text-right font-extrabold text-primary">{p.quantity}</Td>
                      <Td className="text-right text-muted-foreground">{p.reorder_level}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : (
              <EmptyState title="Nothing needs reordering." />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
