import "dotenv/config";

import { seededDocumentTypes } from "@vaxis/domain";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "./client";
import { documentTypes } from "./schema";

async function seedSystemDocumentTypes() {
  for (const documentType of seededDocumentTypes) {
    const existing = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(
        and(eq(documentTypes.code, documentType.code), isNull(documentTypes.tenantId)),
      )
      .limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(documentTypes).values({
      tenantId: null,
      code: documentType.code,
      label: documentType.label,
      arabicLabel: documentType.arabicLabel,
      sector: documentType.sector,
      requiresExpiry: documentType.requiresExpiry,
      requiresCr: documentType.requiresCr,
      isSystem: true,
      notes: documentType.notes,
    });
  }
}

async function main() {
  await seedSystemDocumentTypes();
  console.log(`Seeded ${seededDocumentTypes.length} system document types.`);
}

main()
  .catch((error) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { pool } = await import("./client");
    await pool.end();
  });
