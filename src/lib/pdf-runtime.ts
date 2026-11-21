import DOMMatrix from "@thednp/dommatrix";

let runtime: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;

export function getPdfRuntime() {
  runtime ??= (async () => {
    // Text extraction needs matrix math, not a native canvas renderer.
    if (!globalThis.DOMMatrix) globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as unknown as { pdfjsWorker: typeof worker }).pdfjsWorker = worker;
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })();
  return runtime;
}
