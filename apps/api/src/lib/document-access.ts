export type TenantDocumentFileRow = {
  tenantId: string;
  filePath: string | null;
  deletedAt?: Date | string | null;
};

export type TenantDocumentVersionRow = {
  tenantId: string;
  filePath: string;
};

export function canAccessTenantDocumentFile(
  row: TenantDocumentFileRow | null | undefined,
  tenantId: string,
) {
  return Boolean(
    row &&
      row.tenantId === tenantId &&
      row.filePath &&
      row.deletedAt == null &&
      storedPathBelongsToTenant(row.filePath, tenantId),
  );
}

export function canAccessTenantDocumentVersionFile(
  row: TenantDocumentVersionRow | null | undefined,
  tenantId: string,
) {
  return Boolean(
    row &&
      row.tenantId === tenantId &&
      storedPathBelongsToTenant(row.filePath, tenantId),
  );
}

export function storedPathBelongsToTenant(relativePath: string, tenantId: string) {
  const [pathTenantId] = relativePath.split("/");

  return pathTenantId === tenantId && !relativePath.includes("..");
}
