import { and, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  categories,
  documentTypes,
  documents,
  documentVersions,
  entities,
} from "@vaxis/db/schema";
import { toDnaCode } from "@vaxis/domain";

import {
  deriveDocumentStatusFromExpiry,
  getDaysRemaining,
  refreshEntityGovernance,
} from "./governance";

function emptyStringToNull(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized === "" ? null : normalized;
  }

  return value;
}

const nullableShortText = (maxLength: number) =>
  z.preprocess(
    emptyStringToNull,
    z.string().max(maxLength).nullable().optional(),
  );

const nullableDate = z.preprocess(
  emptyStringToNull,
  z.string().date().nullable().optional(),
);

const nullableNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    const normalized = emptyStringToNull(value);

    if (normalized === null || normalized === undefined) {
      return normalized;
    }

    if (typeof normalized === "string") {
      return Number(normalized);
    }

    return normalized;
  }, schema.nullable().optional());

const nullableBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const documentMetadataSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  documentTypeId: z.string().uuid(),
  title: z.string().trim().min(2).max(500),
  crNumber: nullableShortText(50),
  chamberNumber: nullableShortText(50),
  companyIdentifier: nullableShortText(100),
  costAmount: nullableNumber(z.number().nonnegative()),
  durationYears: nullableNumber(z.number().positive().max(99)),
  issueDate: nullableDate,
  expiryDate: nullableDate,
  notes: nullableShortText(4000),
  isCriticalMaster: nullableBoolean,
  createdBy: z.string().uuid(),
});

const replaceMetadataSchema = z.object({
  tenantId: z.string().uuid(),
  documentId: z.string().uuid(),
  updatedBy: z.string().uuid(),
  title: z.preprocess(
    emptyStringToNull,
    z.string().trim().min(2).max(500).nullable().optional(),
  ),
  issueDate: nullableDate,
  expiryDate: nullableDate,
  notes: nullableShortText(4000),
});

export type StoredFileDescriptor = {
  relativePath: string;
  fileMimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
};

export class DocumentServiceError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

export function isDocumentServiceError(
  error: unknown,
): error is DocumentServiceError {
  return error instanceof DocumentServiceError;
}

function parseDateInput(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function createDocumentRecord(
  input: z.infer<typeof documentMetadataSchema> & {
    file?: StoredFileDescriptor | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
  },
) {
  const values = documentMetadataSchema.parse(input);
  const issueDate = parseDateInput(values.issueDate);
  const expiryDate = parseDateInput(values.expiryDate);

  if (issueDate && issueDate > new Date()) {
    throw new DocumentServiceError(
      400,
      "INVALID_ISSUE_DATE",
      "Issue date cannot be in the future.",
    );
  }

  if (issueDate && expiryDate && expiryDate <= issueDate) {
    throw new DocumentServiceError(
      400,
      "INVALID_EXPIRY_DATE",
      "Expiry date must be after issue date.",
    );
  }

  const [entity] = await db
    .select({
      id: entities.id,
      categoryId: entities.categoryId,
      entityCode: entities.entityCode,
      subDesignator: entities.subDesignator,
    })
    .from(entities)
    .where(
      and(
        eq(entities.id, values.entityId),
        eq(entities.tenantId, values.tenantId),
      ),
    )
    .limit(1);

  if (!entity) {
    throw new DocumentServiceError(
      404,
      "ENTITY_NOT_FOUND",
      "The selected entity was not found in this tenant.",
    );
  }

  const [category] = await db
    .select({
      slotNumber: categories.slotNumber,
    })
    .from(categories)
    .where(
      and(
        eq(categories.id, entity.categoryId),
        eq(categories.tenantId, values.tenantId),
      ),
    )
    .limit(1);

  if (!category) {
    throw new DocumentServiceError(
      404,
      "CATEGORY_NOT_FOUND",
      "Unable to resolve the category for this entity.",
    );
  }

  const [documentType] = await db
    .select()
    .from(documentTypes)
    .where(
      and(
        eq(documentTypes.id, values.documentTypeId),
        or(
          eq(documentTypes.tenantId, values.tenantId),
          isNull(documentTypes.tenantId),
        ),
      ),
    )
    .limit(1);

  if (!documentType) {
    throw new DocumentServiceError(
      404,
      "DOCUMENT_TYPE_NOT_FOUND",
      "The selected document type was not found.",
    );
  }

  if (documentType.requiresCr && !values.crNumber) {
    throw new DocumentServiceError(
      400,
      "CR_NUMBER_REQUIRED",
      "CR number is required for this document type.",
    );
  }

  if (documentType.requiresExpiry && !expiryDate) {
    throw new DocumentServiceError(
      400,
      "EXPIRY_REQUIRED",
      "Expiry date is required for this document type.",
    );
  }

  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const nextYearStart = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const yearDocuments = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, values.tenantId),
        eq(documents.entityId, values.entityId),
        gte(documents.createdAt, yearStart),
        lt(documents.createdAt, nextYearStart),
        isNull(documents.deletedAt),
      ),
    );

  const dnaCode = toDnaCode({
    categorySlot: category.slotNumber,
    subDesignator: entity.subDesignator,
    entityCode: entity.entityCode,
    year,
    sequence: yearDocuments.length + 1,
  });

  const derivedStatus = expiryDate
    ? deriveDocumentStatusFromExpiry(expiryDate)
    : "ACTIVE";

  const [document] = await db
    .insert(documents)
    .values({
      tenantId: values.tenantId,
      entityId: values.entityId,
      dnaCode,
      documentTypeId: values.documentTypeId,
      title: values.title,
      crNumber: values.crNumber ?? null,
      chamberNumber: values.chamberNumber ?? null,
      companyIdentifier: values.companyIdentifier ?? null,
      costAmount: values.costAmount?.toString() ?? null,
      durationYears: values.durationYears?.toString() ?? null,
      issueDate: values.issueDate ?? null,
      expiryDate: values.expiryDate ?? null,
      status: derivedStatus,
      notes: values.notes ?? null,
      filePath: input.file?.relativePath ?? null,
      fileMimeType: input.file?.fileMimeType ?? null,
      fileSizeBytes: input.file?.fileSizeBytes ?? null,
      checksumSha256: input.file?.checksumSha256 ?? null,
      isCriticalMaster: values.isCriticalMaster ?? false,
      createdBy: values.createdBy,
      updatedBy: values.createdBy,
    })
    .returning();

  if (!document) {
    throw new DocumentServiceError(
      500,
      "DOCUMENT_CREATE_FAILED",
      "Unable to register the document.",
    );
  }

  if (input.file) {
    await db.insert(documentVersions).values({
      tenantId: values.tenantId,
      documentId: document.id,
      versionNumber: 1,
      filePath: input.file.relativePath,
      fileMimeType: input.file.fileMimeType,
      fileSizeBytes: input.file.fileSizeBytes,
      checksumSha256: input.file.checksumSha256,
      uploadedBy: values.createdBy,
    });
  }

  await db.insert(auditLogs).values({
    tenantId: values.tenantId,
    userId: values.createdBy,
    eventType: "document.uploaded",
    resourceType: "DOCUMENT",
    resourceId: document.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      dnaCode,
      entityId: values.entityId,
      documentTypeId: values.documentTypeId,
      storedFile: input.file?.relativePath ?? null,
    },
  });

  const riskSnapshot = await refreshEntityGovernance({
    tenantId: values.tenantId,
    entityId: values.entityId,
  });

  return {
    document: {
      ...document,
      derivedStatus,
      daysRemaining: getDaysRemaining(document.expiryDate),
      latestVersionNumber: input.file ? 1 : 0,
    },
    riskSnapshot,
  };
}

