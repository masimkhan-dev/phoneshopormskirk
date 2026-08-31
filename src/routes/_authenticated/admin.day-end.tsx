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
    const byMethod: Record<string, { in: number; out: number }> = {};
    for (const p of payments) {
      const row = (byMethod[p.method] ??= { in: 0, out: 0 });
      if (p.direction === "IN") row.in += p.amount_pence;
      else row.out += p.amount_pence;
    }
    const takings = payments
      .filter((p) => p.direction === "IN")
      .reduce((s, p) => s + p.amount_pence, 0);
    const paidOut = payments
      .filter((p) => p.direction === "OUT")
      .reduce((s, p) => s + p.amount_pence, 0);
    const cashIn = byMethod["CASH"]?.in ?? 0;
    const cashOut = byMethod["CASH"]?.out ?? 0;
    const refunds = payments
      .filter((p) => p.direction === "OUT" && p.notes?.startsWith("Refund:"))
      .reduce((s, p) => s + p.amount_pence, 0);
    return {
      byMethod,
      takings,
      paidOut,
      net: takings - paidOut,
      cashExpected: cashIn - cashOut,
      refunds,
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
            <p className="admin-label">Cash expected</p>
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
            <StatCard label="Money taken" value={money(summary.takings)} sub="All methods" />
            <StatCard
              label="Money paid out"
              value={money(summary.paidOut)}
              sub="Phone purchases and refunds"
            />
            <StatCard label="Refunds" value={money(summary.refunds)} />
            <StatCard label="Net for the day" value={money(summary.net)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title="By payment method">
              {Object.keys(summary.byMethod).length ? (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Method</Th>
                      <Th className="text-right">In</Th>
                      <Th className="text-right">Out</Th>
                      <Th className="text-right">Net</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byMethod).map(([m, v]) => (
                      <tr key={m}>
                        <Td className="font-semibold">{m}</Td>
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
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Type</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((i) => (
                      <tr key={i.id}>
                        <Td className="font-semibold">
                          {i.invoice_number}
                          {i.status === "VOID" && (
                            <span className="ml-2 text-xs text-muted-foreground">voided</span>
                          )}
                        </Td>
                        <Td className="capitalize text-muted-foreground">
                          {i.kind.replace("_", " ").toLowerCase()}
                        </Td>
                        <Td className="text-right">
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
              <TableShell>
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th>Invoice</Th>
                    <Th>Method</Th>
                    <Th>Direction</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="tabular-nums">
                        {new Date(p.created_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Td>
                      <Td>{p.invoices?.invoice_number ?? "—"}</Td>
                      <Td>{p.method}</Td>
                      <Td className={p.direction === "OUT" ? "text-primary" : ""}>
                        {p.direction === "IN" ? "Taken" : "Paid out"}
                      </Td>
                      <Td className="text-right">
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
