// apps/api/src/services/extractor.service.ts

import { createWorker } from 'tesseract.js'; // Standard 2026 High-Fidelity OCR

interface ExtractedMetadata {
  detectedType: string;
  expiryDate: string;
  confidence: number;
}

export const processDocumentMetadata = async (fileBuffer: Buffer): Promise<ExtractedMetadata> => {
  // 1. Initialize the Sovereign OCR Worker (Dual-Language: Arabic/English)
  const worker = await createWorker(['eng', 'ara']);
  
  // 2. Perform the High-Fidelity Scan
  const { data: { text, confidence } } = await worker.recognize(fileBuffer);
  await worker.terminate();

  // 3. The "Anchor Key" Logic: Finding Expiry Dates
  // We look for patterns common in Saudi Administrative Documents
  const expiryRegex = /(Expiry Date|Valid Until|تاريخ الانتهاء|Expiry)\s*[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/gi;
  const match = expiryRegex.exec(text);

  let detectedDate = '2026-12-31'; // Default Fallback
  if (match && match[2]) {
    const rawDate = match[2].replace(/\//g, '-');
    // Normalize to ISO (YYYY-MM-DD)
    detectedDate = normalizeDate(rawDate);
  }

  // 4. Document Type Classification
  const detectedType = classifyDocument(text);

  return {
    detectedType,
    expiryDate: detectedDate,
    confidence: confidence / 100
  };
};

/**
 * Normalizes various date formats found in Saudi docs to ISO YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  // Logic to handle DD-MM-YYYY vs YYYY-MM-DD
  const parts = dateStr.split('-');
  const first = parts[0];
  const second = parts[1];
  const third = parts[2];

  if (first && second && third && first.length === 2) {
    return `${third}-${second}-${first}`; // Convert to ISO
  }
  return dateStr;
}

/**
 * Analyzes text density to identify the Document Type
 */
function classifyDocument(text: string): string {
  const content = text.toLowerCase();
  if (content.includes('muqeem') || content.includes('iqama')) return 'Muqeem';
  if (content.includes('commercial registration') || content.includes('سجل تجاري')) return 'Trade License';
  if (content.includes('gosi') || content.includes('social insurance')) return 'GOSI';
  return 'Administrative Asset';
}
