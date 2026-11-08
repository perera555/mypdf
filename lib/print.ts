"use client";

/**
 * Print a PDF using the system print dialog — which lists every printer the computer
 * knows about (USB, network, Wi-Fi, "Save as PDF", etc.).
 */
export function printPdf(bytes: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;";
    iframe.src = url;
    const cleanup = () => {
      setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };
    iframe.onload = () => {
      // Give the built-in PDF viewer a moment to lay out the document.
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve();
        } catch {
          // Some browsers (e.g. Safari/iOS) block printing a PDF inside an iframe: open it in a tab instead.
          window.open(url, "_blank");
          resolve();
        }
        cleanup();
      }, 400);
    };
    iframe.onerror = () => {
      cleanup();
      reject(new Error("Could not prepare the document for printing"));
    };
    document.body.appendChild(iframe);
  });
}
