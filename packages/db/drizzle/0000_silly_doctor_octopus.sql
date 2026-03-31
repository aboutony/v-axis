CREATE TYPE "public"."activity_event_type" AS ENUM('document.uploaded', 'document.replaced', 'document.archived', 'document.deleted', 'document.critical_master_marked', 'notification.created', 'notification.acknowledged', 'notification.escalated', 'taxonomy.category.updated', 'taxonomy.entity.updated', 'user.login.succeeded', 'user.login.failed', 'user.created', 'tenant.bootstrapped');--> statement-breakpoint
CREATE TYPE "public"."connector_status" AS ENUM('ACTIVE', 'INACTIVE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."connector_type" AS ENUM('ERP', 'GOV_PORTAL', 'STORAGE', 'NOTIFICATION', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."document_sector" AS ENUM('GOV', 'B2B', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('ACTIVE', 'EXPIRING', 'EXPIRED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('SUBSIDIARY', 'JV', 'ASSOCIATE', 'BRANCH');--> statement-breakpoint
CREATE TYPE "public"."mfa_method" AS ENUM('TOTP', 'EMAIL_OTP');--> statement-breakpoint
CREATE TYPE "public"."notification_state" AS ENUM('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('EXPIRY_WARNING', 'DOCUMENT_MISSING', 'TASK_OVERDUE', 'RISK_ESCALATION');--> statement-breakpoint
CREATE TYPE "public"."offline_sync_status" AS ENUM('PENDING', 'SYNCED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan_tier" AS ENUM('STANDARD', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."tenant_region" AS ENUM('GCC', 'INTERNATIONAL');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DEPROVISIONED');--> statement-breakpoint
CREATE TYPE "public"."user_language" AS ENUM('EN', 'AR');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('MASTER_ADMIN', 'CLIENT_ADMIN', 'SUBSIDIARY_MANAGER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'LOCKED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."user_theme" AS ENUM('LIGHT', 'DARK', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."vault_type" AS ENUM('SAAS', 'PRIVATE_CLOUD', 'ON_PREMISE');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"event_type" "activity_event_type" NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slot_number" smallint NOT NULL,
	"label" varchar(100) NOT NULL,
	"color_code" varchar(7),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_type" "connector_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "connector_status" DEFAULT 'INACTIVE' NOT NULL,
	"last_sync" timestamp with time zone,
	"sync_interval_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" integer NOT NULL,
	"label" varchar(200) NOT NULL,
	"arabic_label" varchar(200),
	"sector" "document_sector" NOT NULL,
	"requires_expiry" boolean DEFAULT true NOT NULL,
	"requires_cr" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"file_path" text NOT NULL,
	"file_mime_type" varchar(100),
	"file_size_bytes" bigint,
	"checksum_sha256" varchar(64),
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"dna_code" varchar(50) NOT NULL,
	"document_type_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"cr_number" varchar(50),
	"chamber_number" varchar(50),
	"company_identifier" varchar(100),
	"cost_amount" numeric(12, 2),
	"duration_years" numeric(4, 1),
	"issue_date" date,
	"expiry_date" date,
	"status" "document_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"file_path" text,
	"file_mime_type" varchar(100),
	"file_size_bytes" bigint,
	"checksum_sha256" varchar(64),
	"is_critical_master" boolean DEFAULT false NOT NULL,
	"offline_sync_status" "offline_sync_status" DEFAULT 'PENDING' NOT NULL,
	"last_offline_sync" timestamp with time zone,
	"offline_expiry" date,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"entity_name" varchar(200) NOT NULL,
	"entity_code" varchar(10) NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"sub_designator" varchar(4) NOT NULL,
	"country" varchar(100),
	"registration_number" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_document_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"document_type_id" uuid NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"country" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_risk_scores" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"score" smallint DEFAULT 100 NOT NULL,
	"prev_score" smallint,
	"score_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" "mfa_method" NOT NULL,
	"totp_secret_encrypted" text,
	"email_otp_seed" text,
	"backup_codes_hash" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid,
	"entity_id" uuid,
	"type" "notification_type" NOT NULL,
	"severity" "severity_level" NOT NULL,
	"status" "notification_state" DEFAULT 'PENDING' NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"assigned_to" uuid,
	"delegated_by" uuid,
	"escalation_level" smallint DEFAULT 0 NOT NULL,
	"due_date" date,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"region" "tenant_region" DEFAULT 'GCC' NOT NULL,
	"plan_tier" "tenant_plan_tier" DEFAULT 'STANDARD' NOT NULL,
	"vault_type" "vault_type" DEFAULT 'SAAS' NOT NULL,
	"status" "tenant_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_entity_assignments" (
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_entity_assignments_user_id_entity_id_pk" PRIMARY KEY("user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"full_name" varchar(200) NOT NULL,
	"job_title" varchar(200),
	"department" varchar(200),
	"phone" varchar(50),
	"avatar_url" text,
	"preferred_language" "user_language" DEFAULT 'EN' NOT NULL,
	"preferred_theme" "user_theme" DEFAULT 'SYSTEM' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"email": true, "inApp": true, "sms": false}'::jsonb NOT NULL,
	"timezone" varchar(100) DEFAULT 'Asia/Riyadh' NOT NULL,
	"role" "user_role" DEFAULT 'STAFF' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supervisor_user_id" uuid,
	"mfa_required" boolean DEFAULT false NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"url" text NOT NULL,
	"shared_secret_hash" text NOT NULL,
	"subscribed_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_document_rules" ADD CONSTRAINT "entity_document_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_document_rules" ADD CONSTRAINT "entity_document_rules_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_risk_scores" ADD CONSTRAINT "entity_risk_scores_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_risk_scores" ADD CONSTRAINT "entity_risk_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_delegated_by_users_id_fk" FOREIGN KEY ("delegated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_assignments" ADD CONSTRAINT "user_entity_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_assignments" ADD CONSTRAINT "user_entity_assignments_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_event_idx" ON "audit_logs" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_tenant_slot_idx" ON "categories" USING btree ("tenant_id","slot_number");--> statement-breakpoint
CREATE INDEX "connectors_tenant_type_idx" ON "connectors" USING btree ("tenant_id","connector_type");--> statement-breakpoint
CREATE UNIQUE INDEX "document_types_scope_code_idx" ON "document_types" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "document_types_sector_idx" ON "document_types" USING btree ("sector");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_doc_version_idx" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_tenant_dna_idx" ON "documents" USING btree ("tenant_id","dna_code");--> statement-breakpoint
CREATE INDEX "documents_expiry_idx" ON "documents" USING btree ("tenant_id","expiry_date");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("tenant_id","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_tenant_code_idx" ON "entities" USING btree ("tenant_id","entity_code");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_category_name_idx" ON "entities" USING btree ("category_id","entity_name");--> statement-breakpoint
CREATE INDEX "entities_tenant_category_idx" ON "entities" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_document_rules_scope_idx" ON "entity_document_rules" USING btree ("tenant_id","entity_type","document_type_id","country");--> statement-breakpoint
CREATE INDEX "entity_risk_scores_tenant_idx" ON "entity_risk_scores" USING btree ("tenant_id","score");--> statement-breakpoint
CREATE INDEX "mfa_enrollments_user_idx" ON "mfa_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_summary_idx" ON "notifications" USING btree ("tenant_id","status","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_tenant_role_idx" ON "users" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE INDEX "webhooks_tenant_enabled_idx" ON "webhooks" USING btree ("tenant_id","enabled");