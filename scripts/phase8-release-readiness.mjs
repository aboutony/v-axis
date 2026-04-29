import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps", "web");
const viteBin = join(dirname(require.resolve("vite/package.json")), "bin", "vite.js");
const port = process.env.PHASE8_QA_PORT ?? "4188";
const baseUrl = `http://127.0.0.1:${port}`;
const apiBaseUrl = process.env.VAXIS_API_BASE_URL?.replace(/\/$/, "");
const frontendOrigin =
  process.env.VAXIS_FRONTEND_ORIGIN ?? "https://v-axis-web.vercel.app";
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await wait(500);
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function inspectRoute(page, route, viewport) {
  const browserErrors = [];

  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.includes("Failed to load resource") &&
      !text.includes("net::ERR_CONNECTION_REFUSED")
    ) {
      browserErrors.push(text);
    }
  });

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  const state = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const primaryButtons = buttons.map((button, index) => {
      const rect = button.getBoundingClientRect();
      return {
        index,
        label: (
          button.innerText ||
          button.getAttribute("aria-label") ||
          ""
        ).trim(),
        clickable:
          rect.width > 0 &&
          rect.height > 0,
      };
    });

    return {
      text: document.body.innerText,
      overflowX:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      buttonCount: buttons.length,
      brokenButtons: primaryButtons.filter((button) => !button.clickable),
    };
  });

  assert(
    state.overflowX <= 1,
    `${viewport.name} ${route}: horizontal overflow detected (${state.overflowX}px)`,
  );
  assert(
    state.buttonCount > 0,
    `${viewport.name} ${route}: no primary buttons rendered`,
  );
  assert(
    state.brokenButtons.length === 0,
    `${viewport.name} ${route}: non-clickable buttons: ${JSON.stringify(
      state.brokenButtons,
    )}`,
  );
  assert(
    browserErrors.length === 0,
    `${viewport.name} ${route}: console/page errors: ${browserErrors.join(" | ")}`,
  );

  return state;
}

async function clickInitialButtons(page, route, viewport, minimumButtons) {
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  const buttonCount = await page.evaluate(
    () => [...document.querySelectorAll("button")].filter((button) => !button.disabled).length,
  );
  assert(
    buttonCount >= minimumButtons,
    `${viewport.name} ${route}: expected at least ${minimumButtons} buttons, found ${buttonCount}`,
  );

  for (let index = 0; index < buttonCount; index += 1) {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    const target = await page.evaluate((buttonIndex) => {
      const button = [...document.querySelectorAll("button")].filter(
        (entry) => !entry.disabled,
      )[buttonIndex];
      if (!button) {
        return null;
      }

      button.scrollIntoView({ block: "center", inline: "center" });
      const rect = button.getBoundingClientRect();
      return {
        index: buttonIndex,
        clickable:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right >= 0 &&
          rect.left <= window.innerWidth &&
          rect.bottom >= 0 &&
          rect.top <= window.innerHeight &&
          !button.disabled,
      };
    }, index);

    assert(target?.clickable, `${viewport.name} ${route}: button ${index} not clickable`);
    await page.evaluate((buttonIndex) => {
              [...document.querySelectorAll("button")].filter(
                (button) => !button.disabled,
              )[buttonIndex].click();
    }, index);
    await wait(75);
  }
}

async function runBrowserQa() {
  const server = spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", port, "--strictPort"],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        VITE_API_URL: process.env.VITE_API_URL ?? "http://127.0.0.1:65535",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer(`${baseUrl}/demo`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      for (const viewport of viewports) {
        const demoPage = await browser.newPage();
        const demo = await inspectRoute(demoPage, "/demo", viewport);
        assert(
          demo.text.includes("V-AXIS"),
          `${viewport.name} /demo: V-AXIS text not found`,
        );
        await clickInitialButtons(demoPage, "/demo", viewport, 20);
        await demoPage.close();

        const appPage = await browser.newPage();
        const app = await inspectRoute(appPage, "/app", viewport);
        assert(
          app.text.includes("V-AXIS"),
          `${viewport.name} /app: V-AXIS text not found`,
        );
        await clickInitialButtons(appPage, "/app", viewport, 2);
        await appPage.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(serverOutput);
    throw error;
  } finally {
    server.kill();
    await Promise.race([once(server, "exit"), wait(3000)]);
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

async function runApiQa() {
  if (!apiBaseUrl) {
    return {
      skipped: true,
      reason: "VAXIS_API_BASE_URL not provided",
    };
  }

  const health = await request("/health");
  assert(health.response.ok, `/health failed with ${health.response.status}`);
  assert(health.body.status === "ok", "/health did not report ok");

  const docs = await request("/docs");
  assert(docs.response.ok, `/docs failed with ${docs.response.status}`);

  const bootstrap = await request("/api/v1/platform/bootstrap");
  assert(
    bootstrap.response.ok,
    `/api/v1/platform/bootstrap failed with ${bootstrap.response.status}`,
  );
  assert(
    bootstrap.body.platformState.databaseReady === true,
    `Database not ready: ${bootstrap.body.platformState.startupIssue ?? "unknown"}`,
  );

  const cors = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: frontendOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert(cors.status === 204, `CORS preflight returned ${cors.status}`);
  assert(
    cors.headers.get("access-control-allow-origin") === frontendOrigin,
    "CORS allow-origin does not match frontend origin",
  );

  const protectedChecks = [
    "/api/v1/documents",
    "/api/v1/audit",
    "/api/v1/automation",
  ];

  for (const path of protectedChecks) {
    const result = await request(path);
    assert(
      result.response.status === 401,
      `${path} should require auth and returned ${result.response.status}`,
    );
  }

  return {
    skipped: false,
    apiBaseUrl,
    frontendOrigin,
    platformState: bootstrap.body.platformState,
  };
}

async function main() {
  await runBrowserQa();
  const api = await runApiQa();

  const result = {
    browser: "ok",
    api,
    manualProductionJourneys: [
      "tenant bootstrap",
      "login",
      "MFA enrollment and verification",
      "invite acceptance",
      "password reset",
      "entity setup",
      "document upload",
      "OCR extraction and approval",
      "governance recalculation",
      "notifications and escalation",
      "audit export",
      "webhook test",
      "worker replay",
    ],
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
