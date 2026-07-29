import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../server/app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await app(req, res);
}
