// apps/api/src/routes/email-templates.ts
// Email template management routes

import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, emailTemplates } from "@vaxis/db/schema";

import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const templateParamsSchema = z.object({
  id: z.string().uuid(),
});

const templateCreateSchema = z.object({
  templateType: z.enum([
    "INVITE",
    "PASSWORD_RESET",
    "NOTIFICATION",
    "ESCALATION",
    "WELCOME",
  ]),
  name: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(500),
  bodyHtml: z.string().trim().min(10),
  bodyText: z.string().trim().min(10),
  variables: z.array(z.string()).default([]),
  isDefault: z.boolean().optional(),
});

const templateUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  subject: z.string().trim().min(2).max(500).optional(),
  bodyHtml: z.string().trim().min(10).optional(),
  bodyText: z.string().trim().min(10).optional(),
  variables: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const templatePreviewSchema = z.object({
  variables: z.record(z.string()).default({}),
});

// Default email templates
const defaultTemplates: Record<
  string,
  { subject: string; bodyHtml: string; bodyText: string; variables: string[] }
> = {
  INVITE: {
    subject: "Welcome to {{tenantName}} - Accept Your Invitation",
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{tenantName}}</h1>
    </div>
    <div class="content">
      <p>Hello {{recipientName}},</p>
      <p>You have been invited to join <strong>{{tenantName}}</strong> on V-AXIS. Click the button below to accept your invitation and set up your account:</p>
      <a href="{{inviteLink}}" class="button">Accept Invitation</a>
      <p>Or copy this link: {{inviteLink}}</p>
      <p>This invitation will expire on {{expiresAt}}.</p>
    </div>
    <div class="footer">
      <p>Powered by V-AXIS - Virtual Asset eXchange & Intelligence System</p>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Welcome to {{tenantName}}!

Hello {{recipientName}},

You have been invited to join {{tenantName}} on V-AXIS.

Accept your invitation: {{inviteLink}}

This invitation will expire on {{expiresAt}}.

Powered by V-AXIS`,
    variables: ["tenantName", "recipientName", "inviteLink", "expiresAt"],
  },
  PASSWORD_RESET: {
    subject: "Password Reset Request - {{tenantName}}",
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello {{recipientName}},</p>
      <p>We received a request to reset your password for <strong>{{tenantName}}</strong>. Click the button below to reset your password:</p>
      <a href="{{resetLink}}" class="button">Reset Password</a>
      <p>Or copy this link: {{resetLink}}</p>
      <p class="warning">This link will expire on {{expiresAt}}.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Password Reset Request - {{tenantName}}

Hello {{recipientName}},

We received a request to reset your password.

Reset your password: {{resetLink}}

This link will expire on {{expiresAt}}.

If you didn't request this, please ignore this email.`,
    variables: ["tenantName", "recipientName", "resetLink", "expiresAt"],
  },
  NOTIFICATION: {
    subject: "Alert: {{notificationTitle}} - {{tenantName}}",
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .severity-critical { border-left: 4px solid #dc2626; padding-left: 15px; }
    .severity-warning { border-left: 4px solid #f59e0b; padding-left: 15px; }
    .severity-info { border-left: 4px solid #3b82f6; padding-left: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{notificationTitle}}</h1>
    </div>
    <div class="content severity-{{severity}}">
      <p>Hello {{recipientName}},</p>
      <p>{{notificationMessage}}</p>
      <p><strong>Entity:</strong> {{entityName}}</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Alert: {{notificationTitle}} - {{tenantName}}

Hello {{recipientName}},

{{notificationMessage}}

Entity: {{entityName}}
Due Date: {{dueDate}}

Severity: {{severity}}`,
    variables: [
      "tenantName",
      "recipientName",
      "notificationTitle",
      "notificationMessage",
      "entityName",
      "dueDate",
      "severity",
    ],
  },
  ESCALATION: {
    subject: "ESCALATED: {{notificationTitle}} - {{tenantName}}",
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; border: 2px solid #dc2626; }
    .urgent { color: #dc2626; font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ ESCALATED ALERT</h1>
    </div>
    <div class="content">
      <p class="urgent">This issue has been escalated and requires immediate attention.</p>
      <p>Hello {{recipientName}},</p>
      <p><strong>{{notificationTitle}}</strong></p>
      <p>{{notificationMessage}}</p>
      <p><strong>Entity:</strong> {{entityName}}</p>
      <p><strong>Escalated At:</strong> {{escalatedAt}}</p>
      <p><strong>Escalation Level:</strong> {{escalationLevel}}</p>
    </div>
  </div>
</body>
</html>`,
    bodyText: `ESCALATED: {{notificationTitle}} - {{tenantName}}

⚠️ This issue has been escalated and requires immediate attention.

Hello {{recipientName}},

{{notificationTitle}}
{{notificationMessage}}

Entity: {{entityName}}
Escalated At: {{escalatedAt}}
Escalation Level: {{escalationLevel}}`,
    variables: [
      "tenantName",
      "recipientName",
      "notificationTitle",
      "notificationMessage",
      "entityName",
      "escalatedAt",
      "escalationLevel",
    ],
  },
  WELCOME: {
    subject: "Welcome to V-AXIS - {{tenantName}}",
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #10b981; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to V-AXIS!</h1>
    </div>
    <div class="content">
      <p>Hello {{recipientName}},</p>
      <p>Your account has been successfully created for <strong>{{tenantName}}</strong>.</p>
      <p>You can now access your workspace and start managing your entities and documents.</p>
      <div class="feature">
        <strong>Document Management</strong>
        <p>Upload, version, and track all your compliance documents in one place.</p>
      </div>
      <div class="feature">
        <strong>Governance & Compliance</strong>
        <p>Automated alerts and risk scoring to keep your portfolio compliant.</p>
      </div>
      <div class="feature">
        <strong>Team Collaboration</strong>
        <p>Invite team members and assign responsibilities across entities.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Welcome to V-AXIS - {{tenantName}}

Hello {{recipientName}},

Your account has been successfully created for {{tenantName}}.

You can now access your workspace and start managing your entities and documents.

Features:
- Document Management: Upload, version, and track compliance documents
- Governance & Compliance: Automated alerts and risk scoring
- Team Collaboration: Invite team members and assign responsibilities`,
    variables: ["tenantName", "recipientName"],
  },
};

// Helper to replace variables in template
function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => variables[key] ?? match,
  );
}

export const emailTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all templates for tenant
  fastify.get("/api/v1/email-templates", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.tenantId, request.user.tenantId));

    return {
      templates: templates
        .map((t) => ({
          id: t.id,
          templateType: t.templateType,
          name: t.name,
          subject: t.subject,
          variables: t.variables,
          isDefault: t.isDefault,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  // Get single template
  fastify.get("/api/v1/email-templates/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = templateParamsSchema.parse(request.params);

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!template) {
      return reply.code(404).send({
        error: "TEMPLATE_NOT_FOUND",
        message: "Email template not found.",
      });
    }

    return { template };
  });

  // Create template
  fastify.post("/api/v1/email-templates", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const input = templateCreateSchema.parse(request.body);

    // If setting as default, unset any existing default for this type
    if (input.isDefault) {
      await db
        .update(emailTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(emailTemplates.tenantId, request.user.tenantId),
            eq(emailTemplates.templateType, input.templateType),
            eq(emailTemplates.isDefault, true),
          ),
        );
    }

    const [template] = await db
      .insert(emailTemplates)
      .values({
        tenantId: request.user.tenantId,
        templateType: input.templateType,
        name: input.name,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        variables: input.variables,
        isDefault: input.isDefault ?? false,
        createdBy: request.user.sub,
        updatedBy: request.user.sub,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "email_template.created",
      resourceType: "EMAIL_TEMPLATE",
      resourceId: template?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        templateType: input.templateType,
        name: input.name,
        isDefault: input.isDefault,
      },
    });

    return reply.code(201).send({
      message: "Email template created.",
      template,
    });
  });

  // Update template
  fastify.patch("/api/v1/email-templates/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = templateParamsSchema.parse(request.params);
    const input = templateUpdateSchema.parse(request.body);

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing) {
      return reply.code(404).send({
        error: "TEMPLATE_NOT_FOUND",
        message: "Email template not found.",
      });
    }

    // If setting as default, unset any existing default for this type
    if (input.isDefault) {
      await db
        .update(emailTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(emailTemplates.tenantId, request.user.tenantId),
            eq(emailTemplates.templateType, existing.templateType),
            eq(emailTemplates.isDefault, true),
          ),
        );
    }

    const [updated] = await db
      .update(emailTemplates)
      .set({
        name: input.name ?? existing.name,
        subject: input.subject ?? existing.subject,
        bodyHtml: input.bodyHtml ?? existing.bodyHtml,
        bodyText: input.bodyText ?? existing.bodyText,
        variables: input.variables ?? existing.variables,
        isDefault: input.isDefault ?? existing.isDefault,
        isActive: input.isActive ?? existing.isActive,
        updatedBy: request.user.sub,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "email_template.updated",
      resourceType: "EMAIL_TEMPLATE",
      resourceId: updated?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        templateType: existing.templateType,
        name: input.name ?? existing.name,
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });

    return {
      message: "Email template updated.",
      template: updated,
    };
  });

  // Preview template with variables
  fastify.post(
    "/api/v1/email-templates/:id/preview",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      const { id } = templateParamsSchema.parse(request.params);
      const input = templatePreviewSchema.parse(request.body);

      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.id, id),
            eq(emailTemplates.tenantId, request.user.tenantId),
          ),
        )
        .limit(1);

      if (!template) {
        return reply.code(404).send({
          error: "TEMPLATE_NOT_FOUND",
          message: "Email template not found.",
        });
      }

      const previewVars = {
        tenantName: "Demo Tenant",
        recipientName: "John Doe",
        inviteLink: "https://vaxis.local/invite/demo",
        resetLink: "https://vaxis.local/reset/demo",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notificationTitle: "Document Expiring Soon",
        notificationMessage: "Your trade license will expire in 30 days.",
        entityName: "Demo Entity LLC",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        severity: "WARNING",
        escalatedAt: new Date().toISOString(),
        escalationLevel: "2",
        ...input.variables,
      };

      return {
        subject: renderTemplate(template.subject, previewVars),
        bodyHtml: renderTemplate(template.bodyHtml, previewVars),
        bodyText: renderTemplate(template.bodyText, previewVars),
      };
    },
  );

  // Get default templates
  fastify.get(
    "/api/v1/email-templates/defaults/list",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      return {
        templates: Object.entries(defaultTemplates).map(([type, template]) => ({
          templateType: type,
          name: `Default ${type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ")} Template`,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText,
          variables: template.variables,
        })),
      };
    },
  );

  // Seed default templates
  fastify.post(
    "/api/v1/email-templates/seed-defaults",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      const seededTemplates = [];

      for (const [type, template] of Object.entries(defaultTemplates)) {
        // Check if default already exists
        const [existing] = await db
          .select({ id: emailTemplates.id })
          .from(emailTemplates)
          .where(
            and(
              eq(emailTemplates.tenantId, request.user.tenantId),
              eq(emailTemplates.templateType, type as any),
              eq(emailTemplates.isDefault, true),
            ),
          )
          .limit(1);

        if (!existing) {
          const [created] = await db
            .insert(emailTemplates)
            .values({
              tenantId: request.user.tenantId,
              templateType: type as any,
              name: `Default ${type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ")} Template`,
              subject: template.subject,
              bodyHtml: template.bodyHtml,
              bodyText: template.bodyText,
              variables: template.variables,
              isDefault: true,
              isActive: true,
              createdBy: request.user.sub,
              updatedBy: request.user.sub,
            })
            .returning();

          seededTemplates.push(created);
        }
      }

      await db.insert(auditLogs).values({
        tenantId: request.user.tenantId,
        userId: request.user.sub,
        eventType: "email_template.seeded",
        resourceType: "EMAIL_TEMPLATE",
        resourceId: null,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: {
          count: seededTemplates.length,
        },
      });

      return {
        message: `${seededTemplates.length} default templates seeded.`,
        templates: seededTemplates,
      };
    },
  );

  // Delete template
  fastify.delete("/api/v1/email-templates/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = templateParamsSchema.parse(request.params);

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing) {
      return reply.code(404).send({
        error: "TEMPLATE_NOT_FOUND",
        message: "Email template not found.",
      });
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "email_template.deleted",
      resourceType: "EMAIL_TEMPLATE",
      resourceId: existing.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        templateType: existing.templateType,
        name: existing.name,
      },
    });

    return {
      message: "Email template deleted.",
    };
  });
};
