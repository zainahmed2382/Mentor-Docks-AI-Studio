import type { AuditOptions, BuiltReport, RawAuditData } from "./types.ts";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function severityFromScore(score: number | null | undefined): "critical" | "medium" | "minor" {
  if (score == null) return "medium";
  if (score < 0.5) return "critical";
  if (score < 0.75) return "medium";
  return "minor";
}

function mapPsiCategory(auditId: string): BuiltReport["problems"][0]["category"] {
  if (auditId.includes("seo") || auditId.includes("meta") || auditId.includes("canonical")) return "seo";
  if (auditId.includes("accessibility") || auditId.includes("aria") || auditId.includes("alt")) return "accessibility";
  if (auditId.includes("font") || auditId.includes("heading")) return "typography";
  if (auditId.includes("color") || auditId.includes("contrast")) return "color";
  if (auditId.includes("responsive") || auditId.includes("viewport")) return "responsive";
  if (auditId.includes("javascript") || auditId.includes("errors-in-console")) return "code";
  if (auditId.includes("performance") || auditId.includes("render") || auditId.includes("lcp") || auditId.includes("cls")) {
    return "performance";
  }
  return "ux";
}

export function buildAuditReport(data: RawAuditData, options: AuditOptions = {}): BuiltReport {
  const checks = options.checks ?? {};
  const problems: BuiltReport["problems"] = [];
  const recommendations: BuiltReport["recommendations"] = [];

  const { crawl, pageSpeed, browser } = data;
  const html = crawl.htmlAnalysis;

  if (!crawl.isAccessible) {
    problems.push({
      id: nextId("p"),
      title: "Website unreachable",
      severity: "critical",
      description: crawl.error || `The server returned HTTP ${crawl.statusCode}. Audits may be incomplete until the site is reachable.`,
      category: "performance",
    });
  }

  if (!crawl.httpsSupported) {
    problems.push({
      id: nextId("p"),
      title: "HTTPS not enforced",
      severity: "critical",
      description: "The final URL is not served over HTTPS. Browsers and search engines penalize insecure origins.",
      category: "code",
    });
    recommendations.push({
      id: nextId("r"),
      title: "Enable HTTPS redirects",
      description: "Issue a valid TLS certificate and redirect all HTTP traffic to HTTPS with HSTS.",
      pointsAdded: 12,
      category: "security",
    });
  }

  if (checks.securityHeaders !== false && crawl.security.missing.length > 0) {
    const missing = crawl.security.missing.join(", ");
    problems.push({
      id: nextId("p"),
      title: "Missing security headers",
      severity: crawl.security.missing.length >= 4 ? "critical" : "medium",
      description: `The response is missing recommended headers: ${missing}. These reduce XSS, clickjacking, and MIME-sniffing risk.`,
      category: "code",
    });
    recommendations.push({
      id: nextId("r"),
      title: "Harden HTTP response headers",
      description: `Add ${missing} on your CDN or origin. Start with Content-Security-Policy, Strict-Transport-Security, and X-Content-Type-Options.`,
      pointsAdded: 10,
      category: "security",
    });
  }

  if (html) {
    if (!html.hasViewport) {
      problems.push({
        id: nextId("p"),
        title: "Missing viewport meta tag",
        severity: "critical",
        description: "No mobile viewport configuration was found, which breaks responsive layout on phones.",
        category: "responsive",
      });
      recommendations.push({
        id: nextId("r"),
        title: "Add viewport meta tag",
        description: 'Insert `<meta name="viewport" content="width=device-width, initial-scale=1">` in the document head.',
        pointsAdded: 20,
        category: "responsive",
      });
    }

    const missingAlt = html.imageCount - html.imagesWithAlt - html.imagesWithEmptyAlt;
    if (missingAlt > 0) {
      problems.push({
        id: nextId("p"),
        title: "Images missing alt text",
        severity: missingAlt > 3 ? "critical" : "medium",
        description: `${missingAlt} of ${html.imageCount} images lack descriptive alt attributes, hurting screen reader accessibility.`,
        category: "accessibility",
      });
    }

    if (html.headings.h1 === 0) {
      problems.push({
        id: nextId("p"),
        title: "Missing H1 heading",
        severity: "medium",
        description: "No H1 element was detected. A single clear H1 improves SEO and document outline.",
        category: "seo",
      });
    } else if (html.headings.h1 > 1) {
      problems.push({
        id: nextId("p"),
        title: "Multiple H1 headings",
        severity: "minor",
        description: `Found ${html.headings.h1} H1 tags. Prefer one primary H1 per page for clarity.`,
        category: "typography",
      });
    }

    if (checks.seoOptimization !== false) {
      if (!html.metaDescription) {
        problems.push({
          id: nextId("p"),
          title: "Missing meta description",
          severity: "medium",
          description: "No meta description tag was found, which limits control over search result snippets.",
          category: "seo",
        });
      }
      if (html.ogTagsCount === 0) {
        problems.push({
          id: nextId("p"),
          title: "Missing Open Graph tags",
          severity: "minor",
          description: "Open Graph metadata was not detected, so social shares may show generic previews.",
          category: "seo",
        });
      }
    }

    if (html.duplicateIds.length > 0) {
      problems.push({
        id: nextId("p"),
        title: "Duplicate element IDs",
        severity: "medium",
        description: `Duplicate IDs detected (${html.duplicateIds.slice(0, 3).join(", ")}). IDs must be unique for accessibility and scripting.`,
        category: "code",
      });
    }

    if (html.missingFormLabels > 0) {
      problems.push({
        id: nextId("p"),
        title: "Unlabeled form controls",
        severity: "medium",
        description: `${html.missingFormLabels} form fields appear without associated labels or aria-label attributes.`,
        category: "accessibility",
      });
    }
  }

  if (checks.performanceWebVitals !== false && pageSpeed) {
    if (pageSpeed.error) {
      problems.push({
        id: nextId("p"),
        title: "PageSpeed Insights unavailable",
        severity: "medium",
        description: pageSpeed.error,
        category: "performance",
      });
    } else {
      for (const audit of pageSpeed.audits.slice(0, 8)) {
        problems.push({
          id: nextId("p"),
          title: audit.title,
          severity: severityFromScore(audit.score),
          description: [audit.description, audit.displayValue].filter(Boolean).join(" — ").slice(0, 500),
          category: mapPsiCategory(audit.id),
        });
      }

      const { lcpMs, cls, inpMs } = pageSpeed.coreWebVitals;
      if (lcpMs != null && lcpMs > 2500) {
        problems.push({
          id: nextId("p"),
          title: "Poor Largest Contentful Paint (LCP)",
          severity: lcpMs > 4000 ? "critical" : "medium",
          description: `LCP measured at ${Math.round(lcpMs)}ms. Google recommends under 2.5s for good user experience.`,
          category: "performance",
        });
      }
      if (cls != null && cls > 0.1) {
        problems.push({
          id: nextId("p"),
          title: "Layout shift (CLS) above threshold",
          severity: cls > 0.25 ? "critical" : "medium",
          description: `Cumulative Layout Shift is ${cls.toFixed(3)}. Target 0.1 or less.`,
          category: "performance",
        });
      }
      if (inpMs != null && inpMs > 200) {
        problems.push({
          id: nextId("p"),
          title: "Slow interaction response (INP)",
          severity: inpMs > 500 ? "critical" : "medium",
          description: `Interaction to Next Paint is ${Math.round(inpMs)}ms. Good INP is at or below 200ms.`,
          category: "performance",
        });
      }
    }
  }

  if (browser) {
    if (browser.javascriptErrors.length > 0) {
      problems.push({
        id: nextId("p"),
        title: "JavaScript runtime errors",
        severity: "critical",
        description: browser.javascriptErrors.slice(0, 3).join(" | "),
        category: "code",
      });
    }
    if (browser.consoleErrors.length > 0) {
      problems.push({
        id: nextId("p"),
        title: "Console errors detected",
        severity: "medium",
        description: browser.consoleErrors.slice(0, 3).join(" | "),
        category: "code",
      });
    }
    if (browser.contrastFailures.length > 0) {
      problems.push({
        id: nextId("p"),
        title: "Low color contrast",
        severity: "medium",
        description: `${browser.contrastFailures.length} text samples failed WCAG AA contrast (4.5:1). Example ratio: ${browser.contrastFailures[0].ratio}:1.`,
        category: "color",
      });
      recommendations.push({
        id: nextId("r"),
        title: "Fix contrast ratios",
        description: "Increase text/background contrast to at least 4.5:1 for body copy and 3:1 for large text.",
        pointsAdded: 8,
        category: "accessibility",
      });
    }
    if (browser.mobileOverflow) {
      problems.push({
        id: nextId("p"),
        title: "Horizontal overflow on mobile",
        severity: "medium",
        description: "Content wider than the viewport was detected at mobile width, causing horizontal scrolling.",
        category: "responsive",
      });
    }
  }

  if (crawl.responseTimeMs > 800) {
    problems.push({
      id: nextId("p"),
      title: "Slow server response (TTFB)",
      severity: crawl.responseTimeMs > 1500 ? "critical" : "medium",
      description: `Initial HTML response took ${crawl.responseTimeMs}ms from the audit runner.`,
      category: "performance",
    });
  }

  const psi = pageSpeed?.categories;
  const lhBrowser = browser?.lighthouse;

  const performance = clamp(
    psi?.performance ||
      lhBrowser?.performance ||
      (crawl.responseTimeMs < 400 ? 85 : crawl.responseTimeMs < 800 ? 70 : 55)
  );
  const accessibility = clamp(
    psi?.accessibility ||
      lhBrowser?.accessibility ||
      (html ? 55 + Math.round(((html.imagesWithAlt / Math.max(1, html.imageCount)) * 25) + (html.semanticTagsCount > 3 ? 10 : 0)) : 50)
  );
  const seo = clamp(
    psi?.seo ||
      lhBrowser?.seo ||
      (html
        ? 60 +
          (html.metaDescription ? 10 : 0) +
          (html.ogTagsCount > 0 ? 8 : 0) +
          (html.headings.h1 === 1 ? 8 : 0)
        : 50)
  );
  const codeQuality = clamp(
    (psi?.bestPractices || lhBrowser?.bestPractices || 70) -
      (html?.duplicateIds.length ? 8 : 0) -
      (browser?.javascriptErrors.length ? 15 : 0)
  );
  const responsiveness = clamp(
    (html?.hasViewport ? 88 : 42) - (browser?.mobileOverflow ? 18 : 0)
  );
  const typography = clamp(
    70 +
      (html && html.headings.h1 === 1 ? 12 : html && html.headings.h1 === 0 ? -15 : 0) +
      (html && html.headings.total >= 3 ? 8 : 0)
  );
  const colorTheme = clamp(
    78 - (browser?.contrastFailures.length ? browser.contrastFailures.length * 4 : 0)
  );
  const uiUx = clamp((responsiveness + typography + colorTheme) / 3);

  const metrics = {
    codeQuality,
    uiUx,
    responsiveness,
    typography,
    colorTheme,
    accessibility,
    performance,
    seo,
  };

  const score = clamp(
    (metrics.codeQuality +
      metrics.uiUx +
      metrics.responsiveness +
      metrics.typography +
      metrics.colorTheme +
      metrics.accessibility +
      metrics.performance +
      metrics.seo) /
      8
  );

  if (recommendations.length === 0) {
    recommendations.push({
      id: nextId("r"),
      title: "Maintain performance budgets",
      description: "Keep monitoring Core Web Vitals after each deploy using Lighthouse CI or PageSpeed Insights.",
      pointsAdded: 5,
      category: "performance",
    });
  }

  const healthMessage =
    score >= 90
      ? "Excellent audit results. Core Web Vitals, accessibility, and SEO signals are strong."
      : score >= 75
      ? "Solid foundation with room to improve performance, contrast, or metadata."
      : score >= 55
      ? "Several critical issues were detected. Address security headers, accessibility, and loading performance first."
      : "Major issues found. Fix HTTPS, viewport, JavaScript errors, and Core Web Vitals before launch.";

  return {
    score,
    healthMessage,
    metrics,
    problems: problems.slice(0, 20),
    recommendations: recommendations.slice(0, 12),
  };
}
