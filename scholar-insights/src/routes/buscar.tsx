import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { PageShell } from "@/components/app-shell";
import { SearchInput, Tag } from "@/components/ui-kit";
import {
  getCapesFacets,
  searchCapesProductions,
  type CapesFacet,
  type SearchResult,
} from "@/lib/api";

const cleanParam = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^"|"$/g, "");
}, z.string());

const searchSchema = z.object({
  q: fallback(cleanParam, "").default(""),
  year: fallback(cleanParam, "").default(""),
  institution: fallback(cleanParam, "").default(""),
  largeArea: fallback(cleanParam, "").default(""),
  area: fallback(cleanParam, "").default(""),
  subtype: fallback(cleanParam, "").default(""),
  page: fallback(z.coerce.number().int().nonnegative(), 0).default(0),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/buscar")({
  staleTime: 0,
  shouldReload: true,
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const filters = {
        year: deps.year,
        institution: deps.institution,
        largeArea: deps.largeArea,
        area: deps.area,
        subtype: deps.subtype,
      };
      const [response, facets] = await Promise.all([
        searchCapesProductions(deps.q, filters, deps.page, 20),
        getCapesFacets(),
      ]);
      return {
        results: response.results,
        facets,
        query: deps.q,
        params: deps,
        page: response.page,
        hasMore: response.hasMore,
        error: "",
      };
    } catch (error) {
      return {
        results: [] as SearchResult[],
        facets: [] as CapesFacet[],
        query: deps.q,
        params: deps,
        page: deps.page,
        hasMore: false,
        error: error instanceof Error ? error.message : "Falha ao consultar a API CAPES.",
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Resultados da busca — Scientia Discovery" },
      {
        name: "description",
        content: "Resultados da busca textual em produções científicas da Plataforma Sucupira.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { results, facets, query, params, page, hasMore, error } = Route.useLoaderData() as {
    results: SearchResult[];
    facets: CapesFacet[];
    query: string;
    params: SearchParams;
    page: number;
    hasMore: boolean;
    error: string;
  };
  const search = Route.useSearch() as SearchParams;
  const navigate = useNavigate({ from: "/buscar" });
  const [sort, setSort] = useState("relevance");

  const sortedResults = useMemo(() => sortResults(results, sort), [results, sort]);
  const activeFilters = [
    ["year", "ano"],
    ["institution", "instituição"],
    ["largeArea", "grande área"],
    ["area", "área"],
    ["subtype", "subtipo"],
  ]
    .map(([key, label]) => ({ key, label, value: params[key as keyof SearchParams] }))
    .filter((item) => item.value);

  function updateSearch(next: Partial<SearchParams>) {
    navigate({
      search: (prev) => ({ ...prev, ...next, page: next.page ?? 0 }),
      replace: true,
    });
  }

  return (
    <PageShell>
      <section className="border-b hairline bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <Breadcrumbs items={[{ to: "/", label: "Início" }, { label: "Resultados" }]} />
          <div className="mt-5">
            <SearchInput defaultValue={search.q} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              <Tag tone="scholar">CAPES Sucupira</Tag>
              <span>
                {results.length} resultados{query ? ` para "${query}"` : ""}
              </span>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              Ordenar por
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-sm border bg-surface px-2 py-1 text-[12.5px] text-foreground"
              >
                <option value="relevance">Relevância</option>
                <option value="recent">Mais recentes</option>
                <option value="title">Título</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[280px_1fr_280px]">
        <aside className="space-y-4">
          <FacetSelect
            label="Ano"
            value={params.year}
            facet={findFacet(facets, "year")}
            onChange={(value) => updateSearch({ year: value })}
          />
          <FacetSelect
            label="Instituição"
            value={params.institution}
            facet={findFacet(facets, "institution")}
            onChange={(value) => updateSearch({ institution: value })}
          />
          <FacetSelect
            label="Grande área"
            value={params.largeArea}
            facet={findFacet(facets, "largeArea")}
            onChange={(value) => updateSearch({ largeArea: value })}
          />
          <FacetSelect
            label="Área de conhecimento"
            value={params.area}
            facet={findFacet(facets, "area")}
            onChange={(value) => updateSearch({ area: value })}
          />
          <FacetSelect
            label="Subtipo"
            value={params.subtype}
            facet={findFacet(facets, "subtype")}
            onChange={(value) => updateSearch({ subtype: value })}
          />
        </aside>

        <div>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {(query || activeFilters.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {query && <Chip label={`busca: ${query}`} />}
              {activeFilters.map((filter) => (
                <Chip key={filter.key} label={`${filter.label}: ${filter.value}`} />
              ))}
              <button
                onClick={() =>
                  updateSearch({
                    q: "",
                    year: "",
                    institution: "",
                    largeArea: "",
                    area: "",
                    subtype: "",
                  })
                }
                className="text-[12px] text-muted-foreground underline-offset-4 hover:underline"
              >
                limpar filtros
              </button>
            </div>
          )}

          <ul className="divide-y hairline border-y hairline">
            {sortedResults.length > 0 ? (
              sortedResults.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{r.venue}</span>
                    <span>·</span>
                    <span>{r.year}</span>
                    {r.qualis && <Tag tone="scholar">Qualis {r.qualis}</Tag>}
                  </div>
                  <div className="mt-1 block font-serif text-[20px] leading-snug tracking-tight text-foreground">
                    {highlight(r.title, query)}
                  </div>
                  <div className="mt-1.5 text-[13px] text-foreground/80">
                    {r.authors.join(", ")}
                  </div>
                  <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
                    {highlight(r.abstract || "", query)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.highlights.map((h) => (
                      <Tag key={h} tone="muted">
                        {h}
                      </Tag>
                    ))}
                  </div>
                </li>
              ))
            ) : (
              <li className="py-12 text-center text-[14px] text-muted-foreground">
                {query || activeFilters.length > 0
                  ? "Nenhum resultado encontrado para esta busca."
                  : "Faça uma busca ou selecione filtros para encontrar produções na CAPES."}
              </li>
            )}
          </ul>

          <div className="mt-6 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <button
              disabled={page <= 0}
              onClick={() => updateSearch({ page: Math.max(page - 1, 0) })}
              className="rounded-sm border bg-surface px-3 py-1.5 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button
              disabled={!hasMore}
              onClick={() => updateSearch({ page: page + 1 })}
              className="rounded-sm border bg-surface px-3 py-1.5 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Fonte dos dados
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">
              Esta busca consulta a API pública da Plataforma Sucupira/CAPES. Perfis completos de
              pesquisadores continuam vindo da base local Lattes.
            </p>
          </div>

          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Termos relacionados
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["produção acadêmica", "Sucupira", "programas CAPES", "teses", "dissertações"].map(
                (t) => (
                  <Tag key={t}>{t}</Tag>
                ),
              )}
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function findFacet(facets: CapesFacet[], id: string): CapesFacet | undefined {
  return facets.find((facet) => facet.id === id);
}

function FacetSelect({
  label,
  value,
  facet,
  onChange,
}: {
  label: string;
  value: string;
  facet?: CapesFacet;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block border-b hairline pb-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-sm border bg-surface px-2 py-2 text-[12.5px] text-foreground"
      >
        <option value="">Todos</option>
        {(facet?.values ?? []).map((item) => (
          <option key={`${facet?.id}-${item.key}`} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function sortResults(results: SearchResult[], sort: string): SearchResult[] {
  const copy = [...results];
  if (sort === "recent") {
    return copy.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  }
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  return copy.sort((a, b) => b.similarity - a.similarity || b.year - a.year);
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border bg-surface px-2 py-1 text-[12px] text-foreground/85">
      {label}
    </span>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, index) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={index} className="rounded-[2px] bg-scholar/15 px-0.5 text-foreground">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  } catch {
    return text;
  }
}

export function Breadcrumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <ol className="flex items-center gap-2 text-[12px] text-muted-foreground">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-2">
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground/85">{item.label}</span>
          )}
          {index < items.length - 1 && <span>/</span>}
        </li>
      ))}
    </ol>
  );
}
