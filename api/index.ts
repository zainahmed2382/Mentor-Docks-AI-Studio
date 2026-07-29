import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);

const app = require("./_server.cjs").default;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await app(req, res);
}
