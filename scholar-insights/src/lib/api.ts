const SERVER_API = (() => {
  const viteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (viteApiUrl && viteApiUrl.trim()) return viteApiUrl.replace(/\/$/, "");

  if (typeof process !== "undefined" && process.env?.API_URL) {
    return process.env.API_URL.replace(/\/$/, "");
  }

  return "http://localhost:8000";
})();

const API = import.meta.env.SSR ? SERVER_API : "";

export interface ProductionYear {
  year: number;
  count: number;
}

export interface RecentProduction {
  year: number;
  title: string;
  venue: string;
  qualis: string;
  doi: string;
}

export interface Collaborator {
  name: string;
  institution: string;
  shared: number;
}

export interface APIResearcher {
  id: string;
  name: string;
  title: string;
  institution: string;
  unit: string;
  area: string;
  subareas: string[];
  hIndex: number;
  publications: number;
  citations: number;
  orcid: string;
  lattes: string;
  bio: string;
  recent: RecentProduction[];
  production: ProductionYear[];
  collaborators: Collaborator[];
}

export interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  qualis: string;
  doi: string;
  similarity: number;
  abstract: string;
  highlights: string[];
  pesquisadorId: string;
}

export interface DashboardStats {
  totalProducoes: number;
  totalPesquisadores: number;
  qualisA1A2Percent: number;
  anos: ProductionYear[];
}

export interface RankingItem {
  id: string;
  name: string;
  institution: string;
  publications: number;
}

export interface AreaMetric {
  name: string;
  count: number;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getAllResearchers(): Promise<APIResearcher[]> {
  return apiGet<APIResearcher[]>("/api/pesquisadores");
}

export async function getResearcherById(lattesId: string): Promise<APIResearcher | null> {
  try {
    return await apiGet<APIResearcher>(`/api/pesquisadores/${lattesId}`);
  } catch {
    return null;
  }
}

export async function searchProductions(q: string, mode: "hybrid" | "fulltext" | "semantic" = "hybrid"): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  return apiGet<SearchResult[]>(`/api/producoes/busca?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(mode)}`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/api/dashboard/stats");
}

export async function getResearcherRanking(): Promise<RankingItem[]> {
  return apiGet<RankingItem[]>("/api/dashboard/ranking");
}

export async function getQualisDistribution(): Promise<{ label: string; value: number }[]> {
  return apiGet<{ label: string; value: number }[]>("/api/qualis-distribuicao");
}

export async function getInstituicoes(): Promise<string[]> {
  return apiGet<string[]>("/api/instituicoes");
}

export async function getAreaDistribution(): Promise<AreaMetric[]> {
  return apiGet<AreaMetric[]>("/api/metrics/area");
}
