import { describe, expect, it } from "vitest";

import { buildExportSummary, createDemoState } from "./demoJourney";

describe("demoJourney", () => {
  it("builds a warning scenario with actionable demo records", () => {
    const state = createDemoState("warning");

    expect(state.documents.length).toBeGreaterThan(0);
    expect(state.workforce.length).toBeGreaterThan(0);
    expect(
      state.documents.some((document) => document.title.includes("Baladiyah")),
    ).toBe(true);
    expect(
      state.workforce.some((employee) => employee.status === "expiring-soon"),
    ).toBe(true);
  });

  it("exports a seeded management summary for a subsidiary", () => {
    const state = createDemoState("warning");
    const summary = buildExportSummary(state, "Zedan Retail", "warning");

    expect(summary).toContain("Zedan Retail");
    expect(summary).toContain("Baladiyah License");
    expect(summary).toContain("Workforce records");
  });
});
