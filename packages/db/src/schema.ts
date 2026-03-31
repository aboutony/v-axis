import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  activityEventTypes,
  connectorStatuses,
  connectorTypes,
  documentSectors,
  documentStatuses,
  entityTypes,
  languageCodes,
  notificationStates,
  notificationTypes,
  offlineSyncStatuses,
  severityLevels,
  tenantPlanTiers,
  tenantRegions,
  tenantStatuses,
  themeModes,
  userRoles,
  vaultTypes,
  type PermissionFlag,
} from "@vaxis/domain";

export const tenantRegionEnum = pgEnum("tenant_region", tenantRegions);
export const tenantPlanTierEnum = pgEnum("tenant_plan_tier", tenantPlanTiers);
export const tenantStatusEnum = pgEnum("tenant_status", tenantStatuses);
export const vaultTypeEnum = pgEnum("vault_type", vaultTypes);
export const userRoleEnum = pgEnum("user_role", userRoles);
export const userLanguageEnum = pgEnum("user_language", languageCodes);
export const userThemeEnum = pgEnum("user_theme", themeModes);
export const entityTypeEnum = pgEnum("entity_type", entityTypes);
export const documentSectorEnum = pgEnum("document_sector", documentSectors);
export const documentStatusEnum = pgEnum("document_status", documentStatuses);
export const notificationTypeEnum = pgEnum(
  "notification_type",
  notificationTypes,
);
export const notificationStateEnum = pgEnum(
  "notification_state",
  notificationStates,
);
export const severityLevelEnum = pgEnum("severity_level", severityLevels);
export const offlineSyncStatusEnum = pgEnum(
  "offline_sync_status",
  offlineSyncStatuses,
);
export const connectorTypeEnum = pgEnum("connector_type", connectorTypes);
export const connectorStatusEnum = pgEnum(
  "connector_status",
  connectorStatuses,
);
export const activityEventTypeEnum = pgEnum(
  "activity_event_type",
  activityEventTypes,
);
export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "LOCKED",
  "DEACTIVATED",
]);
export const mfaMethodEnum = pgEnum("mfa_method", ["TOTP", "EMAIL_OTP"]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientName: varchar("client_name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    region: tenantRegionEnum("region").notNull().default("GCC"),
    planTier: tenantPlanTierEnum("plan_tier").notNull().default("STANDARD"),
    vaultType: vaultTypeEnum("vault_type").notNull().default("SAAS"),
    status: tenantStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("tenants_slug_idx").on(table.slug)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash"),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    jobTitle: varchar("job_title", { length: 200 }),
    department: varchar("department", { length: 200 }),
    phone: varchar("phone", { length: 50 }),
    avatarUrl: text("avatar_url"),
    preferredLanguage: userLanguageEnum("preferred_language")
      .notNull()
      .default("EN"),
    preferredTheme: userThemeEnum("preferred_theme")
      .notNull()
      .default("SYSTEM"),
    notificationPreferences: jsonb("notification_preferences")
      .$type<{
        email: boolean;
        inApp: boolean;
        sms: boolean;
      }>()
      .notNull()
      .default(sql`'{"email": true, "inApp": true, "sms": false}'::jsonb`),
    timezone: varchar("timezone", { length: 100 })
      .notNull()
      .default("Asia/Riyadh"),
    role: userRoleEnum("role").notNull().default("STAFF"),
    permissions: jsonb("permissions")
      .$type<PermissionFlag[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    supervisorUserId: uuid("supervisor_user_id"),
    mfaRequired: boolean("mfa_required").notNull().default(false),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
    index("users_tenant_role_idx").on(table.tenantId, table.role),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_sessions_user_idx").on(table.userId, table.expiresAt)],
);

export const mfaEnrollments = pgTable(
  "mfa_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: mfaMethodEnum("method").notNull(),
    totpSecretEncrypted: text("totp_secret_encrypted"),
    emailOtpSeed: text("email_otp_seed"),
    backupCodesHash: jsonb("backup_codes_hash")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("mfa_enrollments_user_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    slotNumber: smallint("slot_number").notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    colorCode: varchar("color_code", { length: 7 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("categories_tenant_slot_idx").on(table.tenantId, table.slotNumber),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    entityName: varchar("entity_name", { length: 200 }).notNull(),
    entityCode: varchar("entity_code", { length: 10 }).notNull(),
    entityType: entityTypeEnum("entity_type").notNull(),
    subDesignator: varchar("sub_designator", { length: 4 }).notNull(),
    country: varchar("country", { length: 100 }),
    registrationNumber: varchar("registration_number", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("entities_tenant_code_idx").on(table.tenantId, table.entityCode),
    uniqueIndex("entities_category_name_idx").on(table.categoryId, table.entityName),
    index("entities_tenant_category_idx").on(table.tenantId, table.categoryId),
  ],
);

export const userEntityAssignments = pgTable(
  "user_entity_assignments",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.entityId] })],
);

