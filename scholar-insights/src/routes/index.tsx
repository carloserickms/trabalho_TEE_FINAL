import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SearchInput } from "@/components/ui-kit";
import { StatCard, SectionHeader, Tag } from "@/components/ui-kit";
import { AreaShareBars, ProductionBars } from "@/components/charts";
import {
  getAllResearchers,
  getAreaDistribution,
  getDashboardStats,
  getInstituicoes,
  type APIResearcher,
  type DashboardStats,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  staleTime: 0,
  shouldReload: true,
  loader: async () => {
    try {
      const [researchers, stats, areas, institutions] = await Promise.all([
        getAllResearchers(),
        getDashboardStats(),
        getAreaDistribution(),
        getInstituicoes(),
      ]);
      return { researchers, stats, areas, institutions };
    } catch {
      return {
        researchers: [] as APIResearcher[],
        stats: null as DashboardStats | null,
        areas: [] as { name: string; count: number }[],
        institutions: [] as string[],
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Scientia Discovery — Busca científica e mapeamento de competências" },
      {
        name: "description",
        content:
          "Plataforma acadêmica de busca semântica e mapeamento de competências científicas a partir da Plataforma Lattes.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { researchers, stats, areas, institutions } = Route.useLoaderData() as {
    researchers: APIResearcher[];
    stats: DashboardStats | null;
    areas: { name: string; count: number }[];
    institutions: string[];
  };

  const totalPub = stats?.totalProducoes ?? 0;
  const totalPesq = stats?.totalPesquisadores ?? 0;

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative border-b hairline">
        <div className="absolute inset-0 bg-grid opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-[1280px] px-6 pb-16 pt-20">
          <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-px w-8 bg-foreground/40" />
            Plataforma de descoberta científica
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-[44px] leading-[1.05] tracking-tight text-foreground md:text-[56px]">
            Encontre pesquisadores, produções e competências científicas em toda a base Lattes.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Scientia Discovery integra busca textual, recuperação semântica e indicadores
            cienciométricos para mapear o conhecimento produzido em universidades brasileiras — com
            a precisão exigida por programas de pós-graduação, gestores e pesquisadores.
          </p>

          <div className="mt-9 max-w-3xl">
            <SearchInput />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
              <span className="font-medium text-foreground/70">Sugestões</span>
              {[
                "ontologias em ciência da informação",
                "redes de colaboração no Nordeste",
                "PLN para o português brasileiro",
              ].map((s) => (
                <Link
                  key={s}
                  to="/buscar"
                  search={{ q: s } as never}
                  className="underline-offset-4 hover:underline"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Currículos indexados"
              value={totalPesq > 0 ? totalPesq.toLocaleString("pt-BR") : "—"}
              sub="Plataforma Lattes"
            />
            <StatCard
              label="Produções científicas"
              value={totalPub > 0 ? totalPub.toLocaleString("pt-BR") : "—"}
              sub="Artigos, capítulos, anais e teses"
            />
            <StatCard
              label="Instituições"
              value={institutions.length > 0 ? institutions.length.toLocaleString("pt-BR") : "—"}
              sub="Universidades públicas e privadas"
            />
            <StatCard
              label="Áreas CNPq"
              value={areas.length > 0 ? areas.length.toLocaleString("pt-BR") : "—"}
              sub="Cobertura por grande área e subárea"
            />
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <SectionHeader
          eyebrow="Capacidades"
          title="Três modalidades de busca, uma única interface."
          description="Combine recuperação textual, semântica e exploratória para responder perguntas que vão desde citações específicas até a descoberta de competências emergentes em uma instituição."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3">
          {[
            {
              t: "Full-text",
              d: "Indexação textual rigorosa sobre títulos, resumos e palavras-chave, com operadores booleanos, filtros por Qualis, DOI e ano, e ranqueamento BM25.",
              note: "PostgreSQL · Elastic",
            },
            {
              t: "Semântica",
              d: "Embeddings vetoriais geram similaridade conceitual entre consultas em linguagem natural e a produção científica, mesmo sem termos exatos.",
              note: "pgvector · LangChain",
            },
            {
              t: "Exploratória",
              d: "Navegação assistida por sugestões contextuais, expansão de consulta e mapas temáticos para descobrir conexões entre áreas e pesquisadores.",
              note: "Knowledge graph",
            },
          ].map((c) => (
            <div key={c.t} className="bg-surface p-7">
              <div className="font-serif text-[20px] tracking-tight text-foreground">{c.t}</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{c.d}</p>
              <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {c.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured researchers */}
      <section className="mx-auto max-w-[1280px] px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Pesquisadores"
              title="Pesquisadores na base"
              action={
                <Link
                  to="/pesquisadores"
                  className="text-[13px] text-foreground underline-offset-4 hover:underline"
                >
                  Ver todos →
                </Link>
              }
            />
            <ul className="mt-8 divide-y hairline rounded-md border bg-surface">
              {researchers.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    to="/pesquisadores/$id"
                    params={{ id: r.id }}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-5 px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/8 font-serif text-[15px] text-primary">
                      {r.name
                        .split(" ")
                        .map((p: string) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-[16px] text-foreground">{r.name}</div>
                      <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                        {r.area} · {r.institution}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.subareas.slice(0, 3).map((s: string) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        produções
                      </div>
                      <div className="font-serif text-[22px] leading-none text-foreground">
                        {r.publications}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              {researchers.length === 0 && (
                <li className="px-5 py-8 text-[13.5px] text-muted-foreground text-center">
                  Nenhum pesquisador encontrado. Verifique a conexão com o banco de dados.
                </li>
              )}
            </ul>
          </div>

          <div>
            <SectionHeader eyebrow="Distribuição" title="Produção por área de conhecimento" />
            <div className="mt-8 rounded-md border bg-surface p-5">
              <AreaShareBars data={areas} />
              <div className="mt-5 border-t hairline pt-4 text-[12px] text-muted-foreground">
                Dados da base indexada.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Production timeline */}
      <section className="border-t hairline bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <SectionHeader
            eyebrow="Indicadores"
            title="Evolução agregada da produção científica"
            description="Série histórica anual considerando os pesquisadores indexados na plataforma, agregada por ano de publicação."
          />
          <div className="mt-8 rounded-md border bg-surface p-6">
            {stats && stats.anos.length > 0 ? (
              <ProductionBars data={stats.anos} height={140} />
            ) : (
              <div className="h-[140px] flex items-center justify-center text-[13px] text-muted-foreground">
                {researchers.length === 0
                  ? "Conecte-se ao banco de dados para visualizar os indicadores."
                  : "Carregando dados..."}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-4 border-t hairline pt-5 text-[12.5px] text-muted-foreground md:grid-cols-4">
              <div>
                <span className="font-mono text-foreground">
                  {stats?.anos.length ? `${stats.anos.length} anos` : "—"}
                </span>{" "}
                de produção
              </div>
              <div>
                <span className="font-mono text-foreground">
                  {stats?.qualisA1A2Percent ?? "—"}%
                </span>{" "}
                Qualis A1/A2
              </div>
              <div>
                <span className="font-mono text-foreground">{totalPesq || "—"}</span> pesquisadores
              </div>
              <div>
                <span className="font-mono text-foreground">{totalPub || "—"}</span> produções
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="overflow-hidden rounded-md border bg-surface">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
            <div className="p-10">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Para instituições
              </div>
              <h3 className="mt-3 font-serif text-[28px] leading-tight tracking-tight text-foreground">
                Mapeamento institucional de competências científicas.
              </h3>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
                Conecte sua pró-reitoria de pós-graduação à plataforma e obtenha relatórios
                customizados de produção, redes de colaboração e potencial de submissão a editais.
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-sm bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Explorar Analytics
                </Link>
                <Link
                  to="/api-docs"
                  className="rounded-sm border px-4 py-2 text-[13px] text-foreground hover:bg-muted"
                >
                  Documentação da API
                </Link>
              </div>
            </div>
            <div className="border-t hairline bg-surface-elevated p-10 md:border-l md:border-t-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Integrações
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                {[
                  "Plataforma Lattes",
                  "ORCID",
                  "DSpace / repositórios",
                  "Apache Hop (ETL)",
                  "PostgreSQL + pgvector",
                  "Power BI",
                  "FastAPI",
                  "LangChain",
                ].map((i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground/85">
                    <span className="h-1 w-1 rounded-full bg-foreground/60" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
