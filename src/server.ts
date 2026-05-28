import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp({
  logger: {
    level: config.logLevel
  }
});

try {
  await app.listen({
    host: config.host,
    port: config.port
  });
} catch (error) {
  app.log.error({ error }, "Failed to start server");
  process.exit(1);
}
