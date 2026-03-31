import { and, eq, isNull } from "drizzle-orm";

import { db } from "@vaxis/db";
import { tenants } from "@vaxis/db/schema";

import {
  escalateOverdueNotifications,
  refreshTenantGovernance,
} from "./governance";

async function listActiveTenantIds() {
  const tenantRows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)));

  return tenantRows.map((tenant) => tenant.id);
}

export async function refreshGovernanceAcrossTenants() {
  const tenantIds = await listActiveTenantIds();
  let totalEntities = 0;
  const failedTenantIds: string[] = [];

  for (const tenantId of tenantIds) {
    try {
      const result = await refreshTenantGovernance({ tenantId });
      totalEntities += result.entityCount;
    } catch (error) {
      failedTenantIds.push(tenantId);
      console.error(
        `[worker] Governance refresh failed for tenant ${tenantId}.`,
        error,
      );
    }
  }

  return {
    tenantCount: tenantIds.length,
    refreshedEntityCount: totalEntities,
    failedTenantIds,
  };
}

export async function escalateNotificationsAcrossTenants() {
  const tenantIds = await listActiveTenantIds();
  let escalatedCount = 0;
  const failedTenantIds: string[] = [];

  for (const tenantId of tenantIds) {
    try {
      const result = await escalateOverdueNotifications({ tenantId });
      escalatedCount += result.escalatedCount;
    } catch (error) {
      failedTenantIds.push(tenantId);
      console.error(
        `[worker] Notification escalation failed for tenant ${tenantId}.`,
        error,
      );
    }
  }

  return {
    tenantCount: tenantIds.length,
    escalatedCount,
    failedTenantIds,
  };
}
