import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Filter, Table2 } from "lucide-react";

import { PageShell } from "@/components/app-shell";
import { SectionHeader, StatCard } from "@/components/ui-kit";
import {
  analyticsQuery,
  getAnalyticsOverview,
  getAreaDistribution,
  getInstituicoes,
  type AnalyticsDatum,
  type AnalyticsFilters,
  type AnalyticsOverview,
} from "@/lib/api";

const cleanParam = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^"|"$/g, "");
}, z.string());

const dashboardSearchSchema = z.object({
  yearStart: fallback(cleanParam, "").default(""),
  yearEnd: fallback(cleanParam, "").default(""),
  institution: fallback(cleanParam, "").default(""),
  area: fallback(cleanParam, "").default(""),
  focus: fallback(z.enum(["areas", "institutions"]), "areas").default("areas"),
});

type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#4b5563"];

export const Route = createFileRoute("/dashboard")({
  staleTime: 0,
  shouldReload: true,
  validateSearch: zodValidator(dashboardSearchSchema),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const [overview, institutions, areas] = await Promise.all([
        getAnalyticsOverview(activeFilters(deps)),
        getInstituicoes(),
        getAreaDistribution(),
      ]);
      return { overview, institutions, areas, error: "" };
    } catch (error) {
      return {
        overview: null as AnalyticsOverview | null,
        institutions: [] as string[],
        areas: [] as { name: string; count: number }[],
        error: error instanceof Error ? error.message : "Falha ao carregar analytics.",
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Analytics - Scientia Discovery" },
      {
        name: "description",
        content: "Dashboard interativo da produção científica indexada.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { overview, institutions, areas, error } = Route.useLoaderData() as {
    overview: AnalyticsOverview | null;
    institutions: string[];
    areas: { name: string; count: number }[];
    error: string;
  };
  const search = Route.useSearch() as DashboardSearch;
  const navigate = useNavigate({ from: "/dashboard" });
  const filters = activeFilters(search);
  const query = analyticsQuery(filters);
  const apiBase = !import.meta.env.PROD ? "http://localhost:8000" : "";
  const csvHref = `${apiBase}/api/analytics/powerbi.csv${query ? `?${query}` : ""}`;
  const jsonHref = `${apiBase}/api/analytics/powerbi${query ? `?${query}` : ""}`;
  const focusData = search.focus === "areas" ? overview?.areas ?? [] : overview?.institutions ?? [];

  function updateSearch(next: Partial<DashboardSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  }

  return (
    <PageShell>
      <section className="border-b hairline bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <SectionHeader
            eyebrow="Analytics"
            title="Dashboard da produção científica"
            description="Explore os dados Lattes carregados no banco com filtros, gráficos e exportação."
            action={
              <div className="flex flex-wrap gap-2">
                <a
                  href={csvHref}
                  className="inline-flex items-center gap-2 rounded-sm border bg-surface px-3 py-2 text-[12.5px] text-foreground hover:bg-muted"
                >
                  <Download size={15} />
                  CSV Power BI
                </a>
                <a
                  href={jsonHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border bg-surface px-3 py-2 text-[12.5px] text-foreground hover:bg-muted"
                >
                  <Table2 size={15} />
                  JSON
                </a>
              </div>
            }
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] space-y-8 px-6 py-8">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <FilterPanel title="Filtros Lattes">
          <input
            value={search.yearStart}
            onChange={(event) => updateSearch({ yearStart: event.target.value })}
            placeholder={String(overview?.filters.minYear ?? "Ano inicial")}
            className="rounded-sm border bg-surface px-3 py-2 text-[13px]"
          />
          <input
            value={search.yearEnd}
            onChange={(event) => updateSearch({ yearEnd: event.target.value })}
            placeholder={String(overview?.filters.maxYear ?? "Ano final")}
            className="rounded-sm border bg-surface px-3 py-2 text-[13px]"
          />
          <select
            value={search.institution}
            onChange={(event) => updateSearch({ institution: event.target.value })}
            className="rounded-sm border bg-surface px-3 py-2 text-[13px] md:col-span-2"
          >
            <option value="">Todas as instituições</option>
            {institutions.map((institution) => (
              <option key={institution} value={institution}>
                {institution}
              </option>
            ))}
          </select>
          <select
            value={search.area}
            onChange={(event) => updateSearch({ area: event.target.value })}
            className="rounded-sm border bg-surface px-3 py-2 text-[13px]"
          >
            <option value="">Todas as áreas</option>
            {areas.map((area) => (
              <option key={area.name} value={area.name}>
                {area.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => updateSearch({ yearStart: "", yearEnd: "", institution: "", area: "" })}
            className="rounded-sm border px-3 py-2 text-[13px] hover:bg-muted"
          >
            Limpar
          </button>
        </FilterPanel>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Produções Lattes"
            value={formatNumber(overview?.summary.productions ?? 0)}
            sub={periodText(overview)}
          />
          <StatCard label="Pesquisadores" value={formatNumber(overview?.summary.researchers ?? 0)} />
          <StatCard label="Instituições" value={formatNumber(overview?.summary.institutions ?? 0)} />
          <StatCard label="Áreas" value={formatNumber(overview?.summary.areas ?? 0)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <Panel eyebrow="Lattes" title="Produções por ano">
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.yearly ?? []}>
                  <defs>
                    <linearGradient id="yearlyFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={42} />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Produções"
                    stroke="#2563eb"
                    fill="url(#yearlyFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Panel
            eyebrow="Lattes"
            title={search.focus === "areas" ? "Produções por área" : "Produções por instituição"}
            action={
              <div className="inline-flex overflow-hidden rounded-sm border text-[12px]">
                <button
                  onClick={() => updateSearch({ focus: "areas" })}
                  className={`px-2 py-1 ${search.focus === "areas" ? "bg-primary text-primary-foreground" : "bg-surface"}`}
                >
                  Áreas
                </button>
                <button
                  onClick={() => updateSearch({ focus: "institutions" })}
                  className={`px-2 py-1 ${search.focus === "institutions" ? "bg-primary text-primary-foreground" : "bg-surface"}`}
                >
                  Instituições
                </button>
              </div>
            }
          >
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={focusData} layout="vertical" margin={{ left: 16, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => compactLabel(value)}
                  />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="count" name="Produções" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel eyebrow="Lattes" title="Produção por tipo">
            <PieBlock data={overview?.types ?? []} />
          </Panel>
          <Panel eyebrow="Ranking" title="Pesquisadores com mais produções">
            <ol className="divide-y hairline">
              {(overview?.ranking ?? []).map((researcher, index) => (
                <li
                  key={researcher.id}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-4 py-3 text-[13.5px]"
                >
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <Link
                      to="/pesquisadores/$id"
                      params={{ id: researcher.id }}
                      className="text-foreground hover:underline"
                    >
                      {researcher.name}
                    </Link>
                    <div className="text-[11.5px] text-muted-foreground">{researcher.institution}</div>
                  </div>
                  <span className="font-mono text-[12px]">{formatNumber(researcher.publications)}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            eyebrow="Power BI"
            title="Dados Lattes para baixar"
            action={<Download size={18} className="text-muted-foreground" />}
          >
            <div className="space-y-4 text-[13px] text-muted-foreground">
              <p>
                O CSV e o JSON usam os filtros Lattes atuais e podem ser importados diretamente
                em ferramentas de BI.
              </p>
              <div className="rounded-sm border bg-muted/40 p-3 font-mono text-[11px] text-foreground break-all">
                {jsonHref}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={csvHref}
                  download
                  className="inline-flex items-center gap-2 rounded-sm border bg-surface px-3 py-2 text-foreground hover:bg-muted"
                >
                  <Download size={15} />
                  Baixar CSV
                </a>
                <a
                  href={jsonHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border bg-surface px-3 py-2 text-foreground hover:bg-muted"
                >
                  <Table2 size={15} />
                  Abrir JSON
                </a>
              </div>
            </div>
          </Panel>
        </div>
      </section>
    </PageShell>
  );
}

function activeFilters(search: DashboardSearch): AnalyticsFilters {
  return {
    yearStart: search.yearStart,
    yearEnd: search.yearEnd,
    institution: search.institution,
    area: search.area,
  };
}

function FilterPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Filter size={14} />
        {title}
      </div>
      <div className="grid gap-3 md:grid-cols-6">{children}</div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <h3 className="mt-1 font-serif text-[19px] tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartBox({ children }: { children: React.ReactNode }) {
  return <div className="h-[320px] min-w-0">{children}</div>;
}

function PieBlock({ data }: { data: AnalyticsDatum[] }) {
  const chartData = data.filter((item) => item.count > 0).slice(0, 8);
  if (chartData.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-[13px] text-muted-foreground">
        Dados indisponíveis para este recorte.
      </div>
    );
  }

  return (
    <ChartBox>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="count" nameKey="label" innerRadius={62} outerRadius={104}>
            {chartData.map((item, index) => (
              <Cell key={item.label} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Legend formatter={(value) => compactLabel(String(value), 24)} />
        </PieChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function compactLabel(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function periodText(overview: AnalyticsOverview | null): string {
  if (!overview?.summary.firstYear || !overview.summary.lastYear) return "Período não informado";
  return `${overview.summary.firstYear} a ${overview.summary.lastYear}`;
}
