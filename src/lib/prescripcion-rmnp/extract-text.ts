import { normalizeCertificateText } from './normalize';

export interface ExtractionResult {
  text: string;
  isScanned: boolean;
  pageCount: number;
  hasSelectableText: boolean;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // PDF.js legacy para Next.js/Node.
    // disableWorker evita errores: fake worker failed, pdf.worker.mjs y "(rsc)".
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => {
          if (item && typeof item.str === 'string') return item.str;
          return '';
        })
        .join('\n');

      pageTexts.push(pageText);
    }

    const text = normalizeCertificateText(pageTexts.join('\n\n'));
    const hasSelectableText = text.trim().length > 50;

    if (!hasSelectableText && pdf.numPages > 0) {
      throw new Error('El PDF parece escaneado o no contiene texto seleccionable. Requiere OCR.');
    }

    if (!hasSelectableText) {
      throw new Error('No se pudo extraer texto del PDF. Verifica que sea un certificado RMNP valido.');
    }

    return {
      text,
      isScanned: false,
      pageCount: pdf.numPages,
      hasSelectableText: true,
    };
  } catch (error: any) {
    if (error.message?.includes('escaneado') || error.message?.includes('OCR')) {
      throw error;
    }

    if (error instanceof Error) {
      throw new Error(`Error al extraer texto del PDF: ${error.message}`);
    }

    throw new Error('Error al extraer texto del PDF: Unknown error');
  }
}
