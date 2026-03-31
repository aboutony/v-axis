export const platformName = "V-AXIS";
export const platformTagline = "Virtual Asset eXchange & Intelligence System";

export const categorySlots = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const userRoles = [
  "MASTER_ADMIN",
  "CLIENT_ADMIN",
  "SUBSIDIARY_MANAGER",
  "STAFF",
] as const;

export const permissionFlags = [
  "ENTITY_VIEW",
  "ENTITY_MANAGE",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_MANAGE",
  "NOTIFICATION_MANAGE",
  "USER_MANAGE",
  "TAXONOMY_CONFIGURE",
  "VAULT_CONFIGURE",
  "REPORTS_VIEW",
  "AUDIT_VIEW",
] as const;

export const tenantStatuses = ["ACTIVE", "SUSPENDED", "DEPROVISIONED"] as const;

export const tenantRegions = ["GCC", "INTERNATIONAL"] as const;
export const tenantPlanTiers = ["STANDARD", "ENTERPRISE"] as const;
export const vaultTypes = ["SAAS", "PRIVATE_CLOUD", "ON_PREMISE"] as const;

export const languageCodes = ["EN", "AR"] as const;
export const themeModes = ["LIGHT", "DARK", "SYSTEM"] as const;

export const entityTypes = ["SUBSIDIARY", "JV", "ASSOCIATE", "BRANCH"] as const;

export const documentSectors = ["GOV", "B2B", "INTERNAL"] as const;

export const documentStatuses = [
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "ARCHIVED",
] as const;

export const notificationTypes = [
  "EXPIRY_WARNING",
  "DOCUMENT_MISSING",
  "TASK_OVERDUE",
  "RISK_ESCALATION",
] as const;

export const notificationStates = [
  "PENDING",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "ESCALATED",
  "CLOSED",
] as const;

export const severityLevels = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const offlineSyncStatuses = ["PENDING", "SYNCED", "FAILED"] as const;

export const connectorTypes = [
  "ERP",
  "GOV_PORTAL",
  "STORAGE",
  "NOTIFICATION",
  "WEBHOOK",
] as const;

export const connectorStatuses = ["ACTIVE", "INACTIVE", "ERROR"] as const;

export const authActionPurposes = ["INVITE", "PASSWORD_RESET"] as const;

export const activityEventTypes = [
  "document.uploaded",
  "document.replaced",
  "document.archived",
  "document.deleted",
  "document.critical_master_marked",
  "governance.rule.updated",
  "notification.created",
  "notification.acknowledged",
  "notification.escalated",
  "notification.resolved",
  "taxonomy.category.updated",
  "taxonomy.entity.updated",
  "user.login.succeeded",
  "user.login.failed",
  "user.created",
  "user.invited",
  "user.password_reset_requested",
  "user.password_reset_completed",
  "user.updated",
  "connector.updated",
  "email.sent",
  "tenant.bootstrapped",
  "webhook.updated",
] as const;
