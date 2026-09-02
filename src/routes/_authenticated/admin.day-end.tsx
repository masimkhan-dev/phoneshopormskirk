import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  Field,
  Money,
  PageHeader,
  Section,
  StatCard,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCsv } from "@/lib/admin/csv";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { dayEndQuery } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/day-end")({
  component: DayEnd,
});

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function DayEnd() {
  const [day, setDay] = useState(todayIso());
  const [counted, setCounted] = useState("");
  const { data, isLoading } = useQuery(dayEndQuery(day));

  const summary = useMemo(() => {
    const payments = data?.payments ?? [];
    const dailySales = data?.dailySales ?? [];
    const expenses = data?.expenses ?? [];

    const cashSale = dailySales.reduce((s, d) => s + d.cash_sale_pence, 0);
    const cardSale = dailySales.reduce((s, d) => s + d.card_sale_pence, 0);
    const totalTakings = cashSale + cardSale;

    // Cash expenses from authoritative expenses table
    const cashExpenses = expenses
      .filter((e) => e.payment_method === "CASH")
      .reduce((s, e) => s + e.amount_pence, 0);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount_pence, 0);

    const cashExpected = cashSale - cashExpenses;
    const net = totalTakings - totalExpenses;

    const refunds = payments
      .filter((p) => p.direction === "OUT" && p.notes?.startsWith("Refund:"))
      .reduce((s, p) => s + p.amount_pence, 0);

    const byMethod: Record<string, { in: number; out: number }> = {};
    for (const p of payments) {
      const row = (byMethod[p.method] ??= { in: 0, out: 0 });
      if (p.direction === "IN") row.in += p.amount_pence;
      else row.out += p.amount_pence;
    }

    return {
      byMethod,
      cashSale,
      cardSale,
      takings: totalTakings,
      cashExpenses,
      totalExpenses,
      net,
      cashExpected,
      refunds,
      dailySalesCount: dailySales.length,
    };
  }, [data]);

  const countedPence = poundsToPence(counted);
  const variance = counted.trim() ? countedPence - summary.cashExpected : 0;

  const exportCsv = () => {
    const rows = (data?.payments ?? []).map((p) => [
      new Date(p.created_at).toLocaleTimeString("en-GB"),
      p.invoices?.invoice_number ?? "",
      p.invoices?.kind ?? "",
      p.method,
      p.direction,
      penceToPounds(p.amount_pence),
      p.notes ?? "",
    ]);
    downloadCsv(
      `day-end-${day}.csv`,
      ["Time", "Invoice", "Type", "Method", "Direction", "Amount (£)", "Note"],
      rows,
    );
  };

  return (
    <div className="space-y-4">
      <div className="no-print space-y-4">
        <PageHeader
          title="Day end & cash up"
          description="Check the till against the system before you close for the day."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 size-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" /> Print
              </Button>
            </div>
          }
        />

        {/* Transition Notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-primary" />
            <span className="font-medium">
              Sales totals and cash-up figures are currently based on <strong>Daily Sales entries</strong> during the stock transition period.
            </span>
          </div>
          <span className="text-muted-foreground font-semibold">
            {summary.dailySalesCount} daily entry recorded
          </span>
        </div>

        <div className="admin-card flex flex-wrap items-end gap-4 p-4">
          <Field label="Day" htmlFor="day">
            <Input
              id="day"
              type="date"
              className="h-9"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          <Field label="Cash counted in till (£)" htmlFor="counted">
            <Input
              id="counted"
              className="h-9"
              inputMode="decimal"
              placeholder="0.00"
              value={counted}
              onChange={(e) => setCounted(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </Field>
          <div className="ml-auto text-right">
            <p className="admin-label">Cash expected in till</p>
            <p className="text-xl font-extrabold tabular-nums">
              {money(summary.cashExpected)}
            </p>
          </div>
          <div className="text-right">
            <p className="admin-label">Difference</p>
            <p
              className={`text-xl font-extrabold tabular-nums ${
                counted.trim() && variance !== 0 ? "text-primary" : ""
              }`}
            >
              {counted.trim() ? money(variance) : "—"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Cash Sales" value={money(summary.cashSale)} sub="From Daily Sales" />
            <StatCard label="Card Sales" value={money(summary.cardSale)} sub="From Daily Sales" />
            <StatCard label="Total Expenses" value={money(summary.totalExpenses)} sub="From Expenses module" />
            <StatCard label="Net for the day" value={money(summary.net)} sub="Sales less expenses" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title="By payment method">
              {Object.keys(summary.byMethod).length ? (
                <TableShell minWidth={false} tableClassName="w-full table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[34%]">Method</Th>
                      <Th className="w-[22%] text-right">In</Th>
                      <Th className="w-[22%] text-right">Out</Th>
                      <Th className="w-[22%] text-right">Net</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byMethod).map(([m, v]) => (
                      <tr key={m}>
                        <Td className="truncate font-semibold">{m}</Td>
                        <Td className="text-right">
                          <Money pence={v.in} />
                        </Td>
                        <Td className="text-right">
                          <Money pence={v.out} />
                        </Td>
                        <Td className="text-right font-extrabold">
                          <Money pence={v.in - v.out} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No payments on this day." />
              )}
            </Section>

            <Section title="Invoices raised">
              {data?.invoices.length ? (
                <TableShell minWidth={false} tableClassName="w-full table-fixed">
                  <thead>
                    <tr>
                      <Th className="w-[36%] sm:w-[32%]">Invoice</Th>
                      <Th className="hidden sm:table-cell sm:w-[26%]">Type</Th>
                      <Th className="w-[32%] sm:w-[22%] text-center">Status</Th>
                      <Th className="w-[32%] sm:w-[20%] text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((i) => (
                      <tr key={i.id}>
                        <Td className="truncate font-semibold">
                          {i.invoice_number}
                        </Td>
                        <Td className="hidden truncate capitalize text-muted-foreground sm:table-cell">
                          {i.kind.replace("_", " ").toLowerCase()}
                        </Td>
                        <Td className="text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
                              i.status === "VOID"
                                ? "bg-muted text-muted-foreground"
                                : i.payment_status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : i.payment_status === "PARTIAL"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                    : "bg-tint text-primary",
                            )}
                          >
                            {i.status === "VOID" ? "Void" : i.payment_status.toLowerCase()}
                          </span>
                        </Td>
                        <Td className="text-right font-semibold">
                          <Money pence={i.total_pence} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : (
                <EmptyState title="No invoices on this day." />
              )}
            </Section>
          </div>

          <Section title="Every payment on this day">
            {data?.payments.length ? (
              <TableShell minWidth={false} tableClassName="w-full table-fixed">
                <thead>
                  <tr>
                    <Th className="w-[18%] sm:w-[15%]">Time</Th>
                    <Th className="w-[30%] sm:w-[25%]">Invoice</Th>
                    <Th className="w-[22%] sm:w-[20%]">Method</Th>
                    <Th className="hidden sm:table-cell sm:w-[20%]">Direction</Th>
                    <Th className="w-[30%] sm:w-[20%] text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="tabular-nums text-muted-foreground">
                        {new Date(p.created_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Td>
                      <Td className="truncate font-semibold">{p.invoices?.invoice_number ?? "—"}</Td>
                      <Td className="truncate">{p.method}</Td>
                      <Td className={cn("hidden truncate sm:table-cell", p.direction === "OUT" ? "text-primary" : "")}>
                        {p.direction === "IN" ? "Taken" : "Paid out"}
                      </Td>
                      <Td className={cn("text-right font-semibold", p.direction === "OUT" ? "text-primary" : "")}>
                        {p.direction === "OUT" ? "−" : ""}
                        <Money pence={p.amount_pence} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : (
              <EmptyState title="Nothing recorded on this day." />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
