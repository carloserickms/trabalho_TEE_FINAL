import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { Tag, SectionHeader } from "@/components/ui-kit";
import { getResearcherById, type APIResearcher } from "@/lib/api";
import { ProductionBars, CollaborationGraph } from "@/components/charts";
import { Breadcrumbs } from "./buscar";

export const Route = createFileRoute("/pesquisadores/$id")({
  staleTime: 0,
  shouldReload: true,
  loader: async ({ params }) => {
    const r = await getResearcherById(params.id);
    if (!r) throw notFound();
    return { r };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.r.name} — Scientia Discovery` },
      { name: "description", content: loaderData?.r.bio ?? "Perfil do pesquisador." },
    ],
  }),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-[1280px] px-6 py-20">
        <h1 className="font-serif text-2xl">Pesquisador não encontrado</h1>
        <Link to="/pesquisadores" className="mt-4 inline-block underline">
          Voltar ao diretório
        </Link>
      </div>
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="mx-auto max-w-[1280px] px-6 py-20">{error.message}</div>
    </PageShell>
  ),
  component: ResearcherProfile,
});

function ResearcherProfile() {
  const { r } = Route.useLoaderData() as { r: APIResearcher };

  return (
    <PageShell>
      <section className="border-b hairline">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <Breadcrumbs
            items={[
              { to: "/", label: "Início" },
              { to: "/pesquisadores", label: "Pesquisadores" },
              { label: r.name },
            ]}
          />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/8 font-serif text-[28px] text-primary">
              {r.name
                .split(" ")
                .map((p: string) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-[34px] leading-tight tracking-tight text-foreground">
                {r.name}
              </h1>
              <div className="mt-1 text-[14px] text-muted-foreground">{r.title}</div>
              <div className="mt-0.5 text-[14px] text-muted-foreground">
                {r.institution}
                {r.unit ? ` · ${r.unit}` : ""}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.subareas.map((s: string) => (
                  <Tag key={s} tone="scholar">
                    {s}
                  </Tag>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11.5px] text-muted-foreground">
                <span>
                  ORCID <span className="text-foreground">{r.orcid || "—"}</span>
                </span>
                <span>
                  Lattes <span className="text-foreground">{r.lattes}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to="/assistente"
                search={{ rid: r.id } as never}
                className="rounded-sm bg-primary px-4 py-2 text-center text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Conversar com o assistente sobre este pesquisador
              </Link>
              <button className="rounded-sm border bg-surface px-4 py-2 text-[13px] text-foreground hover:bg-muted">
                Exportar perfil (PDF)
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
          {[
            { l: "h-index", v: String(r.hIndex || "—") },
            { l: "Produções", v: String(r.publications) },
            { l: "Citações", v: r.citations ? r.citations.toLocaleString("pt-BR") : "—" },
            { l: "Colaboradores", v: String(r.collaborators.length || "—") },
          ].map((s) => (
            <div key={s.l} className="bg-surface p-5">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {s.l}
              </div>
              <div className="mt-1 font-serif text-[26px] text-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 pb-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <div>
            <SectionHeader eyebrow="Síntese" title="Biografia / Resumo" />
            <p className="mt-5 max-w-2xl font-serif text-[17px] leading-relaxed text-foreground/90">
              {r.bio || "Nenhuma informação biográfica disponível."}
            </p>
          </div>

          <div>
            <SectionHeader eyebrow="Produção recente" title="Artigos e capítulos" />
            <ul className="mt-5 divide-y hairline rounded-md border bg-surface">
              {r.recent.length > 0 ? (
                r.recent.map((p) => (
                  <li key={p.doi || p.title} className="p-5">
                    <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span>{p.venue}</span>
                      <span>·</span>
                      <span>{p.year}</span>
                      {p.qualis && <Tag tone="scholar">Qualis {p.qualis}</Tag>}
                    </div>
                    <div className="mt-1 font-serif text-[16.5px] leading-snug text-foreground">
                      {p.title}
                    </div>
                    {p.doi && (
                      <div className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">
                        DOI: {p.doi}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="p-5 text-[13.5px] text-muted-foreground">
                  Nenhuma produção recente encontrada.
                </li>
              )}
            </ul>
          </div>

          <div>
            <SectionHeader eyebrow="Série histórica" title="Produção anual" />
            <div className="mt-5 rounded-md border bg-surface p-5">
              {r.production.length > 0 ? (
                <ProductionBars data={r.production} height={130} />
              ) : (
                <div className="text-[13.5px] text-muted-foreground py-8 text-center">
                  Dados de produção não disponíveis.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionHeader eyebrow="Rede" title="Colaboração científica" />
            <div className="mt-5">
              <CollaborationGraph />
            </div>
            <ul className="mt-4 divide-y hairline overflow-hidden rounded-md border bg-surface text-[13px]">
              {r.collaborators.length > 0 ? (
                r.collaborators.map((c) => (
                  <li key={c.name} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="text-foreground">{c.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{c.institution}</div>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.shared} co-autorias
                    </span>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2.5 text-[12px] text-muted-foreground">
                  Nenhum colaborador encontrado.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Competências
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Pesquisa acadêmica", "Produção científica", "Plataforma Lattes"].map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
