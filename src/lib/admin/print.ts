import { toast } from "sonner";

/** Print helpers. Keeps the browser page size in sync with the chosen format. */

export type PrintFormat = "a4" | "thermal";

const STYLE_ID = "print-page-size";

function clear() {
  document.getElementById(STYLE_ID)?.remove();
}

/**
 * Prints the current document in the main window.
 */
export function printDocument(format: PrintFormat) {
  if (typeof window === "undefined") return;
  toast.dismiss();
  clear();
  if (format === "thermal") {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = "@page { size: 80mm auto; margin: 3mm 2mm; }";
    document.head.appendChild(style);
  }
  const restore = () => {
    clear();
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

/**
 * Isolated printing: prints ONLY the specified DOM element via a hidden iframe.
 * This guarantees the background page (tables, navigation, cards) CANNOT leak into print.
 */
export function printElement(element: HTMLElement, format: PrintFormat) {
  if (typeof window === "undefined") return;
  toast.dismiss();

  // Remove existing print iframe if any
  const oldIframe = document.getElementById("print-iframe");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    printDocument(format);
    return;
  }

  // Collect all styles from the parent page
  const headNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
  const headHtml = headNodes.map((n) => n.outerHTML).join("\n");

  const pageRule =
    format === "thermal"
      ? "@page { size: 80mm auto; margin: 3mm 2mm; }"
      : "@page { size: A4 portrait; margin: 14mm; }";

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        ${headHtml}
        <style>
          ${pageRule}
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-doc {
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Wait for styles and images to settle in the iframe, then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      printDocument(format);
    }
  }, 250);
}
