import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "3001";
// Default to 3001 if not provided so local dev with pnpm -w works cross-platform
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
