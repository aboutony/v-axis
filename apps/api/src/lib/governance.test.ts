import { describe, expect, it } from "vitest";

import { isNotificationOverdue, pickEscalationAssignee } from "./governance";

describe("governance escalation helpers", () => {
  it("marks only past-due notifications as overdue", () => {
    const now = new Date("2026-03-31T10:00:00.000Z");

    expect(isNotificationOverdue("2026-03-30", now)).toBe(true);
    expect(isNotificationOverdue("2026-03-31", now)).toBe(false);
    expect(isNotificationOverdue("2026-04-01", now)).toBe(false);
    expect(isNotificationOverdue(null, now)).toBe(false);
  });

  it("prefers the supervisor before broader fallbacks", () => {
    expect(
      pickEscalationAssignee({
        currentAssignedTo: "staff-1",
        supervisorUserId: "manager-1",
        entityManagerUserId: "manager-2",
        clientAdminUserId: "admin-1",
      }),
    ).toEqual({
      userId: "manager-1",
      reason: "supervisor",
    });
  });

  it("falls back to entity manager and then client admin", () => {
    expect(
      pickEscalationAssignee({
        currentAssignedTo: null,
        supervisorUserId: null,
        entityManagerUserId: "manager-2",
        clientAdminUserId: "admin-1",
      }),
    ).toEqual({
      userId: "manager-2",
      reason: "entity_manager",
    });

    expect(
      pickEscalationAssignee({
        currentAssignedTo: "manager-2",
        supervisorUserId: null,
        entityManagerUserId: "manager-2",
        clientAdminUserId: "admin-1",
      }),
    ).toEqual({
      userId: "admin-1",
      reason: "client_admin",
    });
  });
});