export const documentTypes = pgTable(
  "document_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    code: integer("code").notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    arabicLabel: varchar("arabic_label", { length: 200 }),
    sector: documentSectorEnum("sector").notNull(),
    requiresExpiry: boolean("requires_expiry").notNull().default(true),
    requiresCr: boolean("requires_cr").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("document_types_scope_code_idx").on(table.tenantId, table.code),
    index("document_types_sector_idx").on(table.sector),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "restrict" }),
    dnaCode: varchar("dna_code", { length: 50 }).notNull(),
    documentTypeId: uuid("document_type_id")
      .notNull()
      .references(() => documentTypes.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 500 }).notNull(),
    crNumber: varchar("cr_number", { length: 50 }),
    chamberNumber: varchar("chamber_number", { length: 50 }),
    companyIdentifier: varchar("company_identifier", { length: 100 }),
    costAmount: numeric("cost_amount", { precision: 12, scale: 2 }),
    durationYears: numeric("duration_years", { precision: 4, scale: 1 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    status: documentStatusEnum("status").notNull().default("ACTIVE"),
    notes: text("notes"),
    filePath: text("file_path"),
    fileMimeType: varchar("file_mime_type", { length: 100 }),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    isCriticalMaster: boolean("is_critical_master").notNull().default(false),
    offlineSyncStatus: offlineSyncStatusEnum("offline_sync_status")
      .notNull()
      .default("PENDING"),
    lastOfflineSync: timestamp("last_offline_sync", { withTimezone: true }),
    offlineExpiry: date("offline_expiry"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("documents_tenant_dna_idx").on(table.tenantId, table.dnaCode),
    index("documents_expiry_idx").on(table.tenantId, table.expiryDate),
    index("documents_entity_idx").on(table.tenantId, table.entityId),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    filePath: text("file_path").notNull(),
    fileMimeType: varchar("file_mime_type", { length: 100 }),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("document_versions_doc_version_idx").on(
      table.documentId,
      table.versionNumber,
    ),
  ],
);

export const entityDocumentRules = pgTable(
  "entity_document_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: entityTypeEnum("entity_type").notNull(),
    documentTypeId: uuid("document_type_id")
      .notNull()
      .references(() => documentTypes.id, { onDelete: "cascade" }),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    country: varchar("country", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("entity_document_rules_scope_idx").on(
      table.tenantId,
      table.entityType,
      table.documentTypeId,
      table.country,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    severity: severityLevelEnum("severity").notNull(),
    status: notificationStateEnum("status").notNull().default("PENDING"),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    delegatedBy: uuid("delegated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    escalationLevel: smallint("escalation_level").notNull().default(0),
    dueDate: date("due_date"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_summary_idx").on(
      table.tenantId,
      table.status,
      table.severity,
    ),
  ],
);

export const entityRiskScores = pgTable(
  "entity_risk_scores",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    score: smallint("score").notNull().default(100),
    prevScore: smallint("prev_score"),
    scoreBreakdown: jsonb("score_breakdown")
      .$type<
        Array<{
          reason: string;
          points: number;
          severity: (typeof severityLevels)[number];
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("entity_risk_scores_tenant_idx").on(table.tenantId, table.score)],
);

export const connectors = pgTable(
  "connectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectorType: connectorTypeEnum("connector_type").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    status: connectorStatusEnum("status").notNull().default("INACTIVE"),
    lastSync: timestamp("last_sync", { withTimezone: true }),
    syncIntervalMinutes: integer("sync_interval_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("connectors_tenant_type_idx").on(table.tenantId, table.connectorType),
  ],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    url: text("url").notNull(),
    sharedSecretHash: text("shared_secret_hash").notNull(),
    subscribedEvents: jsonb("subscribed_events")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("webhooks_tenant_enabled_idx").on(table.tenantId, table.enabled)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: activityEventTypeEnum("event_type").notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: uuid("resource_id"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_tenant_event_idx").on(table.tenantId, table.eventType),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
  ],
);
