import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  EmptyState,
  FilterPills,
  Money,
  PageHeader,
  Section,
  StatCard,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { money, ukDateTime } from "@/lib/admin/money";
import { paymentsQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: Payments,
});

function Payments() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("today");
  const { data = [], isLoading } = useQuery(paymentsQuery(period));

  const taken = data
    .filter((p) => p.direction === "IN")
    .reduce((sum, p) => sum + p.amount_pence, 0);
  const paidOut = data
    .filter((p) => p.direction === "OUT")
    .reduce((sum, p) => sum + p.amount_pence, 0);
  const byMethod = data.reduce<Record<string, number>>((acc, p) => {
    if (p.direction !== "IN") return acc;
    acc[p.method] = (acc[p.method] ?? 0) + p.amount_pence;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Everything taken in and paid out at the counter." />

      <FilterPills
        value={period}
        onChange={setPeriod}
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
          { value: "all", label: "All time" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Money in" value={money(taken)} />
        <StatCard label="Money out" value={money(paidOut)} />
        <StatCard label="Net" value={money(taken - paidOut)} />
      </div>

      {Object.keys(byMethod).length > 0 && (
        <Section title="Money in by method">
          <div className="flex flex-wrap gap-3 p-4">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="rounded-xl border border-admin-border px-4 py-2.5">
                <p className="admin-label">{method}</p>
                <p className="text-base font-extrabold">{money(amount)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Taken</Th>
                <Th>Invoice</Th>
                <Th>Method</Th>
                <Th>Direction</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-surface">
                  <Td className="text-muted-foreground">{ukDateTime(p.created_at)}</Td>
                  <Td>
                    <Link
                      to="/admin/invoices/$invoiceId"
                      params={{ invoiceId: p.invoice_id }}
                      className="font-bold text-primary"
                    >
                      {p.invoices?.invoice_number ?? "View"}
                    </Link>
                  </Td>
                  <Td>{p.method}</Td>
                  <Td>
                    <StatusBadge tone={p.direction === "IN" ? "green" : "amber"}>
                      {p.direction === "IN" ? "In" : "Out"}
                    </StatusBadge>
                  </Td>
                  <Td className="text-muted-foreground">{p.reference ?? "—"}</Td>
                  <Td className="text-right">
                    <Money pence={p.amount_pence} />
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
  );
}
