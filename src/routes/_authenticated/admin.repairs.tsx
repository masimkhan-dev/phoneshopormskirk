import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

import {
  EmptyState,
  FilterPills,
  Money,
  PageHeader,
  PaymentStatusBadge,
  RecordStatusBadge,
  Section,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ukDateTime } from "@/lib/admin/money";
import { repairsQuery, type RepairFilter } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/repairs")({
  component: Repairs,
});

function Repairs() {
  const [filter, setFilter] = useState<RepairFilter>({
    search: "",
    period: "month",
    payment: "all",
    status: "all",
  });
  const { data = [], isLoading } = useQuery(repairsQuery(filter));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Repair invoices"
        description="Search by repair number, IMEI, model or fault."
        actions={
          <Button asChild>
            <Link to="/admin/new-repair">
              <Plus className="mr-2 size-4" /> New repair
            </Link>
          </Button>
        }
      />

      {/* Compact Filter Toolbar */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search REP #, IMEI, device, fault…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills
            value={filter.period}
            onChange={(period) => setFilter({ ...filter, period })}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This week" },
              { value: "month", label: "This month" },
              { value: "all", label: "All time" },
            ]}
          />
          <span className="hidden h-4 w-px bg-admin-border md:block" />
          <FilterPills
            value={filter.payment}
            onChange={(payment) => setFilter({ ...filter, payment })}
            options={[
              { value: "all", label: "All payments" },
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIAL", label: "Part paid" },
              { value: "PAID", label: "Paid" },
            ]}
          />
        </div>
      </div>

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block">
              <TableShell minWidth="min-w-[58rem]" stickyHeader>
                <thead>
                  <tr>
                    <Th className="w-28">Repair #</Th>
                    <Th className="w-36">Customer</Th>
                    <Th>Device</Th>
                    <Th className="w-36">IMEI</Th>
                    <Th>Fault</Th>
                    <Th className="w-36">Taken in</Th>
                    <Th className="w-24 text-right">Total</Th>
                    <Th className="w-24 text-right">Balance</Th>
                    <Th className="w-24 text-center">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                      <Td>
                        {r.invoice_id ? (
                          <Link
                            to="/admin/invoices/$invoiceId"
                            params={{ invoiceId: r.invoice_id }}
                            className="font-bold text-primary hover:underline"
                          >
                            {r.repair_number}
                          </Link>
                        ) : (
                          <span className="font-bold">{r.repair_number}</span>
                        )}
                      </Td>
                      <Td className="font-semibold truncate max-w-[9rem]">
                        {r.customers?.name ?? <span className="text-muted-foreground font-normal">Walk-in</span>}
                      </Td>
                      <Td className="font-medium text-foreground">
                        {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "—"}
                      </Td>
                      <Td>
                        {r.imei ? (
                          <span className="font-mono text-[0.75rem] tracking-tight text-foreground/80 select-all">
                            {r.imei}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td className="max-w-44 truncate text-muted-foreground">{r.fault}</Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{ukDateTime(r.created_at)}</Td>
                      <Td className="text-right font-bold">
                        <Money pence={r.total_pence} />
                      </Td>
                      <Td className="text-right font-semibold">
                        <Money pence={r.balance_pence} />
                      </Td>
                      <Td className="text-center">
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
            </div>

            {/* Mobile Stacked List (< md) */}
            <div className="divide-y divide-admin-border md:hidden">
              {data.map((r) => (
                <div key={r.id} className="p-3 space-y-1.5 hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    {r.invoice_id ? (
                      <Link
                        to="/admin/invoices/$invoiceId"
                        params={{ invoiceId: r.invoice_id }}
                        className="font-extrabold text-primary hover:underline text-xs"
                      >
                        {r.repair_number}
                      </Link>
                    ) : (
                      <span className="font-extrabold text-xs">{r.repair_number}</span>
                    )}
                    {r.record_status === "VOIDED" ? (
                      <RecordStatusBadge status="VOIDED" />
                    ) : (
                      <PaymentStatusBadge status={r.payment_status} />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-bold text-foreground truncate">
                      {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "Repair"}
                    </p>
                    <p className="text-xs font-black text-foreground shrink-0">
                      <Money pence={r.total_pence} />
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[0.72rem] text-muted-foreground">
                    <span className="truncate">{r.customers?.name ?? "Walk-in"} · {r.fault}</span>
                    {r.imei && (
                      <span className="font-mono text-[0.7rem] text-foreground/75 shrink-0">
                        IMEI: {r.imei}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No repairs match this filter." />
        )}
      </Section>
    </div>
  );
}
