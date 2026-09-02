import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

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
import { money, ukDateTime } from "@/lib/admin/money";
import {
  getInvoiceDeviceSummary,
  invoicesQuery,
  type InvoiceFilter,
} from "@/lib/admin/queries";

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

  // Client-extended search for device, imei, customer name, phone, and invoice number
  const filteredData = useMemo(() => {
    const term = filter.search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((inv) => {
      if (inv.invoice_number.toLowerCase().includes(term)) return true;
      if (inv.customers?.name?.toLowerCase().includes(term)) return true;
      if (inv.customers?.phone?.toLowerCase().includes(term)) return true;
      const { device, imei } = getInvoiceDeviceSummary(inv);
      if (device.toLowerCase().includes(term)) return true;
      if (imei && imei.toLowerCase().includes(term)) return true;
      return false;
    });
  }, [data, filter.search]);

  // Operational summary totals derived from the filtered invoice dataset
  const totals = useMemo(() => {
    const active = filteredData.filter((inv) => inv.status !== "VOID");

    let repairTotal = 0;
    let phoneSaleTotal = 0;
    let productSaleTotal = 0;
    let phoneBoughtTotal = 0;
    let totalPaid = 0;
    let outstanding = 0;

    for (const inv of active) {
      if (inv.kind === "REPAIR") {
        repairTotal += inv.total_pence;
      } else if (inv.kind === "PHONE_SALE") {
        phoneSaleTotal += inv.total_pence;
      } else if (inv.kind === "PRODUCT_SALE") {
        productSaleTotal += inv.total_pence;
      } else if (inv.kind === "PHONE_PURCHASE") {
        phoneBoughtTotal += inv.total_pence;
      }

      totalPaid += inv.amount_paid_pence;
      outstanding += inv.balance_pence;
    }

    return {
      count: filteredData.length,
      activeCount: active.length,
      repairTotal,
      phoneSaleTotal,
      productSaleTotal,
      phoneBoughtTotal,
      totalPaid,
      outstanding,
    };
  }, [filteredData]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Every repair, sale, phone purchase and retail document with device snapshots."
      />

      {/* Compact Operational Totals Cards with Category Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Total Invoices - Neutral/Slate */}
        <div className="admin-card rounded-lg border border-slate-300/70 dark:border-slate-700/60 bg-slate-500/5 dark:bg-slate-900/30 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Total Invoices
          </p>
          <p className="text-lg font-extrabold text-foreground">
            {totals.count}
          </p>
        </div>

        {/* Repairs - Blue */}
        <div className="admin-card rounded-lg border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Repairs
          </p>
          <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">
            {money(totals.repairTotal)}
          </p>
        </div>

        {/* Phone Sales - Purple */}
        <div className="admin-card rounded-lg border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Phone Sales
          </p>
          <p className="text-lg font-extrabold text-purple-700 dark:text-purple-300">
            {money(totals.phoneSaleTotal)}
          </p>
        </div>

        {/* Products - Amber */}
        <div className="admin-card rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Products
          </p>
          <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
            {money(totals.productSaleTotal)}
          </p>
        </div>

        {/* Phones Bought - Teal */}
        <div className="admin-card rounded-lg border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Phones Bought
          </p>
          <p className="text-lg font-extrabold text-teal-700 dark:text-teal-300">
            {money(totals.phoneBoughtTotal)}
          </p>
        </div>

        {/* Total Paid - Emerald */}
        <div className="admin-card rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Paid
          </p>
          <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
            {money(totals.totalPaid)}
          </p>
        </div>

        {/* Outstanding - Rose */}
        <div className="admin-card rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-2.5 space-y-0.5 shadow-xs">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Outstanding
          </p>
          <p className={`text-lg font-extrabold ${totals.outstanding > 0 ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"}`}>
            {money(totals.outstanding)}
          </p>
        </div>
      </div>

      {/* Compact Filter Toolbar */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search invoice, customer, device, IMEI…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <span className="hidden h-4 w-px bg-admin-border md:block" />
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
        ) : filteredData.length ? (
          <>
            {/* Desktop & Tablet Table (Hidden on small mobile) */}
            <div className="hidden md:block">
              <TableShell minWidth="min-w-[62rem]" stickyHeader>
                <thead>
                  <tr>
                    <Th className="w-28">Invoice</Th>
                    <Th className="w-28">Type</Th>
                    <Th className="w-36">Customer</Th>
                    <Th>Device / Item</Th>
                    <Th className="w-40">IMEI</Th>
                    <Th className="w-36">Date</Th>
                    <Th className="w-24 text-right">Total</Th>
                    <Th className="w-24 text-right">Paid</Th>
                    <Th className="w-24 text-right">Balance</Th>
                    <Th className="w-24 text-center">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((inv) => {
                    const { device, imei } = getInvoiceDeviceSummary(inv);
                    return (
                      <tr key={inv.id} className="hover:bg-surface/60 transition-colors">
                        <Td>
                          <Link
                            to="/admin/invoices/$invoiceId"
                            params={{ invoiceId: inv.id }}
                            className="font-bold text-primary hover:underline"
                          >
                            {inv.invoice_number}
                          </Link>
                        </Td>
                        <Td className="font-medium text-muted-foreground">
                          {KIND_LABEL[inv.kind] ?? inv.kind}
                        </Td>
                        <Td className="font-semibold truncate max-w-[9rem]">
                          {inv.customers?.name ?? <span className="text-muted-foreground font-normal">Walk-in</span>}
                        </Td>
                        <Td className="font-medium text-foreground">
                          <span className="line-clamp-1">{device}</span>
                        </Td>
                        <Td>
                          {imei ? (
                            <span className="font-mono text-[0.75rem] tracking-tight text-foreground/80 select-all">
                              {imei}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Td>
                        <Td className="text-muted-foreground whitespace-nowrap">
                          {ukDateTime(inv.created_at)}
                        </Td>
                        <Td className="text-right">
                          <Money pence={inv.total_pence} />
                        </Td>
                        <Td className="text-right font-semibold">
                          <Money pence={inv.amount_paid_pence} />
                        </Td>
                        <Td className="text-right">
                          <Money pence={inv.balance_pence} />
                        </Td>
                        <Td className="text-center">
                          {inv.status === "VOID" ? (
                            <RecordStatusBadge status="VOID" />
                          ) : (
                            <PaymentStatusBadge status={inv.payment_status} />
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            </div>

            {/* Mobile Stacked List (Optimized for < md, 320px–430px) */}
            <div className="divide-y divide-admin-border md:hidden">
              {filteredData.map((inv) => {
                const { device, imei } = getInvoiceDeviceSummary(inv);
                return (
                  <div key={inv.id} className="p-3 space-y-1.5 hover:bg-surface/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/admin/invoices/$invoiceId"
                        params={{ invoiceId: inv.id }}
                        className="font-extrabold text-primary hover:underline text-sm"
                      >
                        {inv.invoice_number}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase">
                          {KIND_LABEL[inv.kind] ?? inv.kind}
                        </span>
                        {inv.status === "VOID" ? (
                          <RecordStatusBadge status="VOID" />
                        ) : (
                          <PaymentStatusBadge status={inv.payment_status} />
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{device}</p>
                      <p className="text-xs font-black text-foreground shrink-0">
                        <Money pence={inv.total_pence} />
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[0.72rem] text-muted-foreground">
                      <span className="truncate">{inv.customers?.name ?? "Walk-in"}</span>
                      {imei && (
                        <span className="font-mono text-[0.7rem] text-foreground/75 shrink-0">
                          IMEI: {imei}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            title="No invoices for this filter."
            description="Try a different period, type, or search term."
          />
        )}
      </Section>
    </div>
  );
}
