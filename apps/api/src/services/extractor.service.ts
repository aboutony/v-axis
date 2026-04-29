import { createWorker } from "tesseract.js";

import {
  analyzeOcrText,
  type OcrExtractionResult,
} from "../lib/ocr-intelligence";

interface ExtractedMetadata {
  detectedType: string;
  expiryDate: string | null;
  confidence: number;
}

export async function extractDocumentIntelligence(input: {
  fileBuffer: Buffer;
  filename?: string;
  mimeType?: string;
}): Promise<OcrExtractionResult> {
  const context = input.filename ? { filename: input.filename } : {};

  if (isPdf(input.filename, input.mimeType)) {
    const pdfText = await extractPdfText(input.fileBuffer);

    if (pdfText.trim()) {
      return analyzeOcrText({
        rawText: pdfText,
        ...context,
        engine: "pdf-parse",
        engineConfidence: 0.86,
        warnings: [
          "Text was extracted from the PDF text layer. Scanned PDF page rasterization is still required for image-only PDFs.",
        ],
      });
    }

    return analyzeOcrText({
      rawText: "",
      ...context,
      engine: "tesseract.js-pending-pdf-rasterization",
      engineConfidence: 0,
      warnings: [
        "PDF upload is accepted, but server-side page rasterization is the next OCR slice before text can be extracted from PDF files.",
      ],
    });
  }

  const worker = await createWorker(["eng", "ara"]);

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(input.fileBuffer);

    return analyzeOcrText({
      rawText: text,
      ...context,
      engine: "tesseract.js",
      engineConfidence: confidence / 100,
    });
  } finally {
    await worker.terminate();
  }
}

export async function processDocumentMetadata(
  fileBuffer: Buffer,
): Promise<ExtractedMetadata> {
  const extraction = await extractDocumentIntelligence({ fileBuffer });
  const expiryDate =
    extraction.fields.find((field) => field.key.toLowerCase().includes("expiry"))
      ?.value ?? null;

  return {
    detectedType: extraction.documentTypeLabel,
    expiryDate,
    confidence: extraction.overallConfidence,
  };
}

function isPdf(filename?: string, mimeType?: string) {
  return (
    mimeType?.toLowerCase() === "application/pdf" ||
    filename?.toLowerCase().endsWith(".pdf")
  );
}

async function extractPdfText(fileBuffer: Buffer) {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(fileBuffer);

  return result.text ?? "";
}
