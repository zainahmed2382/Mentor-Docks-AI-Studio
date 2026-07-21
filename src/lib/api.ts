import { WebsiteScan } from "../types";

const TOKEN_KEY = "mentor_auth_token";
const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || "";

// Safe JSON parser: avoids the "Unexpected token" crash when the server
// returns an HTML error page instead of JSON (e.g. backend not running).
async function safeJson(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    // Provide a clear, readable error instead of a JSON parse crash
    if (response.status === 404) {
      throw new Error("API endpoint not found. Make sure the backend server is running.");
    }
    throw new Error(`Server error (${response.status}): ${text.slice(0, 120)}`);
  }
  return response.json();
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  error?: string;
}

// Token helper functions
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Authentication
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to sign up");
    }
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to log in");
    }
    setToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User } | null> {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearToken();
        }
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  },

  logout(): void {
    clearToken();
  },

  // Projects
  async getProjects(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return await safeJson(response);
  },

  async saveProject(project: {
    name: string;
    url: string;
    score: number;
    lastScan: string;
    issues: number;
    category: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error("Failed to save project");
    }
    return await safeJson(response);
  },

  // Scans
  async getScans(): Promise<WebsiteScan[]> {
    const response = await fetch(`${API_BASE}/api/scans`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch scans");
    }
    return await safeJson(response);
  },

  async saveScan(scan: Omit<WebsiteScan, "id" | "status">): Promise<WebsiteScan> {
    const response = await fetch(`${API_BASE}/api/scans`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(scan),
    });
    if (!response.ok) {
      throw new Error("Failed to save scan history");
    }
    return await safeJson(response);
  },

  async deleteScan(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/scans/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return response.ok;
  },

  async analyzeUrl(url: string): Promise<WebsiteScan> {
    const response = await fetch(`${API_BASE}/api/scans/analyze`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    });
    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to analyze website");
    }
    return data;
  },
};
