CREATE TYPE "public"."auth_action_purpose" AS ENUM('INVITE', 'PASSWORD_RESET');--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'user.invited' BEFORE 'user.updated';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'user.password_reset_requested' BEFORE 'user.updated';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'user.password_reset_completed' BEFORE 'user.updated';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'webhook.updated';--> statement-breakpoint
CREATE TABLE "user_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"issued_by" uuid,
	"purpose" "auth_action_purpose" NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "shared_secret_encrypted" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "last_delivery_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "last_delivery_status" varchar(20);--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "last_response_status_code" integer;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "last_delivery_error" text;--> statement-breakpoint
ALTER TABLE "user_action_tokens" ADD CONSTRAINT "user_action_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_action_tokens" ADD CONSTRAINT "user_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_action_tokens" ADD CONSTRAINT "user_action_tokens_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_action_tokens_hash_idx" ON "user_action_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_action_tokens_user_purpose_idx" ON "user_action_tokens" USING btree ("user_id","purpose","expires_at");