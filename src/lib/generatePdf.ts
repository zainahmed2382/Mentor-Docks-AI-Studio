import { WebsiteScan } from "../types";

function getScoreColor(score: number): string {
  if (score >= 85) return "#10b981"; // emerald
  if (score >= 70) return "#f59e0b"; // amber
  return "#ef4444"; // rose
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Critical";
}

function getSeverityColor(severity: "critical" | "medium" | "minor"): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "medium": return "#f59e0b";
    case "minor": return "#3b82f6";
  }
}

function getSeverityBg(severity: "critical" | "medium" | "minor"): string {
  switch (severity) {
    case "critical": return "#fef2f2";
    case "medium": return "#fffbeb";
    case "minor": return "#eff6ff";
  }
}

function buildProgressBar(score: number): string {
  const color = getScoreColor(score);
  return `
    <div style="background:#f1f5f9;border-radius:99px;height:8px;width:100%;overflow:hidden;margin-top:4px;">
      <div style="background:${color};height:100%;width:${score}%;border-radius:99px;"></div>
    </div>
  `;
}

export function downloadPdfReport(scan: WebsiteScan): void {
  const metrics = scan.metrics;
  const metricEntries = [
    { label: "UI / UX Heuristics",  score: metrics.uiUx },
    { label: "Code Quality",         score: metrics.codeQuality },
    { label: "Responsiveness",       score: metrics.responsiveness },
    { label: "Typography",           score: metrics.typography },
    { label: "Color Theme",          score: metrics.colorTheme },
    { label: "Accessibility",        score: metrics.accessibility },
    { label: "Performance",          score: metrics.performance },
    { label: "SEO Indexing",         score: metrics.seo },
  ];

  const overallColor = getScoreColor(scan.score);
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const criticalCount = scan.problems.filter(p => p.severity === "critical").length;
  const mediumCount   = scan.problems.filter(p => p.severity === "medium").length;
  const minorCount    = scan.problems.filter(p => p.severity === "minor").length;

  const metricsRows = metricEntries.map(({ label, score }) => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:#374151;">${label}</span>
        <span style="font-size:13px;font-weight:800;color:${getScoreColor(score)};">${score}<span style="font-size:10px;font-weight:500;color:#9ca3af;">/100</span></span>
      </div>
      ${buildProgressBar(score)}
    </div>
  `).join("");

  const problemsHtml = scan.problems.length === 0
    ? `<p style="color:#6b7280;font-size:12px;text-align:center;padding:16px 0;">No issues identified — pristine compliance!</p>`
    : scan.problems.map(p => `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin-bottom:10px;background:${getSeverityBg(p.severity)};border-left:4px solid ${getSeverityColor(p.severity)};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:#1f2937;flex:1;">${p.title}</span>
          <span style="font-size:10px;font-weight:800;color:${getSeverityColor(p.severity)};text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;border:1px solid ${getSeverityColor(p.severity)}30;padding:2px 8px;border-radius:99px;background:white;">${p.severity}</span>
        </div>
        <p style="font-size:11px;color:#6b7280;margin:0;line-height:1.5;">${p.description}</p>
      </div>
    `).join("");

  const recsHtml = scan.recommendations.length === 0
    ? `<p style="color:#6b7280;font-size:12px;text-align:center;padding:16px 0;">No additional recommendations — already optimal!</p>`
    : scan.recommendations.map(r => `
      <div style="border:1px solid #e0e7ff;border-radius:12px;padding:12px 14px;margin-bottom:10px;background:#f5f3ff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;">
            <span style="font-size:13px;font-weight:700;color:#1f2937;display:block;margin-bottom:3px;">${r.title}</span>
            <span style="font-size:11px;color:#6b7280;line-height:1.5;">${r.description}</span>
          </div>
          <div style="text-align:right;white-space:nowrap;flex-shrink:0;">
            <span style="font-size:16px;font-weight:800;color:#4f46e5;">+${r.pointsAdded}</span>
            <span style="display:block;font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">pts</span>
          </div>
        </div>
      </div>
    `).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Mentor Docks — Audit Report · ${scan.url}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #ffffff;
      color: #1f2937;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }

    .page { padding: 40px 44px; max-width: 794px; margin: 0 auto; }

    /* ─── HEADER ─── */
    .header {
      background: linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 50%, #0f172a 100%);
      border-radius: 20px;
      padding: 32px 36px;
      margin-bottom: 28px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
      border-radius: 50%;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
    }
    .brand-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-name {
      font-size: 15px; font-weight: 800;
      color: white; letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 10px; font-weight: 500;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .score-badge {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 12px 20px;
      text-align: center;
    }
    .score-number {
      font-size: 36px; font-weight: 900; color: ${overallColor};
      line-height: 1;
    }
    .score-label {
      font-size: 10px; font-weight: 700;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase; letter-spacing: 0.1em;
      margin-top: 4px;
    }
    .score-grade {
      font-size: 11px; font-weight: 700;
      color: ${overallColor};
      margin-top: 2px;
    }
    .report-title {
      font-size: 22px; font-weight: 800;
      color: white; letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .report-url {
      font-size: 13px; font-weight: 600;
      color: #818cf8;
      font-family: monospace;
    }
    .report-meta {
      display: flex; gap: 20px; margin-top: 14px;
      flex-wrap: wrap;
    }
    .meta-chip {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 10px; font-weight: 600;
      color: rgba(255,255,255,0.6);
    }
    .meta-chip strong {
      color: rgba(255,255,255,0.9);
      font-weight: 700;
    }

    /* ─── SECTION ─── */
    .section {
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
    }
    .section-header {
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
    }
    .section-body { padding: 18px; }

    /* ─── STATS ROW ─── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 14px;
      text-align: center;
    }
    .stat-number {
      font-size: 28px; font-weight: 900;
      line-height: 1;
    }
    .stat-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: #9ca3af; margin-top: 4px;
    }

    /* ─── HEALTH MSG ─── */
    .health-msg {
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border: 1px solid #bbf7d0;
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #166534;
      font-weight: 500;
      line-height: 1.6;
    }

    /* ─── METRICS GRID ─── */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 32px;
    }

    /* ─── FOOTER ─── */
    .footer {
      margin-top: 28px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #9ca3af;
    }
    .footer strong { color: #4f46e5; }

    /* ─── PRINT BUTTON (screen only) ─── */
    .print-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 12px 28px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-size: 14px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      letter-spacing: -0.01em;
    }
    .print-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Print / Save button (hidden on print) -->
    <div class="no-print" style="text-align:center;margin-bottom:20px;">
      <button class="print-btn" onclick="window.print()">⬇ Save as PDF / Print</button>
    </div>

    <!-- ── HEADER ── -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="brand">
            <div class="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <div>
              <div class="brand-name">MENTOR DOCKS</div>
              <div class="brand-sub">AI Design Intelligence</div>
            </div>
          </div>
          <div style="margin-top:16px;">
            <div class="report-title">Audit Report</div>
            <div class="report-url">${scan.url}</div>
          </div>
          <div class="report-meta">
            <div class="meta-chip">Generated: <strong>${generatedDate}</strong></div>
            <div class="meta-chip">Scan Date: <strong>${scan.date}</strong></div>
            <div class="meta-chip">Status: <strong>Completed</strong></div>
          </div>
        </div>
        <div class="score-badge">
          <div class="score-number">${scan.score}</div>
          <div class="score-label">Overall</div>
          <div class="score-grade">${getScoreLabel(scan.score)}</div>
        </div>
      </div>
    </div>

    <!-- ── HEALTH MESSAGE ── -->
    <div class="health-msg">
      <strong>AI Assessment:</strong> ${scan.healthMessage}
    </div>

    <!-- ── ISSUE SUMMARY ── -->
    <div class="stats-row">
      <div class="stat-card" style="border-color:#fecaca;background:#fef2f2;">
        <div class="stat-number" style="color:#ef4444;">${criticalCount}</div>
        <div class="stat-label" style="color:#ef4444;">Critical</div>
      </div>
      <div class="stat-card" style="border-color:#fde68a;background:#fffbeb;">
        <div class="stat-number" style="color:#f59e0b;">${mediumCount}</div>
        <div class="stat-label" style="color:#f59e0b;">Medium</div>
      </div>
      <div class="stat-card" style="border-color:#bfdbfe;background:#eff6ff;">
        <div class="stat-number" style="color:#3b82f6;">${minorCount}</div>
        <div class="stat-label" style="color:#3b82f6;">Minor</div>
      </div>
    </div>

    <!-- ── SCORE METRICS ── -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">📊 Score Metrics — All 8 Crawlers</span>
      </div>
      <div class="section-body">
        <div class="metrics-grid">
          ${metricsRows}
        </div>
      </div>
    </div>

    <!-- ── IDENTIFIED ISSUES ── -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">⚠ Identified Issues (${scan.problems.length})</span>
      </div>
      <div class="section-body">
        ${problemsHtml}
      </div>
    </div>

    <!-- ── RECOMMENDATIONS ── -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">✦ AI-Powered Recommendations (${scan.recommendations.length})</span>
      </div>
      <div class="section-body">
        ${recsHtml}
      </div>
    </div>

    <!-- ── FOOTER ── -->
    <div class="footer">
      <span>Generated by <strong>Mentor Docks AI Studio</strong></span>
      <span>${scan.url} · Score: <strong style="color:#4f46e5;">${scan.score}/100</strong></span>
      <span>Confidential · ${generatedDate}</span>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog immediately
    window.onload = () => window.print();
  </script>
</body>
</html>
  `;

  // Open in a new window and trigger print
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups for this site to download the PDF report.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
