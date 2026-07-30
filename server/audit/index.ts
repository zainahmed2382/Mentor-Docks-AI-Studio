import { buildAuditReport } from "./buildReport";
import { crawlWebsite } from "./httpCrawl";
import { normalizeUrl } from "./normalizeUrl";
import { runPageSpeedInsights } from "./pageSpeedInsights";
import type { AuditOptions, RawAuditData } from "./types";

export type { AuditOptions } from "./types";

export async function runWebsiteAudit(inputUrl: string, options: AuditOptions = {}) {
  const normalized = normalizeUrl(inputUrl);
  if (!normalized.ok) {
    throw new Error(normalized.error);
  }

  const url = normalized.url;
  const strategy = options.strategy || "mobile";
  const deep = options.deep ?? !process.env.VERCEL;

  console.log(`[Audit] Starting scan for ${url} (deep=${deep}, strategy=${strategy})`);

  const crawl = await crawlWebsite(url, options);

  const tasks: Promise<unknown>[] = [];

  let pageSpeedPromise: ReturnType<typeof runPageSpeedInsights> | null = null;
  if (options.checks?.performanceWebVitals !== false) {
    pageSpeedPromise = runPageSpeedInsights(crawl.finalUrl || url, strategy);
    tasks.push(pageSpeedPromise);
  }

  let browserPromise: Promise<import("./types").BrowserAuditResult | null> = Promise.resolve(null);
  if (deep && !process.env.VERCEL) {
    browserPromise = import("./browserAudit")
      .then(({ runBrowserAudit }) => runBrowserAudit(crawl.finalUrl || url, { ...options, strategy }))
      .catch((err) => {
        console.warn("[Audit] Browser audit skipped:", err?.message);
        return null;
      });
    tasks.push(browserPromise);
  }

  await Promise.all(tasks);

  const raw: RawAuditData = {
    crawl,
    pageSpeed: pageSpeedPromise ? await pageSpeedPromise : null,
    browser: await browserPromise,
  };

  const report = buildAuditReport(raw, options);

  return {
    ...report,
    url,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: "completed" as const,
    auditMeta: {
      engine: deep && !process.env.VERCEL ? "lighthouse+puppeteer+psi+http" : "pagespeed+http",
      finalUrl: crawl.finalUrl,
      statusCode: crawl.statusCode,
      responseTimeMs: crawl.responseTimeMs,
      lighthouseVersion: raw.pageSpeed?.lighthouseVersion || null,
      pageSpeedError: raw.pageSpeed?.error || null,
      browserAuditError: raw.browser?.error || null,
    },
  };
}
