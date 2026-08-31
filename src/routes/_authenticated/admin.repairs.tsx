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

      <div className="admin-card space-y-3 p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="REP-0001, IMEI, iPhone 13, screen…"
          />
        </div>
        <div className="flex flex-wrap gap-4">
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
          <TableShell>
            <thead>
              <tr>
                <Th>Repair #</Th>
                <Th>Customer</Th>
                <Th>Device</Th>
                <Th>Fault</Th>
                <Th>Taken in</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-surface">
                  <Td>
                    {r.invoice_id ? (
                      <Link
                        to="/admin/invoices/$invoiceId"
                        params={{ invoiceId: r.invoice_id }}
                        className="font-bold text-primary"
                      >
                        {r.repair_number}
                      </Link>
                    ) : (
                      <span className="font-bold">{r.repair_number}</span>
                    )}
                  </Td>
                  <Td>
                    {r.customers?.name ?? "—"}
                    {r.customers?.phone && (
                      <span className="block text-xs text-muted-foreground">
                        {r.customers.phone}
                      </span>
                    )}
                  </Td>
                  <Td>{[r.device_brand, r.device_model].filter(Boolean).join(" ") || "—"}</Td>
                  <Td className="max-w-56 truncate text-muted-foreground">{r.fault}</Td>
                  <Td className="text-muted-foreground">{ukDateTime(r.created_at)}</Td>
                  <Td className="text-right">
                    <Money pence={r.total_pence} />
                  </Td>
                  <Td className="text-right">
                    <Money pence={r.balance_pence} />
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
          <EmptyState
            title="No repairs found."
            description="Change the filters or start a new repair."
            action={
              <Button asChild>
                <Link to="/admin/new-repair">New repair</Link>
              </Button>
            }
          />
        )}
      </Section>
    </div>
  );
}
