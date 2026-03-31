import { describe, expect, it } from "vitest";

import { buildUserActionExpiry, buildUserActionLink } from "./user-actions";

describe("user action helpers", () => {
  it("uses purpose-specific expiration windows", () => {
    const now = new Date("2026-03-31T00:00:00.000Z");

    expect(buildUserActionExpiry("INVITE", now).toISOString()).toBe(
      "2026-04-03T00:00:00.000Z",
    );
    expect(buildUserActionExpiry("PASSWORD_RESET", now).toISOString()).toBe(
      "2026-03-31T02:00:00.000Z",
    );
  });

  it("builds workspace access links on the configured app base url", () => {
    const link = buildUserActionLink("sample-token");

    expect(link).toContain("/access");
    expect(link).toContain("token=sample-token");
  });
});
