import { describe, expect, it } from "vitest";

import {
  collectTrustedFrontendOrigins,
  resolveTrustedFrontendBaseUrl,
} from "./frontend-origin";

describe("frontend origin helpers", () => {
  it("collects exact frontend origins from CORS and app base url", () => {
    expect(
      collectTrustedFrontendOrigins({
        corsOrigin:
          "https://portal.example.com, https://preview.example.com, invalid",
        appBaseUrl: "https://portal.example.com/access",
      }),
    ).toEqual([
      "https://portal.example.com",
      "https://preview.example.com",
    ]);
  });

  it("uses the current trusted origin for generated links", () => {
    expect(
      resolveTrustedFrontendBaseUrl({
        origin: "https://preview.example.com",
        trustedOrigins: [
          "https://portal.example.com",
          "https://preview.example.com",
        ],
        fallbackBaseUrl: "https://portal.example.com",
      }),
    ).toBe("https://preview.example.com");
  });

  it("falls back when the request origin is not trusted", () => {
    expect(
      resolveTrustedFrontendBaseUrl({
        origin: "https://unknown.example.com",
        referer: "https://evil.example.com/workspace",
        trustedOrigins: ["https://portal.example.com"],
        fallbackBaseUrl: "https://portal.example.com",
      }),
    ).toBe("https://portal.example.com");
  });

  it("rejects wildcard and non-http origins from trusted origin policy", () => {
    expect(
      collectTrustedFrontendOrigins({
        corsOrigin: "*, https://portal.example.com, ftp://files.example.com",
        appBaseUrl: "javascript:alert(1)",
      }),
    ).toEqual(["https://portal.example.com"]);
  });
});
