const apiBaseUrl = (
  process.env.VAXIS_API_BASE_URL ?? "https://v-axis-api.onrender.com"
).replace(/\/$/, "");
const frontendOrigin =
  process.env.VAXIS_FRONTEND_ORIGIN ?? "https://v-axis-web.vercel.app";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, body };
}

async function checkHealth() {
  const { response, body } = await request("/health");
  assert(response.ok, `/health failed with ${response.status}`);
  assert(body.status === "ok", "/health did not report ok");
  return body;
}

async function checkDocs() {
  const { response } = await request("/docs");
  assert(response.ok, `/docs failed with ${response.status}`);
}

async function checkBootstrapReadiness() {
  const { response, body } = await request("/api/v1/platform/bootstrap");
  assert(response.ok, `/api/v1/platform/bootstrap failed with ${response.status}`);
  return body;
}

async function checkCors() {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: frontendOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  assert(response.status === 204, `CORS preflight returned ${response.status}`);
  assert(
    response.headers.get("access-control-allow-origin") === frontendOrigin,
    "CORS allow-origin does not match frontend origin",
  );
  assert(
    response.headers.get("access-control-allow-credentials") === "true",
    "CORS credentials are not enabled",
  );
}

async function checkRedisIfConfigured() {
  if (!process.env.REDIS_URL) {
    return { skipped: true, reason: "REDIS_URL not provided" };
  }

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 10000,
  });

  try {
    const pong = await redis.ping();
    assert(pong === "PONG", "Redis ping did not return PONG");
    return { skipped: false, status: "ok" };
  } finally {
    redis.disconnect();
  }
}

async function checkOptionalTenantBootstrap() {
  if (process.env.VAXIS_RUN_TENANT_BOOTSTRAP !== "true") {
    return { skipped: true, reason: "VAXIS_RUN_TENANT_BOOTSTRAP is not true" };
  }

  const slug = `phase3-${Date.now()}`;
  const { response, body } = await request("/api/v1/auth/bootstrap-client", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: frontendOrigin,
    },
    body: JSON.stringify({
      clientName: "Phase 3 Validation Tenant",
      slug,
      adminFullName: "Phase 3 Validator",
      adminEmail: `phase3-${Date.now()}@example.com`,
      adminPassword: `Vaxis-${Date.now()}!`,
    }),
  });

  assert(
    response.status === 201,
    `Tenant bootstrap failed with ${response.status}: ${JSON.stringify(body)}`,
  );

  return {
    skipped: false,
    tenant: body.tenant,
  };
}

async function main() {
  const health = await checkHealth();
  await checkDocs();
  const bootstrap = await checkBootstrapReadiness();
  await checkCors();
  const redis = await checkRedisIfConfigured();
  const tenantBootstrap = await checkOptionalTenantBootstrap();

  const result = {
    apiBaseUrl,
    frontendOrigin,
    health,
    platformState: bootstrap.platformState,
    cors: "ok",
    redis,
    tenantBootstrap,
  };

  console.log(JSON.stringify(result, null, 2));

  assert(
    bootstrap.platformState.databaseReady === true,
    `Database is not ready: ${bootstrap.platformState.startupIssue ?? "unknown issue"}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
