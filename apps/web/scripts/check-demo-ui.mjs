import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer";

const port = process.env.DEMO_CHECK_PORT ?? "4174";
const baseUrl = `http://127.0.0.1:${port}`;
const webRoot = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const viteBin = join(dirname(require.resolve("vite/package.json")), "bin", "vite.js");
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function run() {
  const server = spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", port, "--strictPort"],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        VITE_API_URL: "http://127.0.0.1:65535",
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
        const page = await browser.newPage();
        const browserErrors = [];
        const requests = [];

        page.on("pageerror", (error) => {
          browserErrors.push(error.message);
        });
        page.on("console", (message) => {
          if (
            message.type() === "error" &&
            !message.text().includes("Failed to load resource")
          ) {
            browserErrors.push(message.text());
          }
        });
        page.on("request", (request) => {
          requests.push(request.url());
        });

        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(`${baseUrl}/demo`, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        const initial = await page.evaluate(() => ({
          title: document.title,
          text: document.body.innerText,
          buttonCount: document.querySelectorAll("button").length,
          overflowX:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        }));

        if (!initial.text.includes("V-AXIS")) {
          throw new Error(`${viewport.name}: demo did not render V-AXIS text`);
        }

        if (initial.buttonCount < 20) {
          throw new Error(
            `${viewport.name}: expected at least 20 demo buttons, found ${initial.buttonCount}`,
          );
        }

        if (initial.overflowX > 1) {
          throw new Error(
            `${viewport.name}: horizontal overflow detected (${initial.overflowX}px)`,
          );
        }

        const apiRequests = requests.filter((url) =>
          /127\.0\.0\.1:65535|v-axis-api|api\/v1/.test(url),
        );
        if (apiRequests.length > 0) {
          throw new Error(
            `${viewport.name}: demo attempted API/database-dependent requests: ${apiRequests.join(", ")}`,
          );
        }

        for (let index = 0; index < initial.buttonCount; index += 1) {
          await page.goto(`${baseUrl}/demo`, {
            waitUntil: "networkidle0",
            timeout: 30000,
          });

          const target = await page.evaluate((buttonIndex) => {
            const buttons = [...document.querySelectorAll("button")];
            const button = buttons[buttonIndex];
            if (!button) {
              return null;
            }

            button.scrollIntoView({ block: "center", inline: "center" });
            const rect = button.getBoundingClientRect();

            return {
              index: buttonIndex,
              label: (
                button.innerText ||
                button.getAttribute("aria-label") ||
                ""
              )
                .trim()
                .slice(0, 80),
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

          if (!target) {
            throw new Error(`${viewport.name}: button ${index} disappeared`);
          }

          if (!target.clickable) {
            throw new Error(
              `${viewport.name}: button ${index} is not clickable (${target.label})`,
            );
          }

          await page.evaluate((index) => {
            document.querySelectorAll("button")[index].click();
          }, target.index);
          await wait(75);
        }

        for (let step = 0; step < 35; step += 1) {
          const target = await page.evaluate((stepIndex) => {
            const buttons = [...document.querySelectorAll("button")];
            const visible = buttons
              .map((button, index) => {
                const rect = button.getBoundingClientRect();
                return {
                  index,
                  visible:
                    rect.width > 0 &&
                    rect.height > 0 &&
                    rect.bottom >= 0 &&
                    rect.top <= window.innerHeight &&
                    !button.disabled,
                };
              })
              .filter((button) => button.visible);

            return visible[stepIndex % visible.length] ?? null;
          }, step);

          if (!target) {
            throw new Error(`${viewport.name}: no visible button to click`);
          }

          await page.evaluate((index) => {
            document
              .querySelectorAll("button")
              [index].scrollIntoView({ block: "center", inline: "center" });
          }, target.index);
          await page.evaluate((index) => {
            document.querySelectorAll("button")[index].click();
          }, target.index);
          await wait(75);
        }

        if (browserErrors.length > 0) {
          throw new Error(
            `${viewport.name}: browser errors: ${browserErrors.join(" | ")}`,
          );
        }

        await page.close();
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

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
