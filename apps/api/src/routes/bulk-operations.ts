// apps/api/src/routes/bulk-operations.ts
// Bulk import/export operations for documents and entities

import type { FastifyPluginAsync } from "fastify";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

import { db } from "@vaxis/db";
import {
  auditLogs,
  categories,
  documentTypes,
  documents,
  entities,
} from "@vaxis/db/schema";
import { toDnaCode } from "@vaxis/domain";

import { ensureAuthenticated, ensurePermission } from "../lib/permissions";
import { refreshTenantGovernance } from "../lib/governance";

const importSchema = z.object({
  entityType: z.enum(["SUBSIDIARY", "JV", "ASSOCIATE", "BRANCH"]),
  categoryId: z.string().uuid().optional(),
  csvData: z.string().min(1),
});

const exportSchema = z.object({
  entityIds: z.array(z.string().uuid()).optional(),
  documentTypeIds: z.array(z.string().uuid()).optional(),
  format: z.enum(["csv", "json"]).default("csv"),
  includeExpired: z.boolean().default(true),
});

// CSV column mapping for documents
const documentCsvColumns = [
  { key: "dnaCode", label: "DNA Code" },
  { key: "entityName", label: "Entity Name" },
  { key: "entityCode", label: "Entity Code" },
  { key: "documentType", label: "Document Type" },
  { key: "title", label: "Title" },
  { key: "crNumber", label: "CR Number" },
  { key: "chamberNumber", label: "Chamber Number" },
  { key: "issueDate", label: "Issue Date (YYYY-MM-DD)" },
  { key: "expiryDate", label: "Expiry Date (YYYY-MM-DD)" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

// CSV column mapping for entities
const entityCsvColumns = [
  { key: "entityName", label: "Entity Name" },
  { key: "entityCode", label: "Entity Code" },
  { key: "entityType", label: "Entity Type" },
  { key: "category", label: "Category" },
  { key: "country", label: "Country" },
  { key: "registrationNumber", label: "Registration Number" },
  { key: "isActive", label: "Is Active (true/false)" },
];

function getIsoDatePrefix() {
  return new Date().toISOString().split("T")[0] ?? new Date().toISOString();
}

// Helper to safely get record value
function getRecordValue(
  record: Record<string, string> | undefined,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && typeof value === "string") {
      return value.trim() || undefined;
    }
  }
  return undefined;
}

// Helper to safely get record value with fallback
function getRecordValueWithFallback(
  record: Record<string, string> | undefined,
  ...keys: string[]
): string | null {
  const val = getRecordValue(record, ...keys);
  return val ?? null;
}

