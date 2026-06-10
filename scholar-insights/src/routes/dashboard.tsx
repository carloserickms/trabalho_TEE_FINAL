import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SectionHeader, StatCard } from "@/components/ui-kit";
import { AreaShareBars, ProductionBars } from "@/components/charts";
import {
  getAreaDistribution,
  getDashboardStats,
  getInstituicoes,
  getQualisDistribution,
  getResearcherRanking,
  type DashboardStats,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  staleTime: 0,
  shouldReload: true,
  loader: async () => {
    try {
      const [stats, ranking, qualis, areas, institutions] = await Promise.all([
        getDashboardStats(),
        getResearcherRanking(),
        getQualisDistribution(),
        getAreaDistribution(),
        getInstituicoes(),
      ]);
      return { stats, ranking, qualis, areas, institutions };
    } catch {
      return {
        stats: null as DashboardStats | null,
        ranking: [] as { id: string; name: string; institution: string; publications: number }[],
        qualis: [] as { label: string; value: number }[],
        areas: [] as { name: string; count: number }[],
        institutions: [] as string[],
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Analytics — Scientia Discovery" },
      {
        name: "description",
        content: "Indicadores cienciométricos e analytics da produção indexada.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { stats, ranking, qualis, areas, institutions } = Route.useLoaderData() as {
    stats: DashboardStats | null;
    ranking: { id: string; name: string; institution: string; publications: number }[];
    qualis: { label: string; value: number }[];
    areas: { name: string; count: number }[];
    institutions: string[];
  };

  const totalPub = stats?.totalProducoes ?? 0;
  const totalPesq = stats?.totalPesquisadores ?? 0;
  const qualisPct = stats?.qualisA1A2Percent ?? 0;
  const prodAnos = stats?.anos ?? [];

  return (
    <PageShell>
      <section className="border-b hairline bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="flex items-end justify-between gap-4">
            <SectionHeader
              eyebrow="Painel institucional"
              title="Analytics da produção científica"
              description="Indicadores agregados sobre o conjunto de pesquisadores e produções indexadas."
            />
            <div className="flex flex-wrap gap-2">
              <select className="rounded-sm border bg-surface px-3 py-1.5 text-[12.5px]">
                <option>Todos os períodos</option>
              </select>
              <select className="rounded-sm border bg-surface px-3 py-1.5 text-[12.5px]">
                <option>Todas as instituições</option>
              </select>
              <button className="rounded-sm bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground">
                Exportar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] space-y-10 px-6 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Produções no período"
            value={totalPub > 0 ? totalPub.toLocaleString("pt-BR") : "—"}
          />
          <StatCard
            label="Pesquisadores ativos"
            value={totalPesq > 0 ? totalPesq.toLocaleString("pt-BR") : "—"}
          />
          <StatCard label="Qualis A1 / A2" value={qualisPct > 0 ? `${qualisPct}%` : "—"} />
          <StatCard
            label="Instituições"
            value={institutions.length > 0 ? institutions.length.toLocaleString("pt-BR") : "—"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-md border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Série histórica
                </div>
                <h3 className="mt-1 font-serif text-[20px] tracking-tight">
                  Produção anual agregada
                </h3>
              </div>
            </div>
            <div className="mt-6">
              {prodAnos.length > 0 ? (
                <ProductionBars data={prodAnos} height={170} />
              ) : (
                <div className="h-[170px] flex items-center justify-center text-[13px] text-muted-foreground">
                  Dados indisponíveis
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-surface p-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Distribuição
            </div>
            <h3 className="mt-1 font-serif text-[20px] tracking-tight">Produção por área</h3>
            <div className="mt-6">
              <AreaShareBars data={areas} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border bg-surface">
            <div className="border-b hairline px-6 py-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Ranking
              </div>
              <h3 className="mt-1 font-serif text-[18px] tracking-tight">
                Pesquisadores por produções
              </h3>
            </div>
            <ol className="divide-y hairline">
              {ranking.length > 0 ? (
                ranking.map((r, i) => (
                  <li
                    key={r.id}
                    className="grid grid-cols-[24px_1fr_auto] items-center gap-4 px-6 py-3 text-[13.5px]"
                  >
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <Link
                        to="/pesquisadores/$id"
                        params={{ id: r.id }}
                        className="text-foreground hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="text-[11.5px] text-muted-foreground">{r.institution}</div>
                    </div>
                    <span className="font-mono text-[13px] text-foreground">
                      {r.publications.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))
              ) : (
                <li className="px-6 py-8 text-[13px] text-muted-foreground text-center">
                  Nenhum dado disponível.
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-md border bg-surface">
            <div className="border-b hairline px-6 py-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Qualidade editorial
              </div>
              <h3 className="mt-1 font-serif text-[18px] tracking-tight">
                Distribuição Qualis CAPES
              </h3>
            </div>
            <div className="space-y-3 p-6">
              {qualis.length > 0 ? (
                qualis.map((q) => (
                  <div
                    key={q.label}
                    className="grid grid-cols-[40px_1fr_40px] items-center gap-3 text-[12.5px]"
                  >
                    <span className="font-mono text-[12px] text-foreground">{q.label}</span>
                    <div className="h-2 overflow-hidden rounded-sm bg-muted">
                      <div
                        className="h-full rounded-sm bg-scholar/80"
                        style={{ width: `${q.value * 4}%` }}
                      />
                    </div>
                    <span className="text-right font-mono text-[11.5px] text-muted-foreground">
                      {q.value}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-muted-foreground text-center py-8">
                  Dados Qualis não disponíveis. Faça o upload da planilha Qualis via API.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
