import { apiEnv } from "./config";
import { createApp } from "./app";

async function main() {
  const app = await createApp();

  await app.listen({
    host: apiEnv.HOST,
    port: apiEnv.PORT,
  });
}

main().catch((error) => {
  console.error("Failed to start API.", error);
  process.exitCode = 1;
});
