CREATE TYPE "public"."automation_job_kind" AS ENUM('DELIVERY', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."automation_job_state" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'automation.delivery.replayed' BEFORE 'document.uploaded';--> statement-breakpoint
CREATE TABLE "automation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"job_kind" "automation_job_kind" NOT NULL,
	"queue_name" varchar(50) NOT NULL,
	"job_name" varchar(120) NOT NULL,
	"queue_job_id" varchar(255) NOT NULL,
	"status" "automation_job_state" DEFAULT 'QUEUED' NOT NULL,
	"triggered_by" varchar(40) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"payload_preview" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payload_encrypted" text,
	"result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"attempts_made" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"replay_of_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_jobs_queue_job_idx" ON "automation_jobs" USING btree ("queue_job_id");--> statement-breakpoint
CREATE INDEX "automation_jobs_tenant_kind_idx" ON "automation_jobs" USING btree ("tenant_id","job_kind","status","created_at");--> statement-breakpoint
CREATE INDEX "automation_jobs_queue_status_idx" ON "automation_jobs" USING btree ("queue_name","status","created_at");--> statement-breakpoint
CREATE INDEX "automation_jobs_resource_idx" ON "automation_jobs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "automation_jobs_replay_idx" ON "automation_jobs" USING btree ("replay_of_id");