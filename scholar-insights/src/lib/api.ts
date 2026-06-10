import {
  areas as localAreas,
  institutions as localInstitutions,
  researchers as localResearchers,
  sampleResults as localSampleResults,
} from "./data";

const PROD_API = "https://trabalho-tee-final.onrender.com";

const SERVER_API = (() => {
  const viteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (viteApiUrl && viteApiUrl.trim()) return viteApiUrl.replace(/\/$/, "");

  if (typeof process !== "undefined" && process.env?.API_URL) {
    return process.env.API_URL.replace(/\/$/, "");
  }

  return import.meta.env.PROD ? PROD_API : "http://localhost:8000";
})();

const USE_LOCAL_DATA =
  import.meta.env.PROD &&
  /^(?:https?:\/\/)?localhost(?::\d+)?$|^(?:https?:\/\/)?127\.0\.0\.1(?::\d+)?$/i.test(
    SERVER_API,
  );
const API = USE_LOCAL_DATA ? "" : import.meta.env.SSR ? SERVER_API : "";

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

function toApiResearcher(researcher: (typeof localResearchers)[number]): APIResearcher {
  return {
    ...researcher,
    recent: researcher.recent.map((item) => ({ ...item })),
    production: researcher.production.map((item) => ({ ...item })),
    collaborators: researcher.collaborators.map((item) => ({ ...item })),
  };
}

function aggregateProductionYears(researchers: APIResearcher[]): ProductionYear[] {
  const totals = new Map<number, number>();
  for (const researcher of researchers) {
    for (const item of researcher.production) {
      totals.set(item.year, (totals.get(item.year) ?? 0) + item.count);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }));
}

function localDashboardStats(researchers: APIResearcher[]): DashboardStats {
  const totalProducoes = researchers.reduce((sum, researcher) => sum + researcher.publications, 0);
  const totalPesquisadores = researchers.length;
  const years = aggregateProductionYears(researchers);
  const totalSampleResults = localSampleResults.length || 1;
  const a1a2 = localSampleResults.filter((item) => item.qualis === "A1" || item.qualis === "A2").length;

  return {
    totalProducoes,
    totalPesquisadores,
    qualisA1A2Percent: Math.round((a1a2 / totalSampleResults) * 100),
    anos: years,
  };
}

function scoreText(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const haystack = text.toLowerCase();
  if (haystack.includes(q)) return 1;

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0) / tokens.length;
}

function localSearchProductions(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return localSampleResults
    .map((item) => {
      const joined = [item.title, item.abstract, item.venue, item.authors.join(" "), item.highlights.join(" ")]
        .join(" ")
        .toLowerCase();
      const similarity = Math.max(item.similarity, scoreText(q, joined));
      return { ...item, similarity };
    })
    .filter((item) => {
      const joined = [item.title, item.abstract, item.venue, item.authors.join(" "), item.highlights.join(" ")]
        .join(" ")
        .toLowerCase();
      return joined.includes(q) || q.split(/\s+/).some((token) => token && joined.includes(token));
    })
    .sort((a, b) => b.similarity - a.similarity);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function apiGet<T>(path: string): Promise<T> {
  if (USE_LOCAL_DATA) {
    return localApiGet<T>(path);
  }

  const res = await fetchWithTimeout(`${API}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

function localApiGet<T>(path: string): Promise<T> {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);

  let value: unknown;
  if (pathname === "/api/pesquisadores") {
    value = localResearchers.map(toApiResearcher);
  } else if (pathname.startsWith("/api/pesquisadores/")) {
    const id = pathname.split("/").pop() ?? "";
    const researcher = localResearchers.find((item) => item.id === id);
    value = researcher ? toApiResearcher(researcher) : null;
  } else if (pathname === "/api/producoes/busca") {
    value = localSearchProductions(params.get("q") ?? "");
  } else if (pathname === "/api/dashboard/stats") {
    value = localDashboardStats(localResearchers.map(toApiResearcher));
  } else if (pathname === "/api/dashboard/ranking") {
    value = localResearchers
      .map((researcher) => ({
        id: researcher.id,
        name: researcher.name,
        institution: researcher.institution,
        publications: researcher.publications,
      }))
      .sort((a, b) => b.publications - a.publications);
  } else if (pathname === "/api/qualis-distribuicao") {
    const total = localSampleResults.length || 1;
    const counts = new Map<string, number>();
    for (const item of localSampleResults) {
      counts.set(item.qualis, (counts.get(item.qualis) ?? 0) + 1);
    }
    value = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, value: Math.round((count / total) * 100) }));
  } else if (pathname === "/api/instituicoes") {
    value = localInstitutions;
  } else if (pathname === "/api/metrics/area") {
    value = localAreas.map(({ name, count }) => ({ name, count }));
  } else {
    throw new Error(`Local API route not implemented: ${pathname}`);
  }

  return Promise.resolve(value as T);
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

export async function searchProductions(
  q: string,
  mode: "hybrid" | "fulltext" | "semantic" = "hybrid",
): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  return apiGet<SearchResult[]>(
    `/api/producoes/busca?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(mode)}`,
  );
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
