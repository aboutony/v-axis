import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

import type { MultipartFile } from "@fastify/multipart";

import { apiEnv } from "../config";

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getVaultRoot() {
  return resolve(process.cwd(), apiEnv.VAULT_STORAGE_ROOT);
}

export async function persistMultipartFile(input: {
  file: MultipartFile;
  tenantId: string;
  entityId: string;
  documentId?: string;
}) {
  const originalName = sanitizeSegment(input.file.filename || "upload.bin");
  const extension = extname(originalName);
  const year = String(new Date().getUTCFullYear());
  const uniqueName = `${randomUUID()}${extension}`;
  const relativePath = [
    sanitizeSegment(input.tenantId),
    sanitizeSegment(input.entityId),
    sanitizeSegment(input.documentId ?? "incoming"),
    year,
    uniqueName,
  ].join("/");
  const absolutePath = resolve(getVaultRoot(), relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });

  const hash = createHash("sha256");
  let fileSizeBytes = 0;

  input.file.file.on("data", (chunk: Buffer) => {
    hash.update(chunk);
    fileSizeBytes += chunk.length;
  });

  await pipeline(input.file.file, createWriteStream(absolutePath));

  return {
    relativePath,
    absolutePath,
    fileMimeType: input.file.mimetype,
    fileSizeBytes,
    checksumSha256: hash.digest("hex"),
  };
}

export async function removeStoredFile(relativePath: string) {
  const absolutePath = resolve(getVaultRoot(), relativePath);

  await rm(absolutePath, {
    force: true,
  });
}
