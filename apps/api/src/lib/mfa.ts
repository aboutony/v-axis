import { randomBytes } from "node:crypto";

import { authenticator } from "otplib";
import QRCode from "qrcode";

import { hashToken } from "./auth";
import { decryptSensitiveValue, encryptSensitiveValue } from "./secrets";

authenticator.options = {
  window: 1,
  step: 30,
};

export function encryptSecret(secret: string) {
  return encryptSensitiveValue(secret);
}

export function decryptSecret(payload: string) {
  return decryptSensitiveValue(payload);
}

export async function createTotpEnrollment(input: {
  email: string;
  issuer?: string;
}) {
  const issuer = input.issuer ?? "V-AXIS";
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(input.email, issuer, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  const backupCodes = Array.from({ length: 8 }, () =>
    randomBytes(5).toString("hex").toUpperCase(),
  );

  return {
    secret,
    encryptedSecret: encryptSecret(secret),
    otpauthUrl,
    qrDataUrl,
    backupCodes,
    hashedBackupCodes: backupCodes.map((code) => hashToken(code)),
  };
}

export function verifyTotpCode(input: { secret: string; code: string }) {
  return authenticator.verify({
    token: input.code.replace(/\s+/g, ""),
    secret: input.secret,
  });
}

export function hashBackupCode(code: string) {
  return hashToken(code.trim().toUpperCase());
}
