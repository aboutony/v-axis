import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { authenticator } from "otplib";
import QRCode from "qrcode";

import { apiEnv } from "../config";
import { hashToken } from "./auth";

const encryptionKey = createHash("sha256")
  .update(apiEnv.MFA_ENCRYPTION_SECRET)
  .digest();

authenticator.options = {
  window: 1,
  step: 30,
};

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(":");

  if (!iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted secret payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
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
