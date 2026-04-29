import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  documents,
  ocrExtractions,
} from "@vaxis/db/schema";

import { apiEnv } from "../config";
import { extractDocumentIntelligence } from "../services/extractor.service";
import {
  markAutomationJobCompleted,
  markAutomationJobFailed,
} from "./automation";
import {
  deriveDocumentStatusFromExpiry,
  getDaysRemaining,
  refreshEntityGovernance,
} from "./governance";
import { enqueueOcrJob, type OcrJobData } from "./jobs";
import { loadStoredFileBuffer } from "./vault";

const correctedFieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(["READY", "LOW_CONFIDENCE"]).optional(),
  source: z.enum(["label", "pattern", "generic", "user"]).optional(),
});

export const approveOcrSchema = z.object({
  fields: z.array(correctedFieldSchema).min(1),
});

export type ApproveOcrInput = z.infer<typeof approveOcrSchema>;

export async function listDocumentOcrExtractions(input: {
  tenantId: string;
  documentId: string;
}) {
  return db
    .select()
    .from(ocrExtractions)
    .where(
      and(
        eq(ocrExtractions.tenantId, input.tenantId),
        eq(ocrExtractions.documentId, input.documentId),
      ),
    )
    .orderBy(desc(ocrExtractions.createdAt));
}

export async function createOcrExtractionForDocument(input: {
  tenantId: string;
  documentId: string;
  requestedBy: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}) {
  const document = await loadTenantDocument(input);
  const [extraction] = await db
    .insert(ocrExtractions)
    .values({
      tenantId: input.tenantId,
      documentId: input.documentId,
      status: "QUEUED",
      queuedBy: input.requestedBy,
    })
    .returning();

  if (!extraction) {
    throw new Error("Unable to queue OCR extraction.");
  }

  await db.insert(auditLogs).values({
    tenantId: input.tenantId,
    userId: input.requestedBy,
    eventType: "document.ocr.queued",
    resourceType: "DOCUMENT",
    resourceId: input.documentId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      ocrExtractionId: extraction.id,
      filePath: document.filePath,
    },
  });

  const payload: OcrJobData = {
    tenantId: input.tenantId,
    documentId: input.documentId,
    ocrExtractionId: extraction.id,
    requestedBy: input.requestedBy,
  };

  if (apiEnv.JOB_DELIVERY_MODE === "QUEUE") {
    await enqueueOcrJob(payload).catch(async (error) => {
      await markOcrQueueFailure({
        tenantId: input.tenantId,
        documentId: input.documentId,
        ocrExtractionId: extraction.id,
        requestedBy: input.requestedBy,
        error,
      });
    });
  } else {
    void processOcrJob({
      automationJobId: null,
      payload,
    });
  }

  return extraction;
}

export async function retryOcrExtraction(input: {
  tenantId: string;
  ocrExtractionId: string;
  requestedBy: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}) {
  const extraction = await loadTenantExtraction(input);

  if (!["FAILED", "NEEDS_REVIEW"].includes(extraction.status)) {
    return extraction;
  }

  const [updated] = await db
    .update(ocrExtractions)
    .set({
      status: "QUEUED",
      error: null,
      queuedBy: input.requestedBy,
      updatedAt: new Date(),
    })
    .where(eq(ocrExtractions.id, extraction.id))
    .returning();

  await db.insert(auditLogs).values({
    tenantId: input.tenantId,
    userId: input.requestedBy,
    eventType: "document.ocr.retried",
    resourceType: "DOCUMENT",
    resourceId: extraction.documentId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      ocrExtractionId: extraction.id,
    },
  });

  const payload: OcrJobData = {
    tenantId: input.tenantId,
    documentId: extraction.documentId,
    ocrExtractionId: extraction.id,
    requestedBy: input.requestedBy,
  };

  if (apiEnv.JOB_DELIVERY_MODE === "QUEUE") {
    await enqueueOcrJob(payload).catch(async (error) => {
      await markOcrQueueFailure({
        tenantId: input.tenantId,
        documentId: extraction.documentId,
        ocrExtractionId: extraction.id,
        requestedBy: input.requestedBy,
        error,
      });
    });
  } else {
    void processOcrJob({
      automationJobId: null,
      payload,
    });
  }

  return updated ?? extraction;
}

