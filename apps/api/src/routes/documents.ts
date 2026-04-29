import type { MultipartFile } from "@fastify/multipart";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { ZodError, z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  documentTypes,
  documents,
  documentVersions,
  entities,
} from "@vaxis/db/schema";

import {
  createDocumentRecord,
  DocumentServiceError,
  isDocumentServiceError,
  replaceDocumentVersion,
} from "../lib/document-service";
import {
  deriveDocumentStatusFromExpiry,
  getDaysRemaining,
} from "../lib/governance";
import {
  canAccessTenantDocumentFile,
  canAccessTenantDocumentVersionFile,
} from "../lib/document-access";
import {
  approveOcrExtraction,
  approveOcrSchema,
  createOcrExtractionForDocument,
  listDocumentOcrExtractions,
  retryOcrExtraction,
} from "../lib/ocr";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";
import { extractDocumentIntelligence } from "../services/extractor.service";
import {
  loadStoredFileBuffer,
  persistMultipartFile,
  removeStoredFile,
} from "../lib/vault";

const documentListQuerySchema = z.object({
  entityId: z.string().uuid().optional(),
});

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

const documentRegistrationSchema = z.object({
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
});

const replaceVersionSchema = z.object({
  title: z.preprocess(
    emptyStringToNull,
    z.string().trim().min(2).max(500).nullable().optional(),
  ),
  issueDate: nullableDate,
  expiryDate: nullableDate,
  notes: nullableShortText(4000),
});

const documentParamsSchema = z.object({
  documentId: z.string().uuid(),
});

const documentVersionParamsSchema = z.object({
  documentId: z.string().uuid(),
  versionNumber: z.coerce.number().int().positive(),
});

const criticalMasterSchema = z.object({
  isCriticalMaster: z.boolean(),
});

const ocrParamsSchema = z.object({
  ocrExtractionId: z.string().uuid(),
});

function normalizeUserAgent(userAgent: string | string[] | undefined) {
  return Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
}

function toAttachmentFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
}

function sendDocumentError(reply: FastifyReply, error: unknown) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "INVALID_DOCUMENT_INPUT",
      message: error.issues[0]?.message ?? "The document request was invalid.",
      details: error.issues,
    });
  }

  if (isDocumentServiceError(error)) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  return reply.code(500).send({
    error: "DOCUMENT_REQUEST_FAILED",
    message:
      error instanceof Error
        ? error.message
        : "Unable to process this document request.",
  });
}

async function readMultipartPayload(request: FastifyRequest) {
  const fields: Record<string, string> = {};
  let file: MultipartFile | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (file) {
        part.file.resume();
        throw new DocumentServiceError(
          400,
          "MULTIPLE_FILES_NOT_SUPPORTED",
          "Only one file can be uploaded per request.",
        );
      }

      file = part;
      continue;
    }

    fields[part.fieldname] = String(part.value);
  }

  return {
    fields,
    file,
  };
}

