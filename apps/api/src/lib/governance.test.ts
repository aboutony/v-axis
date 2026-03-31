import { describe, expect, it } from "vitest";

import {
  isNotificationOverdue,
  pickEscalationAssignee,
  resolveNotificationWorkflowState,
} from "./governance";

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

  it("preserves due date and assignee for open notifications during refresh", () => {
    expect(
      resolveNotificationWorkflowState({
        existing: {
          status: "ESCALATED",
          dueDate: "2026-03-30",
          assignedTo: "admin-1",
          delegatedBy: "manager-2",
          escalationLevel: 3,
          resolvedAt: null,
        },
        defaultAssignedTo: "manager-2",
        defaultEscalationLevel: 2,
        payloadDueDate: new Date("2026-04-14T00:00:00.000Z"),
      }),
    ).toEqual({
      status: "ESCALATED",
      dueDate: "2026-03-30",
      assignedTo: "admin-1",
      delegatedBy: "manager-2",
      escalationLevel: 3,
      resolvedAt: null,
    });
  });

  it("restarts workflow defaults when a notification is reopened", () => {
    expect(
      resolveNotificationWorkflowState({
        existing: {
          status: "CLOSED",
          dueDate: "2026-03-30",
          assignedTo: "admin-1",
          delegatedBy: "manager-2",
          escalationLevel: 3,
          resolvedAt: new Date("2026-03-31T00:00:00.000Z"),
        },
        defaultAssignedTo: "manager-2",
        defaultEscalationLevel: 2,
        payloadDueDate: new Date("2026-04-14T00:00:00.000Z"),
      }),
    ).toEqual({
      status: "PENDING",
      dueDate: "2026-04-14",
      assignedTo: "manager-2",
      delegatedBy: null,
      escalationLevel: 2,
      resolvedAt: null,
    });
  });
});
