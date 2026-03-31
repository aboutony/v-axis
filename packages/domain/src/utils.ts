import { severityLevels } from "./constants";
import type { SeverityLevel } from "./types";

export function toDnaCode(input: {
  categorySlot: number;
  subDesignator: string;
  entityCode: string;
  year: number;
  sequence: number;
}): string {
  const category = String(input.categorySlot).padStart(2, "0");
  const sequence = String(input.sequence).padStart(3, "0");

  return [
    category,
    input.subDesignator.toUpperCase(),
    input.entityCode.toUpperCase(),
    String(input.year),
    sequence,
  ].join("-");
}

export function getSeverityRank(severity: SeverityLevel): number {
  return severityLevels.indexOf(severity);
}

export function getExpirySeverity(daysUntilExpiry: number): SeverityLevel {
  if (daysUntilExpiry <= 10) {
    return "CRITICAL";
  }

  if (daysUntilExpiry <= 30) {
    return "HIGH";
  }

  if (daysUntilExpiry <= 60) {
    return "MEDIUM";
  }

  if (daysUntilExpiry <= 90) {
    return "LOW";
  }

  return "INFO";
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
