// apps/web/src/types/auth.ts

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: "MASTER_ADMIN" | "CLIENT_ADMIN" | "SUBSIDIARY_MANAGER" | "STAFF";
  permissions: string[];
  preferredLanguage: string;
  preferredTheme: string;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  timezone: string;
}

export interface Tenant {
  id: string;
  clientName: string;
  slug: string;
}

export interface AuthSession {
  accessToken: string;
  refreshTokenExpiresAt: string;
  user: User;
  tenant: Tenant;
}

export interface BootstrapInput {
  clientName: string;
  slug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface BootstrapResponse {
  message: string;
  tenant: Tenant;
  admin: {
    id: string;
    email: string;
    fullName: string;
  };
  nextSteps: string[];
}

export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
  mfaCode?: string;
}

export interface MfaEnrollment {
  method: "TOTP";
  qrDataUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface PlatformBootstrap {
  platform: {
    name: string;
    tagline: string;
    categorySlots: number;
  };
  platformState: {
    tenantCount: number;
    hasTenants: boolean;
    databaseReady: boolean;
    startupIssue: string | null;
  };
  security: {
    auth: string;
    encryption: string;
    residency: string;
  };
  roles: string[];
  permissions: string[];
  defaultPermissionsByRole: Record<string, string[]>;
  seededDocumentTypes: Array<{
    code: number;
    label: string;
    arabicLabel?: string;
    sector: string;
    requiresExpiry: boolean;
    requiresCr: boolean;
    notes: string;
  }>;
  roadmap: string[];
}