export const bulkOperationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get import template (CSV headers)
  fastify.get("/api/v1/bulk-import/template/:type", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    const paramsSchema = z.object({
      type: z.enum(["documents", "entities"]),
    });

    const { type } = paramsSchema.parse(request.params);
    const columns =
      type === "documents" ? documentCsvColumns : entityCsvColumns;

    const headers = columns.map((col) => col.label).join(",");
    const example = columns
      .map((col) => {
        switch (col.key) {
          case "entityName":
            return "Demo Entity LLC";
          case "entityCode":
            return "DE01";
          case "entityType":
            return "SUBSIDIARY";
          case "category":
            return "Holding";
          case "documentType":
            return "Commercial Registration";
          case "title":
            return "CR Certificate 2026";
          case "crNumber":
            return "1010123456";
          case "issueDate":
            return "2026-01-01";
          case "expiryDate":
            return "2027-01-01";
          case "status":
            return "ACTIVE";
          case "country":
            return "Saudi Arabia";
          case "registrationNumber":
            return "REG-12345";
          case "isActive":
            return "true";
          default:
            return "";
        }
      })
      .join(",");

    const csv = `${headers}\n${example}`;

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="vaxis-${type}-template.csv"`,
    );
    return reply.send(csv);
  });

  // Preview import (validate without saving)
  fastify.post("/api/v1/bulk-import/preview", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    const input = importSchema.parse(request.body);

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(input.csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      return reply.code(400).send({
        error: "CSV_PARSE_ERROR",
        message: error instanceof Error ? error.message : "Failed to parse CSV",
      });
    }

    if (records.length === 0) {
      return reply.code(400).send({
        error: "EMPTY_CSV",
        message: "No records found in CSV",
      });
    }

    if (records.length > 1000) {
      return reply.code(400).send({
        error: "TOO_MANY_RECORDS",
        message: "Maximum 1000 records allowed per import",
      });
    }

    // Get existing entities for validation
    const existingEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, request.user.tenantId));

    const entityMap = new Map(
      existingEntities.map((e) => [e.entityCode.toUpperCase(), e]),
    );

    // Validate each record
    const validationResults = records.map((record, index) => {
      const rowNum = index + 2; // +2 because header is row 1
      const errors: string[] = [];

      // Required fields
      const entityCode = getRecordValue(record, "Entity Code", "entityCode");
      if (!entityCode) {
        errors.push("Entity Code is required");
      }

      const title =
        getRecordValue(record, "Title", "title") ||
        getRecordValue(record, "Entity Name", "entityName");
      if (!title) {
        errors.push("Title or Entity Name is required");
      }

      // Check entity exists
      if (entityCode) {
        const entity = entityMap.get(entityCode.toUpperCase());
        if (!entity) {
          errors.push(`Entity with code '${entityCode}' not found`);
        }
      }

      // Date validation
      const issueDate = getRecordValue(
        record,
        "Issue Date (YYYY-MM-DD)",
        "issueDate",
      );
      const expiryDate = getRecordValue(
        record,
        "Expiry Date (YYYY-MM-DD)",
        "expiryDate",
      );

      if (issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
        errors.push("Issue Date must be in YYYY-MM-DD format");
      }
      if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
        errors.push("Expiry Date must be in YYYY-MM-DD format");
      }

      return {
        row: rowNum,
        data: record,
        valid: errors.length === 0,
        errors,
      };
    });

    const validCount = validationResults.filter((r) => r.valid).length;
    const invalidCount = validationResults.length - validCount;

    return {
      totalRows: records.length,
      validRows: validCount,
      invalidRows: invalidCount,
      preview: validationResults.slice(0, 10),
      canImport: invalidCount === 0,
    };
  });

  // Execute import
  fastify.post("/api/v1/bulk-import/execute", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    const input = importSchema.parse(request.body);

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(input.csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      return reply.code(400).send({
        error: "CSV_PARSE_ERROR",
        message: error instanceof Error ? error.message : "Failed to parse CSV",
      });
    }

    // Get existing entities and document types
    const [existingEntities, existingDocTypes, existingCategories] =
      await Promise.all([
        db
          .select()
          .from(entities)
          .where(eq(entities.tenantId, request.user.tenantId)),
        db
          .select()
          .from(documentTypes)
          .where(eq(documentTypes.tenantId, request.user.tenantId)),
        db
          .select()
          .from(categories)
          .where(eq(categories.tenantId, request.user.tenantId)),
      ]);

    const entityMap = new Map(
      existingEntities.map((e) => [e.entityCode.toUpperCase(), e]),
    );
    const docTypeMap = new Map(
      existingDocTypes.map((dt) => [dt.label.toLowerCase(), dt]),
    );
    const categoryMap = new Map(existingCategories.map((c) => [c.id, c]));

    const results = {
      created: 0,
      errors: [] as { row: number; message: string }[],
      documents: [] as string[],
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2;

      try {
        const entityCode = getRecordValue(record, "Entity Code", "entityCode");
        if (!entityCode) {
          results.errors.push({
            row: rowNum,
            message: "Entity Code is required",
          });
          continue;
        }

        const entity = entityMap.get(entityCode.toUpperCase());
        if (!entity) {
          results.errors.push({
            row: rowNum,
            message: `Entity with code '${entityCode}' not found`,
          });
          continue;
        }

        const docTypeLabel = getRecordValue(
          record,
          "Document Type",
          "documentType",
        );
        if (!docTypeLabel) {
          results.errors.push({
            row: rowNum,
            message: "Document Type is required",
          });
          continue;
        }
        const docType = docTypeMap.get(docTypeLabel.toLowerCase());
        if (!docType) {
          results.errors.push({
            row: rowNum,
            message: `Document type '${docTypeLabel}' not found`,
          });
          continue;
        }

        const title = getRecordValue(record, "Title", "title");
        if (!title) {
          results.errors.push({ row: rowNum, message: "Title is required" });
          continue;
        }

        // Get category for DNA code
        const category = categoryMap.get(entity.categoryId);
        if (!category) {
          results.errors.push({
            row: rowNum,
            message: `Category for entity not found`,
          });
          continue;
        }

        // Generate DNA code
        const dnaCode = toDnaCode({
          categorySlot: category.slotNumber,
          subDesignator: entity.subDesignator,
          entityCode: entity.entityCode,
          year: new Date().getFullYear(),
          sequence: i + 1,
        });

        // Parse dates
        const issueDateStr = getRecordValue(
          record,
          "Issue Date (YYYY-MM-DD)",
          "issueDate",
        );
        const expiryDateStr = getRecordValue(
          record,
          "Expiry Date (YYYY-MM-DD)",
          "expiryDate",
        );
        const issueDate = issueDateStr ? new Date(issueDateStr) : null;
        const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

        // Create document
        const [doc] = await db
          .insert(documents)
          .values({
            tenantId: request.user.tenantId,
            entityId: entity.id,
            dnaCode,
            documentTypeId: docType.id,
            title,
            crNumber: getRecordValueWithFallback(
              record,
              "CR Number",
              "crNumber",
            ),
            chamberNumber: getRecordValueWithFallback(
              record,
              "Chamber Number",
              "chamberNumber",
            ),
            issueDate,
            expiryDate,
            notes: getRecordValueWithFallback(record, "Notes", "notes"),
            createdBy: request.user.sub,
            updatedBy: request.user.sub,
          } as any) // Type assertion to avoid strict typing issues
          .returning();

        if (doc) {
          results.created++;
          results.documents.push(doc.id);
        }
      } catch (error) {
        results.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "document.uploaded",
      resourceType: "DOCUMENT",
      resourceId: null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        bulkImport: true,
        created: results.created,
        errors: results.errors.length,
      },
    } as any);

    // Trigger governance refresh synchronously
    if (results.created > 0) {
      try {
        await refreshTenantGovernance({
          tenantId: request.user.tenantId,
        });
      } catch (err) {
        // Fire-and-forget, don't fail the import
        console.error("Failed to refresh governance:", err);
      }
    }

    return reply.code(201).send({
      message: `Import completed. ${results.created} documents created.`,
      ...results,
    });
  });

  // Export documents
  fastify.post("/api/v1/bulk-export/documents", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    const input = exportSchema.parse(request.body);

    // Build conditions array
    const conditions: any[] = [eq(documents.tenantId, request.user.tenantId)];
    if (input.entityIds && input.entityIds.length > 0) {
      conditions.push(inArray(documents.entityId, input.entityIds));
    }
    if (input.documentTypeIds && input.documentTypeIds.length > 0) {
      conditions.push(inArray(documents.documentTypeId, input.documentTypeIds));
    }
    if (!input.includeExpired) {
      conditions.push(
        and(isNull(documents.deletedAt), eq(documents.status, "ACTIVE")),
      );
    }

    // Build query with all conditions
    const query = db
      .select({
        document: documents,
        entity: entities,
        docType: documentTypes,
      })
      .from(documents)
      .innerJoin(entities, eq(documents.entityId, entities.id))
      .innerJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
      .where(and(...conditions));

    const results = await query;

    // Helper to format date
    const formatDate = (date: any): string => {
      if (!date) return "";
      if (date instanceof Date) return date.toISOString().split("T")[0] ?? "";
      if (typeof date === "string") return date.split("T")[0] ?? "";
      return "";
    };

    if (input.format === "json") {
      return {
        exportedAt: new Date().toISOString(),
        count: results.length,
        documents: results.map((r) => ({
          dnaCode: r.document.dnaCode,
          entityName: r.entity.entityName,
          entityCode: r.entity.entityCode,
          documentType: r.docType.label,
          title: r.document.title,
          crNumber: r.document.crNumber,
          chamberNumber: r.document.chamberNumber,
          issueDate: r.document.issueDate,
          expiryDate: r.document.expiryDate,
          status: r.document.status,
          notes: r.document.notes,
        })),
      };
    }

    // CSV export
    const rows = results.map((r) => ({
      "DNA Code": r.document.dnaCode,
      "Entity Name": r.entity.entityName,
      "Entity Code": r.entity.entityCode,
      "Document Type": r.docType.label,
      Title: r.document.title,
      "CR Number": r.document.crNumber || "",
      "Chamber Number": r.document.chamberNumber || "",
      "Issue Date": formatDate(r.document.issueDate),
      "Expiry Date": formatDate(r.document.expiryDate),
      Status: r.document.status,
      Notes: r.document.notes || "",
    }));

    const csv = stringify(rows, {
      header: true,
      columns: documentCsvColumns.map((c) => c.label),
    });

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="vaxis-documents-export-${getIsoDatePrefix()}.csv"`,
    );
    return reply.send(csv);
  });

  // Export entities
  fastify.post("/api/v1/bulk-export/entities", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    const input = exportSchema.parse(request.body);

    const results = await db
      .select({
        entity: entities,
        category: categories,
      })
      .from(entities)
      .innerJoin(categories, eq(entities.categoryId, categories.id))
      .where(eq(entities.tenantId, request.user.tenantId));

    if (input.format === "json") {
      return {
        exportedAt: new Date().toISOString(),
        count: results.length,
        entities: results.map((r) => ({
          entityName: r.entity.entityName,
          entityCode: r.entity.entityCode,
          entityType: r.entity.entityType,
          category: r.category.label,
          country: r.entity.country,
          registrationNumber: r.entity.registrationNumber,
          isActive: r.entity.isActive,
        })),
      };
    }

    // CSV export
    const rows = results.map((r) => ({
      "Entity Name": r.entity.entityName,
      "Entity Code": r.entity.entityCode,
      "Entity Type": r.entity.entityType,
      Category: r.category.label,
      Country: r.entity.country || "",
      "Registration Number": r.entity.registrationNumber || "",
      "Is Active": r.entity.isActive ? "true" : "false",
    }));

    const csv = stringify(rows, {
      header: true,
      columns: entityCsvColumns.map((c) => c.label),
    });

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="vaxis-entities-export-${getIsoDatePrefix()}.csv"`,
    );
    return reply.send(csv);
  });

  // Get import status/history
  fastify.get("/api/v1/bulk-import/history", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "DOCUMENT_UPLOAD")) {
      return;
    }

    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });

    const { limit } = querySchema.parse(request.query);

    // Get recent bulk import audit logs
    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, request.user.tenantId),
          eq(auditLogs.eventType, "document.uploaded"),
        ),
      )
      .orderBy(auditLogs.createdAt)
      .limit(limit);

    return {
      imports: logs
        .filter((log) => log.metadata && (log.metadata as any).bulkImport)
        .map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          created: (log.metadata as any).created || 0,
          errors: (log.metadata as any).errors || 0,
        })),
    };
  });
};
