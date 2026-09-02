import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AddDailySaleModal } from "@/components/admin/AddDailySaleModal";
import { AddExpenseModal } from "@/components/admin/AddExpenseModal";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/useAdminSession";
import { downloadCsv } from "@/lib/admin/csv";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds } from "@/lib/admin/money";
import {
  dailySalesQuery,
  distinctStaffNamesQuery,
  type DailySale,
} from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/daily-sales")({
  component: DailySalesPage,
});

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateIso(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function DailySalesPage() {
  const qc = useQueryClient();
  const { data: session } = useAdminSession();
  const isManager = session?.roles.some((r) => r === "OWNER" || r === "ADMIN");

  // Date range state: default to current week Monday -> Sunday
  const [preset, setPreset] = useState<"this-week" | "last-week" | "this-month" | "custom">("this-week");
  const [customFrom, setCustomFrom] = useState(formatDateIso(getMonday(new Date())));
  const [customTo, setCustomTo] = useState(formatDateIso(addDays(getMonday(new Date()), 6)));
  const [staffFilter, setStaffFilter] = useState<string>("ALL");

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editSaleRecord, setEditSaleRecord] = useState<DailySale | null>(null);

  // Compute active date boundaries
  const { fromDate, toDate } = useMemo(() => {
    if (preset === "this-week") {
      const mon = getMonday(new Date());
      const sun = addDays(mon, 6);
      return { fromDate: formatDateIso(mon), toDate: formatDateIso(sun) };
    }
    if (preset === "last-week") {
      const mon = addDays(getMonday(new Date()), -7);
      const sun = addDays(mon, 6);
      return { fromDate: formatDateIso(mon), toDate: formatDateIso(sun) };
    }
    if (preset === "this-month") {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { fromDate: formatDateIso(first), toDate: formatDateIso(last) };
    }
    return { fromDate: customFrom, toDate: customTo };
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useQuery(dailySalesQuery(fromDate, toDate));
  const { data: staffList = [] } = useQuery(distinctStaffNamesQuery);

  // Authoritative dynamic mapping of active expenses by date
  const expensesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of data?.expenses ?? []) {
      if (exp.status === "ACTIVE") {
        const cur = map.get(exp.expense_date) ?? 0;
        map.set(exp.expense_date, cur + exp.amount_pence);
      }
    }
    return map;
  }, [data?.expenses]);

  // Filter active daily sales
  const activeSales = useMemo(() => {
    let list = (data?.dailySales ?? []).filter((s) => s.status === "ACTIVE");
    if (staffFilter !== "ALL") {
      list = list.filter((s) => s.staff_name.toLowerCase() === staffFilter.toLowerCase());
    }
    return list;
  }, [data?.dailySales, staffFilter]);

  // Weekly & Overall Totals
  const totals = useMemo(() => {
    let totalCash = 0;
    let totalCard = 0;
    let totalSales = 0;

    for (const s of activeSales) {
      totalCash += s.cash_sale_pence;
      totalCard += s.card_sale_pence;
      totalSales += s.cash_sale_pence + s.card_sale_pence;
    }

    // Authoritative total expenses directly from expenses table for the active period
    const totalExpenses = (data?.expenses ?? [])
      .filter((e) => e.status === "ACTIVE")
      .reduce((sum, e) => sum + e.amount_pence, 0);

    const weeklyNet = totalSales - totalExpenses;

    return {
      totalCash,
      totalCard,
      totalSales,
      totalExpenses,
      weeklyNet,
      balanceCash: totalCash - totalExpenses,
      balanceCard: totalCard,
    };
  }, [activeSales, data?.expenses]);

  // Staff summary breakdown (visibility only, no wage assumptions)
  const staffSummary = useMemo(() => {
    const counts: Record<string, { entries: number; totalSales: number }> = {};
    for (const s of activeSales) {
      const name = s.staff_name.trim();
      const existing = counts[name] ?? { entries: 0, totalSales: 0 };
      existing.entries += 1;
      existing.totalSales += s.cash_sale_pence + s.card_sale_pence;
      counts[name] = existing;
    }
    return Object.entries(counts).sort((a, b) => b[1].entries - a[1].entries);
  }, [activeSales]);

  // Void mutation
  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      const reason = window.prompt("Reason for voiding this daily sales entry:") || "Voided by manager";
      return callRpc("void_daily_sale", { p_id: id, p_reason: reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-sales"] });
      qc.invalidateQueries({ queryKey: ["admin", "day-end"] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : "Failed to void entry.");
    },
  });

  const exportCsv = () => {
    const rows = activeSales.map((s) => {
      const dayExpense = expensesByDate.get(s.entry_date) ?? 0;
      const totalSale = s.cash_sale_pence + s.card_sale_pence;
      const net = totalSale - dayExpense;
      return [
        s.entry_date,
        s.staff_name,
        penceToPounds(s.cash_sale_pence),
        penceToPounds(s.card_sale_pence),
        penceToPounds(totalSale),
        penceToPounds(dayExpense),
        penceToPounds(net),
        s.description ?? "",
        new Date(s.created_at).toLocaleString("en-GB"),
      ];
    });

    downloadCsv(
      `daily-sales-${fromDate}-to-${toDate}.csv`,
      [
        "Date",
        "Staff Name",
        "Cash Sale (£)",
        "Card Sale (£)",
        "Total Sale (£)",
        "Expense Today (£)",
        "Net (£)",
        "Description",
        "Created At",
      ],
      rows,
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Quick Action Buttons */}
      <div className="no-print space-y-4">
        <PageHeader
          title="Daily Sales Sheet"
          description="Fast manual recording of daily shop figures and weekly sales sheet."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpenseModalOpen(true)}
              >
                <Receipt className="mr-1.5 size-4" /> Add Expense
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditSaleRecord(null);
                  setSaleModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add Daily Entry
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 size-4" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 size-4" /> Print
              </Button>
            </div>
          }
        />

        {/* Toolbar & Filter Bar */}
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={preset === "this-week" ? "default" : "outline"}
              onClick={() => setPreset("this-week")}
            >
              This Week
            </Button>
            <Button
              size="sm"
              variant={preset === "last-week" ? "default" : "outline"}
              onClick={() => setPreset("last-week")}
            >
              Last Week
            </Button>
            <Button
              size="sm"
              variant={preset === "this-month" ? "default" : "outline"}
              onClick={() => setPreset("this-month")}
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={preset === "custom" ? "default" : "outline"}
              onClick={() => setPreset("custom")}
            >
              Custom
            </Button>
          </div>

          {/* Custom Date Pickers & Staff Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {preset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Staff:</span>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Staff</SelectItem>
                  {staffList.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Transition Notice Banner */}
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-primary" />
            <span className="font-medium">
              Manual Daily Sales are for unentered legacy stock. Normal POS transactions remain separate to prevent double-counting.
            </span>
          </div>
          <span className="font-semibold text-primary">
            {fromDate} — {toDate}
          </span>
        </div>
      </div>

      {/* Main Table View */}
      <Section
        title={`Sales Sheet (${fromDate} to ${toDate})`}
        action={
          <span className="text-xs font-medium text-muted-foreground">
            {activeSales.length} {activeSales.length === 1 ? "entry" : "entries"} recorded
          </span>
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : activeSales.length === 0 ? (
          <EmptyState
            title="No daily sales recorded"
            description="Add your first manual daily entry using the button above."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditSaleRecord(null);
                  setSaleModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add Daily Entry
              </Button>
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-admin-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <Th>Date</Th>
                <Th>Staff Name</Th>
                <Th className="text-right">Cash Sale</Th>
                <Th className="text-right">Card Sale</Th>
                <Th className="text-right">Total Sale</Th>
                <Th className="text-right">Expense</Th>
                <Th className="text-right">Net</Th>
                <Th>Description</Th>
                <Th className="no-print w-12 text-center">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border text-sm">
              {activeSales.map((s) => {
                const dayExpense = expensesByDate.get(s.entry_date) ?? 0;
                const totalSale = s.cash_sale_pence + s.card_sale_pence;
                const net = totalSale - dayExpense;

                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <Td className="font-medium whitespace-nowrap">
                      {new Date(s.entry_date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </Td>
                    <Td className="font-bold text-foreground">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {s.staff_name}
                      </span>
                    </Td>
                    <Td className="text-right font-medium">{money(s.cash_sale_pence)}</Td>
                    <Td className="text-right font-medium">{money(s.card_sale_pence)}</Td>
                    <Td className="text-right font-bold text-foreground">
                      {money(totalSale)}
                    </Td>
                    <Td className="text-right font-medium text-destructive">
                      {dayExpense > 0 ? money(dayExpense) : "£0.00"}
                    </Td>
                    <Td className={`text-right font-extrabold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {money(net)}
                    </Td>
                    <Td className="max-w-xs truncate text-xs text-muted-foreground">
                      {s.description || "—"}
                    </Td>
                    <Td className="no-print text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditSaleRecord(s);
                              setSaleModalOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          {isManager && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => voidMutation.mutate(s.id)}
                            >
                              <Trash2 className="mr-2 size-4" /> Void Entry
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Section>

      {/* Bottom Summary Section: Weekly Totals & Staff Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left 2 Cols: Financial Totals Cards */}
        <div className="md:col-span-2 admin-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-admin-border pb-2">
            <h3 className="text-sm font-bold tracking-tight">Period Totals</h3>
            <span className="text-xs text-muted-foreground">
              {fromDate} to {toDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Total Cash</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(totals.totalCash)}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Total Card</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(totals.totalCard)}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Total Sales</div>
              <div className="mt-1 text-lg font-extrabold text-primary">
                {money(totals.totalSales)}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Total Expenses</div>
              <div className="mt-1 text-lg font-bold text-destructive">
                {money(totals.totalExpenses)}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Weekly Net</div>
              <div className={`mt-1 text-lg font-extrabold ${totals.weeklyNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {money(totals.weeklyNet)}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Balance Cash in Drawer</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(totals.balanceCash)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Staff Activity Summary */}
        <div className="admin-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-admin-border pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-bold tracking-tight">Staff Summary</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Days / entries</span>
          </div>

          {staffSummary.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No staff entries in this period.</p>
          ) : (
            <div className="space-y-2">
              {staffSummary.map(([name, stat]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-foreground">{name}</span>
                  <div className="text-right">
                    <span className="font-bold text-primary">
                      {stat.entries} {stat.entries === 1 ? "day / entry" : "days / entries"}
                    </span>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      Sales: {money(stat.totalSales)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground italic pt-1">
            * Visibility only. One shared laptop login supported.
          </p>
        </div>
      </div>

      {/* Modals */}
      <AddDailySaleModal
        open={saleModalOpen}
        onOpenChange={setSaleModalOpen}
        editRecord={editSaleRecord}
      />
      <AddExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
      />
    </div>
  );
}
