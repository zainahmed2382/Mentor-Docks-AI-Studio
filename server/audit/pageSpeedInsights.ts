import type { CoreWebVitals, LighthouseCategoryScores, PageSpeedResult, PsiAuditItem, ScanStrategy } from "./types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function scoreFromCategory(cat: { score?: number | null } | undefined): number {
  if (cat?.score == null) return 0;
  return Math.round(cat.score * 100);
}

function extractNumeric(audit: any): number | undefined {
  if (typeof audit?.numericValue === "number") return audit.numericValue;
  return undefined;
}

function mapAudits(lighthouseResult: any): PsiAuditItem[] {
  const audits = lighthouseResult?.audits || {};
  const items: PsiAuditItem[] = [];

  for (const [id, audit] of Object.entries(audits) as [string, any][]) {
    if (!audit?.title) continue;
    const score = typeof audit.score === "number" ? audit.score : null;
    if (score !== null && score >= 0.9) continue;
    if (audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") continue;

    items.push({
      id,
      title: audit.title,
      description: audit.description || "",
      score,
      displayValue: audit.displayValue,
      numericValue: extractNumeric(audit),
    });
  }

  return items.sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 25);
}

function extractCoreWebVitals(lighthouseResult: any): CoreWebVitals {
  const audits = lighthouseResult?.audits || {};
  return {
    lcpMs: extractNumeric(audits["largest-contentful-paint"]) ?? null,
    cls: extractNumeric(audits["cumulative-layout-shift"]) ?? null,
    inpMs: extractNumeric(audits["interaction-to-next-paint"]) ?? extractNumeric(audits["experimental-interaction-to-next-paint"]) ?? null,
    fcpMs: extractNumeric(audits["first-contentful-paint"]) ?? null,
    ttfbMs: extractNumeric(audits["server-response-time"]) ?? extractNumeric(audits["time-to-first-byte"]) ?? null,
    speedIndex: extractNumeric(audits["speed-index"]) ?? null,
  };
}

function extractCategories(lighthouseResult: any): LighthouseCategoryScores {
  const cats = lighthouseResult?.categories || {};
  return {
    performance: scoreFromCategory(cats.performance),
    accessibility: scoreFromCategory(cats.accessibility),
    seo: scoreFromCategory(cats.seo),
    bestPractices: scoreFromCategory(cats["best-practices"]),
  };
}

export async function runPageSpeedInsights(url: string, strategy: ScanStrategy = "mobile"): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || "";

  const params = new URLSearchParams({
    url,
    strategy,
    category: "PERFORMANCE",
  });
  params.append("category", "ACCESSIBILITY");
  params.append("category", "SEO");
  params.append("category", "BEST_PRACTICES");
  if (apiKey) params.set("key", apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      return {
        strategy,
        categories: { performance: 0, accessibility: 0, seo: 0, bestPractices: 0 },
        coreWebVitals: { lcpMs: null, cls: null, inpMs: null, fcpMs: null, ttfbMs: null, speedIndex: null },
        audits: [],
        fetchTime: new Date().toISOString(),
        lighthouseVersion: "",
        error: `PageSpeed Insights API error (${response.status}): ${text.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const lighthouseResult = data.lighthouseResult;

    return {
      strategy,
      categories: extractCategories(lighthouseResult),
      coreWebVitals: extractCoreWebVitals(lighthouseResult),
      audits: mapAudits(lighthouseResult),
      fetchTime: data.analysisUTCTimestamp || new Date().toISOString(),
      lighthouseVersion: lighthouseResult?.lighthouseVersion || "",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      strategy,
      categories: { performance: 0, accessibility: 0, seo: 0, bestPractices: 0 },
      coreWebVitals: { lcpMs: null, cls: null, inpMs: null, fcpMs: null, ttfbMs: null, speedIndex: null },
      audits: [],
      fetchTime: new Date().toISOString(),
      lighthouseVersion: "",
      error: err?.name === "AbortError" ? "PageSpeed Insights request timed out" : err?.message || "PageSpeed Insights failed",
    };
  }
}
