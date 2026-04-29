ALTER TYPE "public"."automation_job_kind" ADD VALUE 'OCR';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'document.ocr.queued' BEFORE 'document.uploaded';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'document.ocr.completed' BEFORE 'document.uploaded';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'document.ocr.failed' BEFORE 'document.uploaded';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'document.ocr.retried' BEFORE 'document.uploaded';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'document.ocr.approved' BEFORE 'document.uploaded';--> statement-breakpoint
CREATE TABLE "ocr_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"status" varchar(40) DEFAULT 'QUEUED' NOT NULL,
	"engine" varchar(120),
	"document_kind" varchar(80),
	"document_type_label" varchar(200),
	"overall_confidence" numeric(5, 4),
	"language_hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_text" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_required_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"queued_by" uuid,
	"reviewed_by" uuid,
	"approved_by" uuid,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_queued_by_users_id_fk" FOREIGN KEY ("queued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ocr_extractions_tenant_status_idx" ON "ocr_extractions" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "ocr_extractions_document_idx" ON "ocr_extractions" USING btree ("document_id","created_at");
