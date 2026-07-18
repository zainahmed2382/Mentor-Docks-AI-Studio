export interface ScoreMetrics {
  codeQuality: number;
  uiUx: number;
  responsiveness: number;
  typography: number;
  colorTheme: number;
  accessibility: number;
  performance: number;
  seo: number;
}

export interface ProblemItem {
  id: string;
  title: string;
  severity: "critical" | "medium" | "minor";
  description: string;
  category: "code" | "ux" | "responsive" | "color" | "performance" | "accessibility" | "seo" | "typography";
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  pointsAdded: number;
  category: string;
}

export interface WebsiteScan {
  id: string;
  url: string;
  date: string;
  score: number;
  status: "completed" | "scanning" | "failed";
  healthMessage: string;
  metrics: ScoreMetrics;
  problems: ProblemItem[];
  recommendations: RecommendationItem[];
}
