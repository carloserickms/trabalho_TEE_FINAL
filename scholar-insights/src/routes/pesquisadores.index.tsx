import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { PageShell } from "@/components/app-shell";
import { Tag, SectionHeader } from "@/components/ui-kit";
import { ProductionBars } from "@/components/charts";
import {
  getAllResearchers,
  getAreaDistribution,
  getInstituicoes,
  type APIResearcher,
} from "@/lib/api";

const cleanParam = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^"|"$/g, "");
}, z.string());

const researchersSearchSchema = z.object({
  q: fallback(cleanParam, "").default(""),
  institution: fallback(cleanParam, "").default(""),
  area: fallback(cleanParam, "").default(""),
  view: fallback(z.enum(["list", "cards"]), "list").default("list"),
});

type ResearchersSearch = z.infer<typeof researchersSearchSchema>;

export const Route = createFileRoute("/pesquisadores/")({
  staleTime: 0,
  shouldReload: true,
  validateSearch: zodValidator(researchersSearchSchema),
  loader: async () => {
    try {
      const [researchers, institutions, areas] = await Promise.all([
        getAllResearchers(),
        getInstituicoes(),
        getAreaDistribution(),
      ]);
      return { researchers, institutions, areas, error: "" };
    } catch (error) {
      return {
        researchers: [] as APIResearcher[],
        institutions: [] as string[],
        areas: [] as { name: string; count: number }[],
        error: error instanceof Error ? error.message : "Falha ao carregar pesquisadores.",
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Pesquisadores — Scientia Discovery" },
      {
        name: "description",
        content: "Explore pesquisadores indexados a partir da Plataforma Lattes.",
      },
    ],
  }),
  component: ResearchersPage,
});

function ResearchersPage() {
  const { researchers, institutions, areas, error } = Route.useLoaderData() as {
    researchers: APIResearcher[];
    institutions: string[];
    areas: { name: string; count: number }[];
    error: string;
  };
  const search = Route.useSearch() as ResearchersSearch;
  const navigate = useNavigate({ from: "/pesquisadores/" });

  const filteredResearchers = researchers.filter((researcher) => {
    const q = search.q.toLowerCase();
    const matchesQuery =
      !q ||
      [
        researcher.name,
        researcher.title,
        researcher.institution,
        researcher.area,
        researcher.subareas.join(" "),
        researcher.bio,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    const matchesInstitution = !search.institution || researcher.institution === search.institution;
    const matchesArea = !search.area || researcher.area === search.area;
    return matchesQuery && matchesInstitution && matchesArea;
  });

  function updateSearch(next: Partial<ResearchersSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  }

  return (
    <PageShell>
      <section className="border-b hairline">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <SectionHeader
            eyebrow="Diretório"
            title="Pesquisadores"
            description="Explore pesquisadores por área, instituição e linha de pesquisa a partir da base local Lattes."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <input
              value={search.q}
              onChange={(event) => updateSearch({ q: event.target.value })}
              placeholder="Filtrar por nome, área, instituição ou termo da bio"
              className="rounded-sm border bg-surface px-3 py-2 text-[13.5px] text-foreground"
            />
            <select
              value={search.institution}
              onChange={(event) => updateSearch({ institution: event.target.value })}
              className="rounded-sm border bg-surface px-3 py-2 text-[13px] text-foreground"
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
              className="rounded-sm border bg-surface px-3 py-2 text-[13px] text-foreground"
            >
              <option value="">Todas as áreas</option>
              {[...new Set(researchers.map((researcher) => researcher.area))].sort().map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6 text-[13px]">
          <FacetList
            title="Instituição"
            items={institutions.slice(0, 15).map((institution) => ({
              label: institution,
              active: institution === search.institution,
              onClick: () =>
                updateSearch({
                  institution: institution === search.institution ? "" : institution,
                }),
            }))}
          />
          <FacetList
            title="Áreas"
            items={areas.slice(0, 10).map((area) => ({
              label: area.name,
              count: area.count,
              active: area.name === search.area,
              onClick: () => updateSearch({ area: area.name === search.area ? "" : area.name }),
            }))}
          />
        </aside>

        <div>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
          <div className="mb-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <span>{filteredResearchers.length} pesquisadores</span>
            <div className="flex items-center gap-2">
              <span>Visualização</span>
              <div className="inline-flex overflow-hidden rounded-sm border">
                {(["list", "cards"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => updateSearch({ view })}
                    className={`px-2 py-1 ${
                      search.view === view
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-muted"
                    }`}
                  >
                    {view === "list" ? "Lista" : "Cards"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className={search.view === "cards" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
            {filteredResearchers.map((researcher) => (
              <ResearcherItem
                key={researcher.id}
                researcher={researcher}
                compact={search.view === "list"}
              />
            ))}
            {!error && filteredResearchers.length === 0 && (
              <li className="rounded-md border bg-surface px-5 py-8 text-center text-[13.5px] text-muted-foreground">
                Nenhum pesquisador encontrado para os filtros atuais.
              </li>
            )}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}

function FacetList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count?: number; active: boolean; onClick: () => void }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.label}>
            <button
              onClick={item.onClick}
              className={`flex w-full items-center justify-between gap-3 text-left text-foreground/85 hover:text-foreground ${
                item.active ? "font-medium text-foreground" : ""
              }`}
            >
              <span>{item.label}</span>
              {item.count != null && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {item.count.toLocaleString("pt-BR")}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResearcherItem({ researcher, compact }: { researcher: APIResearcher; compact: boolean }) {
  const productionYears = researcher.production
    .map((item) => item.year)
    .filter((year): year is number => Number.isFinite(year));
  const productionPeriod =
    productionYears.length > 0
      ? `${Math.min(...productionYears)}-${Math.max(...productionYears)}`
      : "—";

  return (
    <li className="rounded-md border bg-surface p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 font-serif text-[15px] text-primary">
          {researcher.name
            .split(" ")
            .map((part: string) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to="/pesquisadores/$id"
            params={{ id: researcher.id }}
            className="font-serif text-[17px] tracking-tight text-foreground hover:underline"
          >
            {researcher.name}
          </Link>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{researcher.title}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{researcher.institution}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {researcher.subareas.map((subarea: string) => (
          <Tag key={subarea}>{subarea}</Tag>
        ))}
      </div>
      {!compact && (
        <div className="mt-5">
          {researcher.production.length > 0 ? (
            <ProductionBars data={researcher.production} height={56} />
          ) : (
            <div className="h-14 flex items-center justify-center text-[11px] text-muted-foreground">
              Sem dados de produção
            </div>
          )}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t hairline pt-3 text-[12px]">
        <Stat label="Produções" value={String(researcher.publications)} />
        <Stat label="Área" value={researcher.area} />
        <Stat label="Período" value={productionPeriod} />
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="font-serif text-[17px] text-foreground">{value}</div>
    </div>
  );
}
