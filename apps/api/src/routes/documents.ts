import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, gte, isNull, lt, or } from "drizzle-orm";
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
  syncEntityRiskScore,
} from "../lib/governance";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const documentListQuerySchema = z.object({
  entityId: z.string().uuid().optional(),
});

const documentRegistrationSchema = z.object({
  entityId: z.string().uuid(),
  documentTypeId: z.string().uuid(),
  title: z.string().min(2).max(500),
  crNumber: z.string().max(50).nullable().optional(),
  chamberNumber: z.string().max(50).nullable().optional(),
  companyIdentifier: z.string().max(100).nullable().optional(),
  costAmount: z.number().nonnegative().nullable().optional(),
  durationYears: z.number().positive().max(99).nullable().optional(),
  issueDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  filePath: z.string().max(2000).nullable().optional(),
  fileMimeType: z.string().max(100).nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .nullable()
    .optional(),
  isCriticalMaster: z.boolean().optional(),
});

function parseDateInput(value: string | null | undefined) {
  return value ? new Date(value) : null;
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

    const documentRows = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, request.user.tenantId),
          query.entityId ? eq(documents.entityId, query.entityId) : undefined,
          isNull(documents.deletedAt),
        ),
      );

    const typeRows = await db
      .select()
      .from(documentTypes)
      .where(
        or(
          eq(documentTypes.tenantId, request.user.tenantId),
          isNull(documentTypes.tenantId),
        ),
      );

    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, request.user.tenantId));

    const typeMap = new Map(typeRows.map((type) => [type.id, type]));
    const entityMap = new Map(entityRows.map((entity) => [entity.id, entity]));

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

    const input = documentRegistrationSchema.parse(request.body);
    const issueDate = parseDateInput(input.issueDate);
    const expiryDate = parseDateInput(input.expiryDate);

    if (issueDate && issueDate > new Date()) {
      return reply.code(400).send({
        error: "INVALID_ISSUE_DATE",
        message: "Issue date cannot be in the future.",
      });
    }

    if (issueDate && expiryDate && expiryDate <= issueDate) {
      return reply.code(400).send({
        error: "INVALID_EXPIRY_DATE",
        message: "Expiry date must be after issue date.",
      });
    }

    const [entity] = await db
      .select({
        id: entities.id,
        tenantId: entities.tenantId,
        categoryId: entities.categoryId,
        entityCode: entities.entityCode,
        subDesignator: entities.subDesignator,
      })
      .from(entities)
      .where(
        and(
          eq(entities.id, input.entityId),
          eq(entities.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!entity) {
      return reply.code(404).send({
        error: "ENTITY_NOT_FOUND",
        message: "The selected entity was not found in this tenant.",
      });
    }

    const [category] = await db
      .select({
        id: categories.id,
        slotNumber: categories.slotNumber,
      })
      .from(categories)
      .where(
        and(
          eq(categories.id, entity.categoryId),
          eq(categories.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!category) {
      return reply.code(404).send({
        error: "CATEGORY_NOT_FOUND",
        message: "Unable to resolve the category for this entity.",
      });
    }

    const [documentType] = await db
      .select()
      .from(documentTypes)
      .where(
        and(
          eq(documentTypes.id, input.documentTypeId),
          or(
            eq(documentTypes.tenantId, request.user.tenantId),
            isNull(documentTypes.tenantId),
          ),
        ),
      )
      .limit(1);

    if (!documentType) {
      return reply.code(404).send({
        error: "DOCUMENT_TYPE_NOT_FOUND",
        message: "The selected document type was not found.",
      });
    }

    if (documentType.requiresCr && !input.crNumber) {
      return reply.code(400).send({
        error: "CR_NUMBER_REQUIRED",
        message: "CR number is required for this document type.",
      });
    }

    if (documentType.requiresExpiry && !expiryDate) {
      return reply.code(400).send({
        error: "EXPIRY_REQUIRED",
        message: "Expiry date is required for this document type.",
      });
    }

    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const nextYearStart = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const yearDocuments = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, request.user.tenantId),
          eq(documents.entityId, entity.id),
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

    const [registeredDocument] = await db
      .insert(documents)
      .values({
        tenantId: request.user.tenantId,
        entityId: entity.id,
        dnaCode,
        documentTypeId: documentType.id,
        title: input.title,
        crNumber: input.crNumber ?? null,
        chamberNumber: input.chamberNumber ?? null,
        companyIdentifier: input.companyIdentifier ?? null,
        costAmount: input.costAmount?.toString() ?? null,
        durationYears: input.durationYears?.toString() ?? null,
        issueDate: input.issueDate ?? null,
        expiryDate: input.expiryDate ?? null,
        status: derivedStatus,
        notes: input.notes ?? null,
        filePath: input.filePath ?? null,
        fileMimeType: input.fileMimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        checksumSha256: input.checksumSha256 ?? null,
        isCriticalMaster: input.isCriticalMaster ?? false,
        createdBy: request.user.sub,
        updatedBy: request.user.sub,
      })
      .returning();

    if (!registeredDocument) {
      return reply.code(500).send({
        error: "DOCUMENT_CREATE_FAILED",
        message: "Unable to register the document.",
      });
    }

    if (input.filePath) {
      await db.insert(documentVersions).values({
        tenantId: request.user.tenantId,
        documentId: registeredDocument.id,
        versionNumber: 1,
        filePath: input.filePath,
        fileMimeType: input.fileMimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        checksumSha256: input.checksumSha256 ?? null,
        uploadedBy: request.user.sub,
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "document.uploaded",
      resourceType: "DOCUMENT",
      resourceId: registeredDocument.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        dnaCode,
        entityId: entity.id,
        documentTypeId: documentType.id,
      },
    });

    const riskSnapshot = await syncEntityRiskScore({
      tenantId: request.user.tenantId,
      entityId: entity.id,
    });

    return reply.code(201).send({
      message: "Document registered.",
      document: {
        ...registeredDocument,
        derivedStatus,
        daysRemaining: getDaysRemaining(registeredDocument.expiryDate),
      },
      riskSnapshot,
    });
  });
};
