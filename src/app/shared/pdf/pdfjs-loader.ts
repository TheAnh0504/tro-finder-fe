import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsModule: PdfJsModule | null = null;

async function getPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist');
    if (!pdfjsModule.GlobalWorkerOptions.workerSrc) {
      pdfjsModule.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
    }
  }
  return pdfjsModule;
}

export async function loadPdfFromBytes(data: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return pdfjs.getDocument({ data: bytes }).promise;
}