async function readMultipartFileBuffer(file: MultipartFile) {
  const chunks: Buffer[] = [];

  for await (const chunk of file.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/document-types", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const types = await db
      .select()
      .from(documentTypes)
      .where(
        or(
          eq(documentTypes.tenantId, request.user.tenantId),
          isNull(documentTypes.tenantId),
        ),
      )
      .orderBy(asc(documentTypes.code));

    return {
      documentTypes: types,
    };
  });

  fastify.get("/api/v1/documents", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const query = documentListQuerySchema.parse(request.query);

    const [documentRows, typeRows, entityRows, versionRows] = await Promise.all(
      [
        db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, request.user.tenantId),
              query.entityId
                ? eq(documents.entityId, query.entityId)
                : undefined,
              isNull(documents.deletedAt),
            ),
          ),
        db
          .select()
          .from(documentTypes)
          .where(
            or(
              eq(documentTypes.tenantId, request.user.tenantId),
              isNull(documentTypes.tenantId),
            ),
          ),
        db
          .select()
          .from(entities)
          .where(eq(entities.tenantId, request.user.tenantId)),
        db
          .select({
            documentId: documentVersions.documentId,
            versionNumber: documentVersions.versionNumber,
          })
          .from(documentVersions)
          .where(eq(documentVersions.tenantId, request.user.tenantId)),
      ],
    );

    const typeMap = new Map(typeRows.map((type) => [type.id, type]));
    const entityMap = new Map(entityRows.map((entity) => [entity.id, entity]));
    const latestVersionMap = new Map<string, number>();

    for (const version of versionRows) {
      const currentVersion = latestVersionMap.get(version.documentId) ?? 0;
      latestVersionMap.set(
        version.documentId,
        Math.max(currentVersion, version.versionNumber),
      );
    }

    return {
      documents: documentRows
        .map((document) => {
          const type = typeMap.get(document.documentTypeId);
          const entity = entityMap.get(document.entityId);
          const derivedStatus =
            document.status === "ARCHIVED"
              ? "ARCHIVED"
              : deriveDocumentStatusFromExpiry(document.expiryDate);

          return {
            ...document,
            derivedStatus,
            daysRemaining: getDaysRemaining(document.expiryDate),
            documentTypeLabel: type?.label ?? "Unknown",
            sector: type?.sector ?? "INTERNAL",
            entityName: entity?.entityName ?? "Unknown entity",
            latestVersionNumber: latestVersionMap.get(document.id) ?? 0,
          };
        })
        .sort((left, right) => {
          if (!left.expiryDate && !right.expiryDate) {
            return left.title.localeCompare(right.title);
          }

          if (!left.expiryDate) {
            return 1;
          }

          if (!right.expiryDate) {
            return -1;
          }

          return left.expiryDate.localeCompare(right.expiryDate);
        }),
    };
  });

  fastify.post("/api/v1/documents/register", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    try {
      const input = documentRegistrationSchema.parse(request.body);
      const result = await createDocumentRecord({
        ...input,
        tenantId: request.user.tenantId,
        createdBy: request.user.sub,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
      });

      return reply.code(201).send({
        message: "Document registered.",
        document: result.document,
        riskSnapshot: result.riskSnapshot,
      });
    } catch (error) {
      return sendDocumentError(reply, error);
    }
  });

  fastify.post("/api/v1/documents/upload", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    if (!request.isMultipart()) {
      return reply.code(415).send({
        error: "MULTIPART_REQUIRED",
        message: "Use multipart/form-data to upload a document file.",
      });
    }

    let storedFile:
      | Awaited<ReturnType<typeof persistMultipartFile>>
      | undefined;

    try {
      const { fields, file } = await readMultipartPayload(request);

      if (!file) {
        return reply.code(400).send({
          error: "FILE_REQUIRED",
          message: "Select a file to upload.",
        });
      }

      const input = documentRegistrationSchema.parse(fields);

      storedFile = await persistMultipartFile({
        file,
        tenantId: request.user.tenantId,
        entityId: input.entityId,
      });

      const result = await createDocumentRecord({
        ...input,
        tenantId: request.user.tenantId,
        createdBy: request.user.sub,
        file: storedFile,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
      });

      const ocr = await createOcrExtractionForDocument({
        tenantId: request.user.tenantId,
        documentId: result.document.id,
        requestedBy: request.user.sub,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
      });

      return reply.code(201).send({
        message: "Document uploaded to the vault.",
        document: result.document,
        riskSnapshot: result.riskSnapshot,
        ocr,
      });
    } catch (error) {
      if (storedFile) {
        await removeStoredFile(storedFile.relativePath).catch(() => undefined);
      }

      return sendDocumentError(reply, error);
    }
  });

  fastify.post("/api/v1/documents/ocr-preview", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    if (!request.isMultipart()) {
      return reply.code(415).send({
        error: "MULTIPART_REQUIRED",
        message: "Use multipart/form-data to preview OCR extraction.",
      });
    }

    try {
      const { file } = await readMultipartPayload(request);

      if (!file) {
        return reply.code(400).send({
          error: "FILE_REQUIRED",
          message: "Select a PDF, PNG, JPEG, or JPG file for OCR preview.",
        });
      }

      const isSupported =
        file.mimetype === "application/pdf" ||
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpeg" ||
        /\.(pdf|png|jpe?g)$/i.test(file.filename);

      if (!isSupported) {
        file.file.resume();
        return reply.code(415).send({
          error: "UNSUPPORTED_OCR_FILE_TYPE",
          message: "OCR preview supports PDF, PNG, JPEG, and JPG files.",
        });
      }

      const fileBuffer = await readMultipartFileBuffer(file);
      const ocr = await extractDocumentIntelligence({
        fileBuffer,
        filename: file.filename,
        mimeType: file.mimetype,
      });

      return {
        message: ocr.requiresReview
          ? "OCR preview completed and requires review."
          : "OCR preview completed.",
        ocr,
      };
    } catch (error) {
      return sendDocumentError(reply, error);
    }
  });

  fastify.post(
    "/api/v1/documents/:documentId/versions",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "DOCUMENT_MANAGE")) {
        return;
      }

      if (!request.isMultipart()) {
        return reply.code(415).send({
          error: "MULTIPART_REQUIRED",
          message: "Use multipart/form-data to upload a replacement file.",
        });
      }

      const { documentId } = documentParamsSchema.parse(request.params);
      const [document] = await db
        .select({
          id: documents.id,
          entityId: documents.entityId,
        })
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.tenantId, request.user.tenantId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);

      if (!document) {
        return reply.code(404).send({
          error: "DOCUMENT_NOT_FOUND",
          message: "The document was not found in this tenant.",
        });
      }

      let storedFile:
        | Awaited<ReturnType<typeof persistMultipartFile>>
        | undefined;

      try {
        const { fields, file } = await readMultipartPayload(request);

        if (!file) {
          return reply.code(400).send({
            error: "FILE_REQUIRED",
            message: "Select a file to upload.",
          });
        }

        const input = replaceVersionSchema.parse(fields);

        storedFile = await persistMultipartFile({
          file,
          tenantId: request.user.tenantId,
          entityId: document.entityId,
          documentId,
        });

        const result = await replaceDocumentVersion({
          ...input,
          tenantId: request.user.tenantId,
          documentId,
          updatedBy: request.user.sub,
          file: storedFile,
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"]),
        });

        const ocr = await createOcrExtractionForDocument({
          tenantId: request.user.tenantId,
          documentId,
          requestedBy: request.user.sub,
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"]),
        });

        return reply.code(201).send({
          message: "Document version uploaded.",
          document: result.document,
          riskSnapshot: result.riskSnapshot,
          versionNumber: result.versionNumber,
          ocr,
        });
      } catch (error) {
        if (storedFile) {
          await removeStoredFile(storedFile.relativePath).catch(
            () => undefined,
          );
        }

        return sendDocumentError(reply, error);
      }
    },
  );

  fastify.get(
    "/api/v1/documents/:documentId/versions",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      const { documentId } = documentParamsSchema.parse(request.params);

      const versions = await db
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.tenantId, request.user.tenantId),
          ),
        )
        .orderBy(desc(documentVersions.versionNumber));

      return {
        versions,
      };
    },
  );

  fastify.get(
    "/api/v1/documents/:documentId/file",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      const { documentId } = documentParamsSchema.parse(request.params);
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.tenantId, request.user.tenantId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);

      if (!canAccessTenantDocumentFile(document, request.user.tenantId)) {
        return reply.code(404).send({
          error: "DOCUMENT_FILE_NOT_FOUND",
          message: "No stored file is available for this document.",
        });
      }

      const authorizedDocument = document as typeof document & {
        filePath: string;
      };
      const fileBuffer = await loadStoredFileBuffer(authorizedDocument.filePath);

      return reply
        .header(
          "content-type",
          authorizedDocument.fileMimeType ?? "application/octet-stream",
        )
        .header(
          "content-disposition",
          `attachment; filename="${toAttachmentFilename(authorizedDocument.title)}"`,
        )
        .header("cache-control", "private, no-store")
        .send(fileBuffer);
    },
  );

  fastify.get(
    "/api/v1/documents/:documentId/versions/:versionNumber/file",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      const { documentId, versionNumber } = documentVersionParamsSchema.parse(
        request.params,
      );
      const [document] = await db
        .select({ id: documents.id, title: documents.title })
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.tenantId, request.user.tenantId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);

      if (!document) {
        return reply.code(404).send({
          error: "DOCUMENT_NOT_FOUND",
          message: "The document was not found in this tenant.",
        });
      }

      const [version] = await db
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.tenantId, request.user.tenantId),
            eq(documentVersions.versionNumber, versionNumber),
          ),
        )
        .limit(1);

      if (!canAccessTenantDocumentVersionFile(version, request.user.tenantId)) {
        return reply.code(404).send({
          error: "DOCUMENT_VERSION_NOT_FOUND",
          message: "The requested document version was not found.",
        });
      }

      const authorizedVersion = version as typeof version & {
        filePath: string;
      };
      const fileBuffer = await loadStoredFileBuffer(authorizedVersion.filePath);

      return reply
        .header(
          "content-type",
          authorizedVersion.fileMimeType ?? "application/octet-stream",
        )
        .header(
          "content-disposition",
          `attachment; filename="${toAttachmentFilename(`${document.title}-v${authorizedVersion.versionNumber}`)}"`,
        )
        .header("cache-control", "private, no-store")
        .send(fileBuffer);
    },
  );

  fastify.get(
    "/api/v1/documents/:documentId/ocr",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      const { documentId } = documentParamsSchema.parse(request.params);
      const ocrExtractions = await listDocumentOcrExtractions({
        tenantId: request.user.tenantId,
        documentId,
      });

      return {
        ocrExtractions,
      };
    },
  );

  fastify.post(
    "/api/v1/ocr-extractions/:ocrExtractionId/retry",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "DOCUMENT_MANAGE")) {
        return;
      }

      try {
        const { ocrExtractionId } = ocrParamsSchema.parse(request.params);
        const ocr = await retryOcrExtraction({
          tenantId: request.user.tenantId,
          ocrExtractionId,
          requestedBy: request.user.sub,
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"]),
        });

        return {
          message: "OCR extraction queued for retry.",
          ocr,
        };
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  fastify.post(
    "/api/v1/ocr-extractions/:ocrExtractionId/approve",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "DOCUMENT_MANAGE")) {
        return;
      }

      try {
        const { ocrExtractionId } = ocrParamsSchema.parse(request.params);
        const input = approveOcrSchema.parse(request.body);
        const result = await approveOcrExtraction({
          tenantId: request.user.tenantId,
          ocrExtractionId,
          approvedBy: request.user.sub,
          fields: input.fields,
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"]),
        });

        return {
          message: "OCR values approved and applied to the document registry.",
          ...result,
        };
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  fastify.patch(
    "/api/v1/documents/:documentId/critical-master",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "DOCUMENT_MANAGE")) {
        return;
      }

      const { documentId } = documentParamsSchema.parse(request.params);
      const input = criticalMasterSchema.parse(request.body);

      const [updated] = await db
        .update(documents)
        .set({
          isCriticalMaster: input.isCriticalMaster,
          updatedBy: request.user.sub,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.tenantId, request.user.tenantId),
            isNull(documents.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        return reply.code(404).send({
          error: "DOCUMENT_NOT_FOUND",
          message: "The document was not found in this tenant.",
        });
      }

      const [latestVersion] = await db
        .select({
          versionNumber: documentVersions.versionNumber,
        })
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.tenantId, request.user.tenantId),
          ),
        )
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);

      await db.insert(auditLogs).values({
        tenantId: request.user.tenantId,
        userId: request.user.sub,
        eventType: "document.critical_master_marked",
        resourceType: "DOCUMENT",
        resourceId: updated.id,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
        metadata: {
          isCriticalMaster: input.isCriticalMaster,
        },
      });

      return {
        message: input.isCriticalMaster
          ? "Document marked as a critical master record."
          : "Document removed from the critical master set.",
        document: {
          ...updated,
          derivedStatus:
            updated.status === "ARCHIVED"
              ? "ARCHIVED"
              : deriveDocumentStatusFromExpiry(updated.expiryDate),
          daysRemaining: getDaysRemaining(updated.expiryDate),
          latestVersionNumber: latestVersion?.versionNumber ?? 0,
        },
      };
    },
  );
};
