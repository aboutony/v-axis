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
  permissionFlags,
  severityLevels,
  tenantPlanTiers,
  tenantRegions,
  tenantStatuses,
  themeModes,
  userRoles,
  vaultTypes,
} from "./constants";

export type UserRole = (typeof userRoles)[number];
export type PermissionFlag = (typeof permissionFlags)[number];
export type TenantStatus = (typeof tenantStatuses)[number];
export type TenantRegion = (typeof tenantRegions)[number];
export type TenantPlanTier = (typeof tenantPlanTiers)[number];
export type VaultType = (typeof vaultTypes)[number];
export type LanguageCode = (typeof languageCodes)[number];
export type ThemeMode = (typeof themeModes)[number];
export type EntityType = (typeof entityTypes)[number];
export type DocumentSector = (typeof documentSectors)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type NotificationType = (typeof notificationTypes)[number];
export type NotificationState = (typeof notificationStates)[number];
export type SeverityLevel = (typeof severityLevels)[number];
export type OfflineSyncStatus = (typeof offlineSyncStatuses)[number];
export type ConnectorType = (typeof connectorTypes)[number];
export type ConnectorStatus = (typeof connectorStatuses)[number];
export type ActivityEventType = (typeof activityEventTypes)[number];
