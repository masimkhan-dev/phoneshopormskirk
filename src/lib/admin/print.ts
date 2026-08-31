/** Print helpers. Keeps the browser page size in sync with the chosen format. */

export type PrintFormat = "a4" | "thermal";

const STYLE_ID = "print-page-size";

function clear() {
  document.getElementById(STYLE_ID)?.remove();
}

/**
 * Prints the current document. For thermal we swap the @page size to 80mm so
 * receipts are not clipped, then restore A4 once the print dialog closes.
 */
export function printDocument(format: PrintFormat) {
  if (typeof window === "undefined") return;
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
