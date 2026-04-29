import { describe, expect, it } from "vitest";

import { analyzeOcrText, classifyOcrText } from "./ocr-intelligence";

describe("ocr intelligence", () => {
  it("classifies and extracts VAT certificate fields", () => {
    const result = analyzeOcrText({
      rawText: `
        VAT Registration Certificate
        Taxpayer Name: Palm Arabia Contracting LLC
        VAT Registration Number: 300000000000003
        Unique Number: 1234567890
        Issuance Date: 2026-01-04
        CR/License/Contract No.: 1010123456
      `,
      engineConfidence: 0.92,
    });

    expect(result.documentKind).toBe("VAT_CERTIFICATE");
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "taxpayerName",
          value: "Palm Arabia Contracting LLC",
        }),
        expect.objectContaining({
          key: "vatRegistrationNumber",
          value: "300000000000003",
        }),
      ]),
    );
    expect(result.overallConfidence).toBeGreaterThan(0.6);
  });

  it("classifies commercial registration from filename and extracts CR number", () => {
    const result = analyzeOcrText({
      filename: "PAC CrCertificate.pdf",
      rawText: `
        Ministry of Commerce
        Commercial Registration
        Company Name: PAC Industrial Services
        CR Number: 1010123456
        Expiry Date: 2027/09/30
      `,
      engineConfidence: 0.88,
    });

    expect(result.documentKind).toBe("COMMERCIAL_REGISTRATION");
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "crNumber", value: "1010123456" }),
        expect.objectContaining({ key: "expiryDate", value: "2027/09/30" }),
      ]),
    );
  });

  it("separates GOSI establishment and employee records", () => {
    expect(
      classifyOcrText("GOSI Social Insurance Subscription Number 12345"),
    ).toBe("GOSI_ESTABLISHMENT");
    expect(
      classifyOcrText("GOSI Social Insurance Joining Date Wages Coverage Type"),
    ).toBe("GOSI_EMPLOYEE");
  });

  it("marks weak generic extraction for review", () => {
    const result = analyzeOcrText({
      filename: "unknown-document.jpg",
      rawText: "Certificate\nAuthority of Something\nNo clear expiry shown",
      engineConfidence: 0.52,
    });

    expect(result.documentKind).toBe("GENERIC_ADMINISTRATIVE_ASSET");
    expect(result.requiresReview).toBe(true);
    expect(result.missingRequiredFields).toContain("Expiry Date");
  });
});
