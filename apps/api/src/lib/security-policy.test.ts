import { describe, expect, it } from "vitest";

import {
  roleHasPermission,
  validatePermissionMatrix,
  validateProductionSecurityPolicy,
} from "./security-policy";

describe("security policy", () => {
  it("keeps privileged permissions away from staff", () => {
    expect(validatePermissionMatrix()).toMatchObject({ valid: true });
    expect(roleHasPermission("STAFF", "DOCUMENT_UPLOAD")).toBe(true);
    expect(roleHasPermission("STAFF", "DOCUMENT_MANAGE")).toBe(false);
    expect(roleHasPermission("STAFF", "USER_MANAGE")).toBe(false);
    expect(roleHasPermission("CLIENT_ADMIN", "VAULT_CONFIGURE")).toBe(true);
  });

  it("flags weak production origin, cookie, and secret policy", () => {
    const result = validateProductionSecurityPolicy({
      nodeEnv: "production",
      cookieSecure: false,
      cookieSameSite: "none",
      trustedOrigins: ["*"],
      jwtSecret: "short",
      appEncryptionSecret: "short",
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        "Production cookies must be secure.",
        "Trusted frontend origins must not use wildcards.",
        "Production JWT secret must be at least 32 characters.",
      ]),
    );
  });

  it("accepts strict production security policy", () => {
    expect(
      validateProductionSecurityPolicy({
        nodeEnv: "production",
        cookieSecure: true,
        cookieSameSite: "none",
        trustedOrigins: ["https://v-axis-web.vercel.app"],
        jwtSecret: "x".repeat(32),
        appEncryptionSecret: "y".repeat(32),
      }),
    ).toMatchObject({ valid: true });
  });
});
