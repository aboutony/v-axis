import {
  defaultPermissionsByRole,
  type PermissionFlag,
  type UserRole,
} from "@vaxis/domain";

const privilegedPermissions: PermissionFlag[] = [
  "DOCUMENT_MANAGE",
  "NOTIFICATION_MANAGE",
  "USER_MANAGE",
  "TAXONOMY_CONFIGURE",
  "VAULT_CONFIGURE",
  "AUDIT_VIEW",
];

export function getPermissionMatrix() {
  return defaultPermissionsByRole;
}

export function roleHasPermission(role: UserRole, permission: PermissionFlag) {
  return defaultPermissionsByRole[role].includes(permission);
}

export function validatePermissionMatrix() {
  const violations: string[] = [];

  for (const permission of privilegedPermissions) {
    if (roleHasPermission("STAFF", permission)) {
      violations.push(`STAFF must not have ${permission}.`);
    }
  }

  if (!roleHasPermission("STAFF", "DOCUMENT_UPLOAD")) {
    violations.push("STAFF must retain DOCUMENT_UPLOAD for normal intake.");
  }

  if (!roleHasPermission("CLIENT_ADMIN", "VAULT_CONFIGURE")) {
    violations.push("CLIENT_ADMIN must retain VAULT_CONFIGURE.");
  }

  if (!roleHasPermission("MASTER_ADMIN", "AUDIT_VIEW")) {
    violations.push("MASTER_ADMIN must retain AUDIT_VIEW.");
  }

  return {
    valid: violations.length === 0,
    violations,
    matrix: getPermissionMatrix(),
  };
}

export function validateProductionSecurityPolicy(input: {
  nodeEnv: string;
  cookieSecure: boolean;
  cookieSameSite: string;
  trustedOrigins: string[];
  jwtSecret?: string;
  appEncryptionSecret?: string;
}) {
  const violations: string[] = [];

  if (input.nodeEnv === "production") {
    if (!input.cookieSecure) {
      violations.push("Production cookies must be secure.");
    }

    if (input.cookieSameSite === "none" && !input.cookieSecure) {
      violations.push("SameSite=None requires secure cookies.");
    }

    if (input.trustedOrigins.length === 0) {
      violations.push("At least one trusted frontend origin is required.");
    }

    if (input.trustedOrigins.some((origin) => origin.includes("*"))) {
      violations.push("Trusted frontend origins must not use wildcards.");
    }

    if (!input.jwtSecret || input.jwtSecret.length < 32) {
      violations.push("Production JWT secret must be at least 32 characters.");
    }

    if (!input.appEncryptionSecret || input.appEncryptionSecret.length < 32) {
      violations.push(
        "Production app encryption secret must be at least 32 characters.",
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
