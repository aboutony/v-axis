import type { PermissionFlag, UserRole } from "@vaxis/domain";

export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  role: UserRole;
  permissions: PermissionFlag[];
  email: string;
};
