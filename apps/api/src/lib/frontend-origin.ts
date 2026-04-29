type HeaderValue = string | string[] | undefined;

function normalizeHeaderValue(value: HeaderValue) {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0)?.trim();
  }

  return value?.trim();
}

function toOrigin(value?: string) {
  if (!value) {
    return null;
  }

  if (value.includes("*")) {
    return null;
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function collectTrustedFrontendOrigins(input: {
  corsOrigin: string;
  appBaseUrl?: string;
}) {
  const configuredOrigins = input.corsOrigin
    .split(",")
    .map((entry) => toOrigin(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));

  const appBaseOrigin = toOrigin(input.appBaseUrl);

  return Array.from(
    new Set(
      appBaseOrigin
        ? [...configuredOrigins, appBaseOrigin]
        : configuredOrigins,
    ),
  );
}

export function resolveTrustedFrontendBaseUrl(input: {
  origin?: HeaderValue;
  referer?: HeaderValue;
  trustedOrigins: string[];
  fallbackBaseUrl: string;
}) {
  const candidates = [
    normalizeHeaderValue(input.origin),
    normalizeHeaderValue(input.referer),
  ]
    .map((value) => toOrigin(value))
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (input.trustedOrigins.includes(candidate)) {
      return candidate;
    }
  }

  return input.fallbackBaseUrl;
}
