import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Ban, Loader2, Printer, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { InvoiceDocument } from "@/components/admin/InvoiceDocument";
import { ReceiptDocument } from "@/components/admin/ReceiptDocument";
import {
  Field,
  FieldGrid,
  FilterPills,
  FormDialog,
  Kbd,
  MoreDetails,
  PageHeader,
  PaymentStatusBadge,
  RecordStatusBadge,
  SummaryFigure,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isManager, useAdminSession } from "@/hooks/useAdminSession";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { printDocument, type PrintFormat } from "@/lib/admin/print";
import { invoiceQuery } from "@/lib/admin/queries";
import { useHotkeys } from "@/lib/admin/useHotkeys";

export const Route = createFileRoute("/_authenticated/admin/invoices/$invoiceId")({
  validateSearch: (search: Record<string, unknown>): { print?: "1" } =>
    search['print'] === "1" ? { print: "1" } : {},
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const { print } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const canVoid = isManager(session);
  const { data, isLoading } = useQuery(invoiceQuery(invoiceId));
  const printed = useRef(false);

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [tendered, setTendered] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [format, setFormat] = useState<PrintFormat>("a4");
  const [reason, setReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundReason, setRefundReason] = useState("");
  const [restock, setRestock] = useState(true);

  useEffect(() => {
    if (print !== "1" || !data || printed.current) return undefined;
    printed.current = true;
    const timer = setTimeout(() => printDocument("a4"), 350);
    return () => clearTimeout(timer);
  }, [print, data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const takePayment = useMutation({
    mutationFn: async () =>
      callRpc("take_payment", {
        p: {
          client_ref: newClientRef(),
          invoice_id: invoiceId,
          amount_pence: poundsToPence(amount),
          method,
        },
      }),
    onSuccess: () => {
      toast.success("Payment recorded successfully.");
      setPayOpen(false);
      setAmount("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const voidInvoice = useMutation({
    mutationFn: async () =>
      callRpc("void_invoice", { p: { invoice_id: invoiceId, reason } }),
    onSuccess: () => {
      toast.success("Record voided. Stock and balances have been restored.");
      setVoidOpen(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refundInvoice = useMutation({
    mutationFn: async () =>
      callRpc("refund_invoice", {
        p: {
          client_ref: newClientRef(),
          invoice_id: invoiceId,
          amount_pence: poundsToPence(refundAmount),
          method: refundMethod,
          reason: refundReason,
          restock,
        },
      }),
    onSuccess: () => {
      toast.success("Refund recorded.");
      setRefundOpen(false);
      setRefundReason("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openPayment = useCallback(() => {
    const inv = data?.invoice;
    if (!inv || inv.status !== "FINAL" || inv.balance_pence <= 0) return;
    setAmount(penceToPounds(inv.balance_pence));
    setTendered("");
    setPayOpen(true);
  }, [data]);

  useHotkeys(
    useMemo(
      () => ({
        F2: openPayment,
        "mod+p": () => printDocument(format),
      }),
      [openPayment, format],
    ),
  );

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const { invoice, items, payments } = data;

  const amountPence = poundsToPence(amount);
  const overpaying = amountPence > invoice.balance_pence;
  const tenderedPence = poundsToPence(tendered);
  const changePence =
    method === "CASH" && tenderedPence > 0 ? Math.max(tenderedPence - amountPence, 0) : 0;
  const shortTender = method === "CASH" && tenderedPence > 0 && tenderedPence < amountPence;

  return (
    <div className="space-y-5">
      <div className="no-print space-y-4">
        <PageHeader
          title={invoice.invoice_number}
          description={`${invoice.kind.replace("_", " ").toLowerCase()} · ${money(invoice.total_pence)} total · ${money(invoice.balance_pence)} outstanding`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/admin/invoices" })}>
                <ArrowLeft className="mr-2 size-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => printDocument(format)}>
                <Printer className="mr-2 size-4" />
                Print {format === "a4" ? "A4" : "receipt"}
              </Button>
              {invoice.status === "FINAL" && invoice.balance_pence > 0 && (
                <Button onClick={openPayment}>Take payment</Button>
              )}
              {canVoid &&
                invoice.status === "FINAL" &&
                invoice.kind !== "PHONE_PURCHASE" &&
                invoice.amount_paid_pence > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRefundAmount(penceToPounds(invoice.amount_paid_pence));
                      setRefundMethod("CASH");
                      setRestock(true);
                      setRefundOpen(true);
                    }}
                  >
                    <Undo2 className="mr-2 size-4" /> Refund
                  </Button>
                )}
              {canVoid && invoice.status === "FINAL" && (
                <Button variant="outline" onClick={() => setVoidOpen(true)}>
                  <Ban className="mr-2 size-4" /> Void
                </Button>
              )}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={invoice.payment_status} />
          <RecordStatusBadge status={invoice.status} />
          {invoice.void_reason && (
            <span className="text-xs text-muted-foreground">
              Void reason: {invoice.void_reason}
            </span>
          )}
          {invoice.refunded_pence > 0 && (
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-primary">
              Refunded {money(invoice.refunded_pence)}
              {invoice.refund_reason ? ` · ${invoice.refund_reason}` : ""}
            </span>
          )}
          <div className="ml-auto">
            <FilterPills
              options={[
                { value: "a4", label: "A4 invoice" },
                { value: "thermal", label: "80mm receipt" },
              ]}
              value={format}
              onChange={setFormat}
            />
          </div>
        </div>
      </div>

      {format === "a4" ? (
        <InvoiceDocument invoice={invoice} items={items} payments={payments} />
      ) : (
        <ReceiptDocument invoice={invoice} items={items} payments={payments} />
      )}

      <FormDialog
        open={payOpen}
        onOpenChange={(open) => {
          setPayOpen(open);
          if (!open) setTendered("");
        }}
        title="Take payment"
        description={`Outstanding balance ${money(invoice.balance_pence)} on ${invoice.invoice_number}.`}
        footer={
          <>
            <span className="mr-auto flex items-center gap-3">
              <SummaryFigure label="This payment" value={money(amountPence)} />
              <SummaryFigure
                label="Remaining"
                value={money(Math.max(invoice.balance_pence - amountPence, 0))}
                tone="primary"
              />
              {changePence > 0 && (
                <SummaryFigure label="Change due" value={money(changePence)} tone="good" />
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => takePayment.mutate()}
              disabled={takePayment.isPending || amountPence <= 0 || overpaying}
            >
              {takePayment.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record payment
            </Button>
          </>
        }
      >
        <FieldGrid cols={2}>
          <Field
            label="Amount"
            htmlFor="amount"
            hint={
              overpaying ? "" : `Leave as ${money(invoice.balance_pence)} to settle in full.`
            }
          >
            <Input
              id="amount"
              className="h-9"
              inputMode="decimal"
              autoFocus
              aria-invalid={overpaying}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />
            {overpaying && (
              <p className="text-xs font-semibold text-primary">
                That is more than the {money(invoice.balance_pence)} outstanding.
              </p>
            )}
          </Field>
          <Field label="Method" htmlFor="pay-method">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="pay-method" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Quick amounts</span>
          {[invoice.balance_pence, Math.round(invoice.balance_pence / 2), 2000, 5000, 10000]
            .filter((v, i, arr) => v > 0 && v <= invoice.balance_pence && arr.indexOf(v) === i)
            .map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setAmount(penceToPounds(v))}
              >
                {money(v)}
              </Button>
            ))}
        </div>
        {method === "CASH" && (
          <FieldGrid cols={2}>
            <Field
              label="Cash received (optional)"
              htmlFor="tendered"
              hint={shortTender ? "" : "Used only to work out change at the counter."}
            >
              <Input
                id="tendered"
                className="h-9"
                inputMode="decimal"
                value={tendered}
                aria-invalid={shortTender}
                onChange={(e) => setTendered(e.target.value.replace(/[^0-9.]/g, ""))}
              />
              {shortTender && (
                <p className="text-xs font-semibold text-primary">
                  Less than the {money(amountPence)} being recorded.
                </p>
              )}
            </Field>
            <Field label="Change due">
              <p className="flex h-9 items-center text-base font-extrabold tabular-nums">
                {money(changePence)}
              </p>
            </Field>
          </FieldGrid>
        )}
        <MoreDetails cols={1} label="Invoice breakdown">
          <dl className="space-y-1 rounded-md bg-surface p-3 text-sm">
            <SummaryRow label="Invoice total" value={money(invoice.total_pence)} />
            <SummaryRow label="Already paid" value={money(invoice.amount_paid_pence)} />
            <SummaryRow label="This payment" value={money(amountPence)} />
            <SummaryRow
              label="Remaining after payment"
              value={money(Math.max(invoice.balance_pence - amountPence, 0))}
              strong
            />
          </dl>
        </MoreDetails>
        <p className="text-xs text-muted-foreground">
          <Kbd>F2</Kbd> opens this dialog · <Kbd>Enter</Kbd> records the payment
        </p>
      </FormDialog>



      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="no-print">
          <DialogHeader>
            <DialogTitle>Void {invoice.invoice_number}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nothing is deleted. The record stays in the books marked as voided, stock is put
            back and payments are reversed.
          </p>
          <Field label="Reason" htmlFor="reason">
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Entered twice by mistake"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => voidInvoice.mutate()}
              disabled={voidInvoice.isPending || reason.trim().length < 3}
            >
              {voidInvoice.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Void invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title={`Refund ${invoice.invoice_number}`}
        description={`Up to ${money(invoice.amount_paid_pence)} can be refunded on this invoice.`}
        footer={
          <>
            <span className="mr-auto">
              <SummaryFigure
                label="Refund"
                value={money(poundsToPence(refundAmount))}
                tone="primary"
              />
            </span>
            <Button variant="outline" size="sm" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => refundInvoice.mutate()}
              disabled={
                refundInvoice.isPending ||
                poundsToPence(refundAmount) <= 0 ||
                poundsToPence(refundAmount) > invoice.amount_paid_pence ||
                refundReason.trim().length < 3
              }
            >
              {refundInvoice.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record refund
            </Button>
          </>
        }
      >
        <FieldGrid cols={2}>
          <Field label="Refund amount" htmlFor="refund-amount">
            <Input
              id="refund-amount"
              className="h-9"
              inputMode="decimal"
              autoFocus
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </Field>
          <Field label="Refunded by" htmlFor="refund-method">
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger id="refund-method" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
        <Field label="Reason" htmlFor="refund-reason">
          <Textarea
            id="refund-reason"
            rows={2}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Customer returned the item"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Checkbox checked={restock} onCheckedChange={(v) => setRestock(v === true)} />
          Put the item(s) back into stock
        </label>
      </FormDialog>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-bold" : "text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "font-extrabold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
