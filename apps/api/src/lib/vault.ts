import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { MultipartFile } from "@fastify/multipart";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import { apiEnv } from "../config";

export type StoredVaultFile = {
  relativePath: string;
  absolutePath?: string;
  fileMimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  storageDriver: "LOCAL" | "S3";
};

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getVaultRoot() {
  return resolve(process.cwd(), apiEnv.VAULT_STORAGE_ROOT);
}

function getS3Client() {
  if (!apiEnv.VAULT_S3_BUCKET) {
    throw new Error("VAULT_S3_BUCKET is required when VAULT_STORAGE_DRIVER=S3.");
  }

  const config: S3ClientConfig = {
    region: apiEnv.VAULT_S3_REGION,
    forcePathStyle: apiEnv.VAULT_S3_FORCE_PATH_STYLE,
  };

  if (apiEnv.VAULT_S3_ENDPOINT) {
    config.endpoint = apiEnv.VAULT_S3_ENDPOINT;
  }

  if (apiEnv.VAULT_S3_ACCESS_KEY_ID && apiEnv.VAULT_S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: apiEnv.VAULT_S3_ACCESS_KEY_ID,
      secretAccessKey: apiEnv.VAULT_S3_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
}

export function resolveStoredFilePath(relativePath: string) {
  const absolutePath = resolve(getVaultRoot(), relativePath);

  if (!absolutePath.startsWith(getVaultRoot())) {
    throw new Error("Stored file path escaped the configured vault root.");
  }

  return absolutePath;
}

export async function persistMultipartFile(input: {
  file: MultipartFile;
  tenantId: string;
  entityId: string;
  documentId?: string;
}): Promise<StoredVaultFile> {
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
  const fileBuffer = await streamToBuffer(input.file.file);
  const checksumSha256 = createHash("sha256").update(fileBuffer).digest("hex");

  if (apiEnv.VAULT_STORAGE_DRIVER === "S3") {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: apiEnv.VAULT_S3_BUCKET,
        Key: relativePath,
        Body: fileBuffer,
        ContentType: input.file.mimetype,
        Metadata: {
          tenantId: input.tenantId,
          entityId: input.entityId,
          checksumSha256,
        },
      }),
    );

    return {
      relativePath,
      fileMimeType: input.file.mimetype,
      fileSizeBytes: fileBuffer.length,
      checksumSha256,
      storageDriver: "S3",
    };
  }

  const absolutePath = resolveStoredFilePath(relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await pipeline(Readable.from(fileBuffer), createWriteStream(absolutePath));

  return {
    relativePath,
    absolutePath,
    fileMimeType: input.file.mimetype,
    fileSizeBytes: fileBuffer.length,
    checksumSha256,
    storageDriver: "LOCAL",
  };
}

export async function loadStoredFileBuffer(relativePath: string) {
  if (apiEnv.VAULT_STORAGE_DRIVER === "S3") {
    const client = getS3Client();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: apiEnv.VAULT_S3_BUCKET,
        Key: relativePath,
      }),
    );

    if (!result.Body) {
      throw new Error("Stored object was empty.");
    }

    return Buffer.from(await result.Body.transformToByteArray());
  }

  return readFile(resolveStoredFilePath(relativePath));
}

export function createStoredFileReadStream(relativePath: string) {
  if (apiEnv.VAULT_STORAGE_DRIVER === "S3") {
    throw new Error("Use loadStoredFileBuffer for S3-backed vault retrieval.");
  }

  return createReadStream(resolveStoredFilePath(relativePath));
}

export async function removeStoredFile(relativePath: string) {
  if (apiEnv.VAULT_STORAGE_DRIVER === "S3") {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: apiEnv.VAULT_S3_BUCKET,
        Key: relativePath,
      }),
    );
    return;
  }

  await rm(resolveStoredFilePath(relativePath), {
    force: true,
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
