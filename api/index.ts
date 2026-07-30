import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundlePath = path.join(__dirname, "_server.cjs");

let app: any;
try {
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Server bundle not found at ${bundlePath}. ` +
      `Make sure "npm run build:server" completed successfully during the Vercel build step.`
    );
  }
  app = require(bundlePath).default;
  if (!app || typeof app !== "function") {
    throw new Error("Server bundle did not export a default Express app function.");
  }
} catch (loadErr: any) {
  const msg = loadErr?.message || String(loadErr);
  console.error("[FATAL] Failed to load server bundle:", msg);
  app = function fallbackApp(req: VercelRequest, res: VercelResponse) {
    res.status(500).json({
      error: "Server failed to initialize.",
      detail: msg,
    });
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await app(req, res);
}
