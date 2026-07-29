import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = require(path.join(__dirname, "..", "dist", "server.cjs")).default;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await app(req, res);
}