export async function processOcrJob(input: {
  automationJobId: string | null;
  payload: OcrJobData;
  attemptsMade?: number;
}) {
  const { payload } = input;

  await db
    .update(ocrExtractions)
    .set({
      status: "PROCESSING",
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(ocrExtractions.id, payload.ocrExtractionId));

  try {
    const document = await loadTenantDocument(payload);

    if (!document.filePath) {
      throw new Error("Document has no stored file path for OCR.");
    }

    const fileBuffer = await loadStoredFileBuffer(document.filePath);
    const fileContext = document.fileMimeType
      ? { mimeType: document.fileMimeType }
      : {};
    const result = await extractDocumentIntelligence({
      fileBuffer,
      filename: document.title,
      ...fileContext,
    });
    const status = result.requiresReview ? "NEEDS_REVIEW" : "READY";

    await db
      .update(ocrExtractions)
      .set({
        status,
        engine: result.engine,
        documentKind: result.documentKind,
        documentTypeLabel: result.documentTypeLabel,
        overallConfidence: result.overallConfidence.toString(),
        languageHints: result.languageHints,
        rawText: result.rawText,
        fields: result.fields as unknown as Array<Record<string, unknown>>,
        missingRequiredFields: result.missingRequiredFields,
        warnings: result.warnings,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(ocrExtractions.id, payload.ocrExtractionId));

    await db.insert(auditLogs).values({
      tenantId: payload.tenantId,
      userId: payload.requestedBy ?? null,
      eventType: "document.ocr.completed",
      resourceType: "DOCUMENT",
      resourceId: payload.documentId,
      metadata: {
        ocrExtractionId: payload.ocrExtractionId,
        status,
        documentKind: result.documentKind,
        confidence: result.overallConfidence,
        fieldCount: result.fields.length,
      },
    });

    if (input.automationJobId) {
      await markAutomationJobCompleted({
        queueJobId: input.automationJobId,
        attemptsMade: input.attemptsMade ?? 1,
        resultSummary: {
          status,
          fieldCount: result.fields.length,
          confidence: result.overallConfidence,
        },
      });
    }

    return result;
  } catch (error) {
    await db
      .update(ocrExtractions)
      .set({
        status: "FAILED",
        error: error instanceof Error ? error.message : "OCR processing failed.",
        updatedAt: new Date(),
      })
      .where(eq(ocrExtractions.id, payload.ocrExtractionId));

    await db.insert(auditLogs).values({
      tenantId: payload.tenantId,
      userId: payload.requestedBy ?? null,
      eventType: "document.ocr.failed",
      resourceType: "DOCUMENT",
      resourceId: payload.documentId,
      metadata: {
        ocrExtractionId: payload.ocrExtractionId,
        error: error instanceof Error ? error.message : "OCR processing failed.",
      },
    });

    if (input.automationJobId) {
      await markAutomationJobFailed({
        queueJobId: input.automationJobId,
        attemptsMade: input.attemptsMade ?? 1,
        error,
      });
    }

    throw error;
  }
}

export async function approveOcrExtraction(input: {
  tenantId: string;
  ocrExtractionId: string;
  approvedBy: string;
  fields: ApproveOcrInput["fields"];
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}) {
  const extraction = await loadTenantExtraction(input);
  const normalizedFields = input.fields.map((field) => ({
    ...field,
    confidence: field.confidence ?? 1,
    status: field.status ?? "READY",
    source: field.source ?? "user",
  }));
  const metadata = mapFieldsToDocumentMetadata(normalizedFields);
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, extraction.documentId),
        eq(documents.tenantId, input.tenantId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!document) {
    throw new Error("The document was not found in this tenant.");
  }

  const nextExpiryDate = metadata.expiryDate ?? document.expiryDate;
  const derivedStatus = deriveDocumentStatusFromExpiry(nextExpiryDate);
  const [updatedDocument] = await db
    .update(documents)
    .set({
      title: metadata.title ?? document.title,
      crNumber: metadata.crNumber ?? document.crNumber,
      companyIdentifier:
        metadata.companyIdentifier ?? document.companyIdentifier,
      issueDate: metadata.issueDate ?? document.issueDate,
      expiryDate: metadata.expiryDate ?? document.expiryDate,
      status: derivedStatus,
      updatedBy: input.approvedBy,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, document.id))
    .returning();

  await db
    .update(ocrExtractions)
    .set({
      status: "APPROVED",
      fields: normalizedFields as unknown as Array<Record<string, unknown>>,
      reviewedBy: input.approvedBy,
      approvedBy: input.approvedBy,
      reviewedAt: new Date(),
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ocrExtractions.id, extraction.id));

  await db.insert(auditLogs).values({
    tenantId: input.tenantId,
    userId: input.approvedBy,
    eventType: "document.ocr.approved",
    resourceType: "DOCUMENT",
    resourceId: document.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      ocrExtractionId: extraction.id,
      appliedMetadata: metadata,
      fieldCount: normalizedFields.length,
    },
  });

  const riskSnapshot = await refreshEntityGovernance({
    tenantId: input.tenantId,
    entityId: document.entityId,
  });

  return {
    document: updatedDocument
      ? {
          ...updatedDocument,
          derivedStatus,
          daysRemaining: getDaysRemaining(updatedDocument.expiryDate),
        }
      : null,
    riskSnapshot,
  };
}

