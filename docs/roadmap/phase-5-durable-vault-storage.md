# Phase 5 - Durable Vault Storage

Status: Implemented baseline.

## What Changed

- Added a configurable vault storage driver:
  - `LOCAL` for local development or a single-service persistent disk.
  - `S3` for durable shared object storage across API and worker services.
- Updated Render blueprint environment policy to use `VAULT_STORAGE_DRIVER=S3` for production.
- Added S3-compatible environment variables for AWS S3, Cloudflare R2, Backblaze B2, or any compatible provider.
- Kept tenant-aware path partitioning:
  - `tenantId/entityId/documentId-or-incoming/year/fileId.ext`
- Added tenant-authorized file retrieval endpoints:
  - `GET /api/v1/documents/:documentId/file`
  - `GET /api/v1/documents/:documentId/versions/:versionNumber/file`
- Preserved existing version records in `document_versions`.
- Updated OCR worker file loading so API and worker can read from the same durable vault.
- Added real product download controls for current file and retained versions.

## Production Environment Variables

Set these on both Render API and Render worker:

```text
VAULT_STORAGE_DRIVER=S3
VAULT_S3_BUCKET=<bucket-name>
VAULT_S3_REGION=<region>
VAULT_S3_ENDPOINT=<provider-endpoint-if-not-aws>
VAULT_S3_ACCESS_KEY_ID=<access-key>
VAULT_S3_SECRET_ACCESS_KEY=<secret-key>
VAULT_S3_FORCE_PATH_STYLE=true
```

For AWS S3, `VAULT_S3_ENDPOINT` can usually be omitted and `VAULT_S3_FORCE_PATH_STYLE` can usually be `false`.

## Authorization

Retrieval is tenant-aware:

- The request must be authenticated.
- The document must belong to `request.user.tenantId`.
- Version downloads must belong to the same tenant and document.
- File responses are returned with `Cache-Control: private, no-store`.

## Backup And Retention

Baseline:

- S3/object storage should enable bucket versioning.
- S3/object storage should enable lifecycle retention according to the final compliance policy.
- Database rows remain the registry of document versions and metadata.

Recommended production policy:

- Enable bucket versioning.
- Enable server-side encryption.
- Block public bucket access.
- Retain deleted objects for a minimum recovery window.
- Replicate to a second region if the customer requires higher availability.
- Schedule database backups together with object-storage lifecycle policy reviews.

## Persistent Disk Alternative

If object storage is not used, `LOCAL` can point `VAULT_STORAGE_ROOT` to a mounted persistent disk. This is acceptable only when every service that needs files can access that same mount. On Render, the API and worker are separate services, so S3-compatible storage is the safer production default.