export async function replaceDocumentVersion(
  input: z.infer<typeof replaceMetadataSchema> & {
    file: StoredFileDescriptor;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
  },
) {
  const values = replaceMetadataSchema.parse(input);
  const issueDate = parseDateInput(values.issueDate);
  const expiryDate = parseDateInput(values.expiryDate);

  if (issueDate && issueDate > new Date()) {
    throw new DocumentServiceError(
      400,
      "INVALID_ISSUE_DATE",
      "Issue date cannot be in the future.",
    );
  }

  if (issueDate && expiryDate && expiryDate <= issueDate) {
    throw new DocumentServiceError(
      400,
      "INVALID_EXPIRY_DATE",
      "Expiry date must be after issue date.",
    );
  }

  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, values.documentId),
        eq(documents.tenantId, values.tenantId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!document) {
    throw new DocumentServiceError(
      404,
      "DOCUMENT_NOT_FOUND",
      "The document was not found in this tenant.",
    );
  }

  const [latestVersion] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, document.id),
        eq(documentVersions.tenantId, values.tenantId),
      ),
    )
    .orderBy(desc(documentVersions.versionNumber))
    .limit(1);

  const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;
  const derivedStatus = values.expiryDate
    ? deriveDocumentStatusFromExpiry(values.expiryDate)
    : deriveDocumentStatusFromExpiry(document.expiryDate);

  const [updatedDocument] = await db
    .update(documents)
    .set({
      title: values.title ?? document.title,
      issueDate:
        values.issueDate === undefined
          ? document.issueDate
          : (values.issueDate ?? null),
      expiryDate:
        values.expiryDate === undefined
          ? document.expiryDate
          : (values.expiryDate ?? null),
      notes:
        values.notes === undefined ? document.notes : (values.notes ?? null),
      status: derivedStatus,
      filePath: input.file.relativePath,
      fileMimeType: input.file.fileMimeType,
      fileSizeBytes: input.file.fileSizeBytes,
      checksumSha256: input.file.checksumSha256,
      updatedBy: values.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, document.id))
    .returning();

  if (!updatedDocument) {
    throw new DocumentServiceError(
      500,
      "DOCUMENT_UPDATE_FAILED",
      "Unable to update the document with the uploaded version.",
    );
  }

  await db.insert(documentVersions).values({
    tenantId: values.tenantId,
    documentId: document.id,
    versionNumber: nextVersion,
    filePath: input.file.relativePath,
    fileMimeType: input.file.fileMimeType,
    fileSizeBytes: input.file.fileSizeBytes,
    checksumSha256: input.file.checksumSha256,
    uploadedBy: values.updatedBy,
  });

  await db.insert(auditLogs).values({
    tenantId: values.tenantId,
    userId: values.updatedBy,
    eventType: "document.replaced",
    resourceType: "DOCUMENT",
    resourceId: document.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      versionNumber: nextVersion,
      storedFile: input.file.relativePath,
    },
  });

  const riskSnapshot = await refreshEntityGovernance({
    tenantId: values.tenantId,
    entityId: document.entityId,
  });

  return {
    document: {
      ...updatedDocument,
      derivedStatus,
      daysRemaining: getDaysRemaining(updatedDocument.expiryDate),
      latestVersionNumber: nextVersion,
    },
    riskSnapshot,
    versionNumber: nextVersion,
  };
}