async function loadTenantDocument(input: {
  tenantId: string;
  documentId: string;
}) {
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.tenantId, input.tenantId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!document) {
    throw new Error("The document was not found in this tenant.");
  }

  return document;
}

async function loadTenantExtraction(input: {
  tenantId: string;
  ocrExtractionId: string;
}) {
  const [extraction] = await db
    .select()
    .from(ocrExtractions)
    .where(
      and(
        eq(ocrExtractions.id, input.ocrExtractionId),
        eq(ocrExtractions.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  if (!extraction) {
    throw new Error("The OCR extraction was not found in this tenant.");
  }

  return extraction;
}

function mapFieldsToDocumentMetadata(
  fields: Array<{ key: string; label: string; value: string }>,
) {
  const byKey = new Map(fields.map((field) => [field.key, field.value]));
  const byLabel = new Map(
    fields.map((field) => [field.label.toLowerCase(), field.value]),
  );
  const pick = (...keys: string[]) =>
    keys.map((key) => byKey.get(key) ?? byLabel.get(key.toLowerCase())).find(Boolean);

  return {
    title: pick("title", "companyName", "taxpayerName", "establishmentName"),
    crNumber: pick(
      "crNumber",
      "supplierCrNumber",
      "registrationNumber",
      "crLicenseContractNumber",
      "headQuarterCr",
    ),
    companyIdentifier: pick(
      "unifiedNationalNumber",
      "entityUnifiedNumber",
      "vatRegistrationNumber",
      "uniqueNumber",
      "iqamaNumber",
      "idNumber",
      "certificateNumber",
      "policyNumber",
    ),
    issueDate: normalizeDateForDb(
      pick("issueDate", "issuanceDate", "date", "dateGregorian"),
    ),
    expiryDate: normalizeDateForDb(
      pick(
        "expiryDate",
        "expiryDateGregorian",
        "dateOfExpiry",
        "firstFilingDueDate",
      ),
    ),
  };
}

function normalizeDateForDb(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/,
  );

  if (!match) {
    return undefined;
  }

  if (match[1] && match[2] && match[3]) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  const year = match[6]?.length === 2 ? `20${match[6]}` : match[6];

  if (year && match[5] && match[4]) {
    return `${year}-${match[5].padStart(2, "0")}-${match[4].padStart(2, "0")}`;
  }

  return undefined;
}

async function markOcrQueueFailure(input: {
  tenantId: string;
  documentId: string;
  ocrExtractionId: string;
  requestedBy: string;
  error: unknown;
}) {
  const message =
    input.error instanceof Error
      ? input.error.message
      : "Unable to queue OCR extraction.";

  await db
    .update(ocrExtractions)
    .set({
      status: "FAILED",
      error: message,
      updatedAt: new Date(),
    })
    .where(eq(ocrExtractions.id, input.ocrExtractionId));

  await db.insert(auditLogs).values({
    tenantId: input.tenantId,
    userId: input.requestedBy,
    eventType: "document.ocr.failed",
    resourceType: "DOCUMENT",
    resourceId: input.documentId,
    metadata: {
      ocrExtractionId: input.ocrExtractionId,
      error: message,
    },
  });
}
