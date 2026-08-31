import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ukDateTime } from "@/lib/admin/money";
import { invoicesQuery, type InvoiceFilter } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/invoices/")({
  component: Invoices,
});

const KIND_LABEL: Record<string, string> = {
  REPAIR: "Repair",
  PHONE_SALE: "Phone sale",
  PHONE_PURCHASE: "Phone bought",
  PRODUCT_SALE: "Products",
};

function Invoices() {
  const [filter, setFilter] = useState<InvoiceFilter>({
    search: "",
    kind: "all",
    status: "all",
    period: "month",
  });
  const { data = [], isLoading } = useQuery(invoicesQuery(filter));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Every repair, sale and purchase document, newest first."
      />

      <div className="admin-card space-y-3 p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search invoice number"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterPills
            value={filter.kind}
            onChange={(kind) => setFilter({ ...filter, kind })}
            options={[
              { value: "all", label: "All types" },
              { value: "REPAIR", label: "Repairs" },
              { value: "PHONE_SALE", label: "Phone sales" },
              { value: "PHONE_PURCHASE", label: "Phones bought" },
              { value: "PRODUCT_SALE", label: "Products" },
            ]}
          />
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
        </div>
      </div>

      <Section>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Type</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface">
                  <Td>
                    <Link
                      to="/admin/invoices/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      className="font-bold text-primary"
                    >
                      {inv.invoice_number}
                    </Link>
                  </Td>
                  <Td>{KIND_LABEL[inv.kind] ?? inv.kind}</Td>
                  <Td>{inv.customers?.name ?? "Walk-in"}</Td>
                  <Td className="text-muted-foreground">{ukDateTime(inv.created_at)}</Td>
                  <Td className="text-right">
                    <Money pence={inv.total_pence} />
                  </Td>
                  <Td className="text-right">
                    <Money pence={inv.balance_pence} />
                  </Td>
                  <Td>
                    {inv.status === "VOID" ? (
                      <RecordStatusBadge status="VOID" />
                    ) : (
                      <PaymentStatusBadge status={inv.payment_status} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState
            title="No invoices for this filter."
            description="Try a different period or type."
          />
        )}
      </Section>
    </div>
  );
}
