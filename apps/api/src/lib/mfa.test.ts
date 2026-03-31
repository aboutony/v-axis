import { describe, expect, it } from "vitest";
import { authenticator } from "otplib";

import {
  createTotpEnrollment,
  decryptSecret,
  encryptSecret,
  hashBackupCode,
  verifyTotpCode,
} from "./mfa";

describe("mfa helpers", () => {
  it("round-trips encrypted TOTP secrets", () => {
    const secret = authenticator.generateSecret();
    const encrypted = encryptSecret(secret);

    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("creates verifiable TOTP enrollments", async () => {
    const enrollment = await createTotpEnrollment({
      email: "admin@vaxis.example",
      issuer: "V-AXIS Test",
    });

    const token = authenticator.generate(enrollment.secret);

    expect(enrollment.qrDataUrl.startsWith("data:image/png;base64,")).toBe(
      true,
    );
    expect(enrollment.backupCodes).toHaveLength(8);
    expect(verifyTotpCode({ secret: enrollment.secret, code: token })).toBe(
      true,
    );
  });

  it("normalizes backup code hashing", () => {
    expect(hashBackupCode("ab12cd34ef")).toBe(hashBackupCode(" AB12CD34EF "));
  });
});
