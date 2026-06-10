import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SearchInput, Tag } from "@/components/ui-kit";
import { searchProductions, getInstituicoes, type SearchResult } from "@/lib/api";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  mode: fallback(z.enum(["hybrid", "fulltext", "semantic"]), "hybrid").default("hybrid"),
});

export const Route = createFileRoute("/buscar")({
  staleTime: 0,
  shouldReload: true,
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { q, mode } }) => ({ q, mode }),
  loader: async ({ deps }) => {
    try {
      const [results, institutions] = await Promise.all([
        deps.q ? searchProductions(deps.q, deps.mode) : Promise.resolve([] as SearchResult[]),
        getInstituicoes(),
      ]);
      return { results, institutions, query: deps.q, mode: deps.mode };
    } catch {
      return {
        results: [] as SearchResult[],
        institutions: [] as string[],
        query: deps.q,
        mode: deps.mode,
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Resultados da busca — Scientia Discovery" },
      {
        name: "description",
        content: "Resultados da busca textual e semântica de produções científicas.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { results, institutions, query, mode } = Route.useLoaderData() as {
    results: SearchResult[];
    institutions: string[];
    query: string;
    mode: "hybrid" | "fulltext" | "semantic";
  };
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/buscar" });
  const [sort, setSort] = useState("relevance");

  const areas = [
    { name: "Ciência da Computação", count: results.length },
    { name: "Ciência da Informação", count: Math.floor(results.length * 0.6) },
    { name: "Educação", count: Math.floor(results.length * 0.4) },
  ].filter((a) => a.count > 0);

  return (
    <PageShell>
      <section className="border-b hairline bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <Breadcrumbs items={[{ to: "/", label: "Início" }, { label: "Resultados" }]} />
          <div className="mt-5">
            <SearchInput defaultValue={q} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-muted-foreground">Modo</span>
              <div className="inline-flex overflow-hidden rounded-sm border">
                {(["hybrid", "fulltext", "semantic"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() =>
                      navigate({
                        search: (prev) => ({ ...prev, mode: m }),
                        replace: true,
                      })
                    }
                    className={`px-3 py-1.5 text-[12.5px] ${
                      mode === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    {m === "hybrid" ? "Híbrido" : m === "fulltext" ? "Full-text" : "Semântico"}
                  </button>
                ))}
              </div>
              <span className="text-[12.5px] text-muted-foreground">
                {results.length} resultados{q ? ` — para "${q}"` : ""}
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
                <option value="qualis">Qualis</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[260px_1fr_280px]">
        {/* Filters */}
        <aside className="space-y-6">
          <FilterGroup
            title="Área de conhecimento"
            items={areas.map((a) => ({ label: a.name, count: a.count }))}
          />
          <FilterGroup
            title="Instituição"
            items={institutions.slice(0, 6).map((i) => ({ label: i, count: 0 }))}
          />
          <YearRange />
        </aside>

        {/* Results */}
        <div>
          {query && (
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip label={`busca: ${query}`} />
              <button className="text-[12px] text-muted-foreground underline-offset-4 hover:underline">
                limpar filtros
              </button>
            </div>
          )}

          <ul className="divide-y hairline border-y hairline">
            {results.length > 0 ? (
              results.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{r.venue}</span>
                    <span>·</span>
                    <span>{r.year}</span>
                    {r.qualis && <Tag tone="scholar">Qualis {r.qualis}</Tag>}
                  </div>
                  <Link
                    to="/"
                    className="mt-1 block font-serif text-[20px] leading-snug tracking-tight text-foreground hover:underline"
                  >
                    {highlight(r.title, query)}
                  </Link>
                  <div className="mt-1.5 text-[13px] text-foreground/80">
                    {r.authors.map((a, i) => (
                      <span key={a}>
                        {r.pesquisadorId ? (
                          <Link
                            to="/pesquisadores/$id"
                            params={{ id: r.pesquisadorId }}
                            className="underline-offset-4 hover:underline"
                          >
                            {a}
                          </Link>
                        ) : (
                          <span>{a}</span>
                        )}
                        {i < r.authors.length - 1 ? ", " : ""}
                      </span>
                    ))}
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
                  <div className="mt-3 flex gap-4 text-[12.5px] text-foreground/80">
                    {r.doi && <span className="underline-offset-4">DOI: {r.doi}</span>}
                    <a className="underline-offset-4 hover:underline" href="#">
                      Citar (BibTeX)
                    </a>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-12 text-center text-[14px] text-muted-foreground">
                {query
                  ? "Nenhum resultado encontrado para esta busca."
                  : "Faça uma busca para encontrar produções."}
              </li>
            )}
          </ul>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          {query && (
            <div className="rounded-md border bg-surface p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Síntese da consulta
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">
                {results.length > 0
                  ? `Encontrados ${results.length} resultados para "${query}".`
                  : "Nenhum resultado encontrado."}
              </p>
              <Link
                to="/assistente"
                className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-foreground underline-offset-4 hover:underline"
              >
                Aprofundar com o assistente →
              </Link>
            </div>
          )}

          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Termos relacionados
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["recuperação semântica", "BM25", "currículos Lattes", "embeddings densos"].map(
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

function FilterGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b hairline pb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.label}>
              <label className="flex items-center justify-between gap-2 text-[13px] text-foreground/85">
                <span className="flex items-center gap-2">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-primary" />
                  {i.label}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {i.count.toLocaleString("pt-BR")}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function YearRange() {
  return (
    <div className="border-b hairline pb-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Ano
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12.5px]">
        <input
          defaultValue=""
          className="w-full rounded-sm border bg-surface px-2 py-1 font-mono"
          placeholder="De"
        />
        <span className="text-muted-foreground">—</span>
        <input
          defaultValue=""
          className="w-full rounded-sm border bg-surface px-2 py-1 font-mono"
          placeholder="Até"
        />
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border bg-surface px-2 py-1 text-[12px] text-foreground/85">
      {label}
      <button className="text-muted-foreground hover:text-foreground" aria-label="remover">
        ×
      </button>
    </span>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="rounded-[2px] bg-scholar/15 px-0.5 text-foreground">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  } catch {
    return text;
  }
}

export function Breadcrumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <ol className="flex items-center gap-2 text-[12px] text-muted-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          {it.to ? (
            <Link to={it.to} className="hover:text-foreground">
              {it.label}
            </Link>
          ) : (
            <span className="text-foreground/85">{it.label}</span>
          )}
          {i < items.length - 1 && <span>/</span>}
        </li>
      ))}
    </ol>
  );
}
