ALTER TYPE "public"."activity_event_type" ADD VALUE 'governance.rule.updated' BEFORE 'notification.created';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'notification.resolved' BEFORE 'taxonomy.category.updated';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "source_key" varchar(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_tenant_source_key_idx" ON "notifications" USING btree ("tenant_id","source_key");