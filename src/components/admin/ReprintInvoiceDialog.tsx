import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Printer, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

import { InvoiceDocument } from "@/components/admin/InvoiceDocument";
import { ReceiptDocument } from "@/components/admin/ReceiptDocument";
import { FilterPills } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printDocument, printElement, type PrintFormat } from "@/lib/admin/print";
import { invoiceQuery } from "@/lib/admin/queries";

export interface ReprintInvoiceDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReprintInvoiceDialog({ invoiceId, open, onOpenChange }: ReprintInvoiceDialogProps) {
  const [format, setFormat] = useState<PrintFormat>("a4");
  const printDocRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...invoiceQuery(invoiceId ?? ""),
    enabled: Boolean(open && invoiceId),
  });

  const invoice = data?.invoice;
  const items = data?.items ?? [];
  const payments = data?.payments ?? [];
  const terms = data?.terms ?? null;

  const handlePrint = () => {
    if (!data) return;
    if (printDocRef.current) {
      printElement(printDocRef.current, format);
    } else {
      printDocument(format);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-reprint-dialog="true"
        className="reprint-dialog-content max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 w-[96vw] sm:w-full"
      >
        {/* Header - Hidden on Print */}
        <div className="no-print space-y-3 pb-2 border-b border-admin-border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Printer className="size-5 text-primary" />
              Reprint Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {invoice ? (
                <>
                  <span className="font-bold text-foreground">{invoice.invoice_number}</span>
                  {invoice.customers?.name
                    ? ` · Customer: ${invoice.customers.name}`
                    : " · Walk-in customer"}
                  {invoice.status === "VOID" && (
                    <span className="ml-2 font-bold uppercase text-destructive">[VOID]</span>
                  )}
                </>
              ) : (
                "Loading invoice details…"
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Format Selector */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <FilterPills<PrintFormat>
              value={format}
              onChange={setFormat}
              options={[
                { value: "a4", label: "A4 Invoice" },
                { value: "thermal", label: "80mm Receipt" },
              ]}
            />
            <span className="text-[0.75rem] text-muted-foreground hidden sm:inline">
              {format === "a4" ? "Standard A4 layout" : "Narrow 80mm thermal receipt"}
            </span>
          </div>
        </div>

        {/* Content / Preview Area */}
        <div className="reprint-preview-container flex-1 overflow-y-auto min-h-[16rem] py-3 print:p-0 print:m-0 print:overflow-visible">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading invoice snapshot…</p>
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center p-4">
              <AlertCircle className="size-8 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Failed to load invoice</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {error instanceof Error
                    ? error.message
                    : "An unexpected error occurred while loading this invoice."}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 size-3.5" /> Retry
              </Button>
            </div>
          ) : invoice ? (
            <div className="reprint-preview-inner rounded-lg border border-admin-border/70 bg-muted/20 p-2 sm:p-4 overflow-x-auto print:border-0 print:p-0 print:bg-transparent print:rounded-none print:overflow-visible">
              <div ref={printDocRef}>
                {format === "a4" ? (
                  <InvoiceDocument
                    invoice={invoice}
                    items={items}
                    payments={payments}
                    termsRecord={terms}
                  />
                ) : (
                  <div className="flex justify-center print:block">
                    <ReceiptDocument
                      invoice={invoice}
                      items={items}
                      payments={payments}
                      termsRecord={terms}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - Hidden on Print */}
        <DialogFooter className="no-print border-t border-admin-border pt-3 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isLoading || isError || !data}
            className="font-bold"
          >
            <Printer className="mr-2 size-4" />
            Reprint {format === "a4" ? "A4" : "Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
