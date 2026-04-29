import { describe, expect, it } from "vitest";

import {
  canAccessTenantDocumentFile,
  canAccessTenantDocumentVersionFile,
  storedPathBelongsToTenant,
} from "./document-access";

describe("tenant document file access", () => {
  it("allows active document files scoped to the requester tenant", () => {
    expect(
      canAccessTenantDocumentFile(
        {
          tenantId: "tenant-a",
          filePath: "tenant-a/entity-1/document-1/2026/file.pdf",
          deletedAt: null,
        },
        "tenant-a",
      ),
    ).toBe(true);
  });

  it("blocks cross-tenant files even when a row is accidentally supplied", () => {
    expect(
      canAccessTenantDocumentFile(
        {
          tenantId: "tenant-a",
          filePath: "tenant-b/entity-1/document-1/2026/file.pdf",
          deletedAt: null,
        },
        "tenant-a",
      ),
    ).toBe(false);

    expect(
      canAccessTenantDocumentVersionFile(
        {
          tenantId: "tenant-a",
          filePath: "tenant-b/entity-1/document-1/2026/file.pdf",
        },
        "tenant-a",
      ),
    ).toBe(false);
  });

  it("blocks deleted, missing, and path traversal file references", () => {
    expect(
      canAccessTenantDocumentFile(
        {
          tenantId: "tenant-a",
          filePath: "tenant-a/entity-1/document-1/2026/file.pdf",
          deletedAt: new Date(),
        },
        "tenant-a",
      ),
    ).toBe(false);
    expect(storedPathBelongsToTenant("tenant-a/../tenant-b/file.pdf", "tenant-a")).toBe(
      false,
    );
  });
});
