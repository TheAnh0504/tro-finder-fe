import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsModule: PdfJsModule | null = null;

async function getPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist');
    if (!pdfjsModule.GlobalWorkerOptions.workerPort) {
      pdfjsModule.GlobalWorkerOptions.workerPort = new Worker('/pdf.worker.mjs', { type: 'module' });
    }
  }
  return pdfjsModule;
}

export async function loadPdfFromBytes(data: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return pdfjs.getDocument({ data: bytes }).promise;
}
