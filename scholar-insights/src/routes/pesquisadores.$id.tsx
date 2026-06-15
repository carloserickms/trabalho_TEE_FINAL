import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { Tag, SectionHeader } from "@/components/ui-kit";
import { getResearcherById, type APIResearcher } from "@/lib/api";
import { ProductionBars } from "@/components/charts";
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
      { title: `${loaderData?.r.name} - Scientia Discovery` },
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
  const productionYears = r.production
    .map((item) => item.year)
    .filter((year): year is number => Number.isFinite(year));
  const productionPeriod =
    productionYears.length > 0
      ? `${Math.min(...productionYears)}-${Math.max(...productionYears)}`
      : "";
  const areas = uniqueValues([r.area, ...r.subareas]);
  const stats = [
    { label: "Produções", value: String(r.publications) },
    productionPeriod ? { label: "Período", value: productionPeriod } : null,
    r.collaborators.length > 0
      ? { label: "Colaboradores", value: String(r.collaborators.length) }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

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
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/8 font-serif text-[28px] text-primary">
              {initials(r.name)}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-[34px] leading-tight tracking-tight text-foreground">
                {r.name}
              </h1>
              {r.title && <div className="mt-1 text-[14px] text-muted-foreground">{r.title}</div>}
              <div className="mt-0.5 text-[14px] text-muted-foreground">
                {r.institution}
                {r.unit ? ` · ${r.unit}` : ""}
              </div>
              {areas.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {areas.map((area) => (
                    <Tag key={area} tone="scholar">
                      {area}
                    </Tag>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11.5px] text-muted-foreground">
                {r.orcid && (
                  <span>
                    ORCID <span className="text-foreground">{r.orcid}</span>
                  </span>
                )}
                <span>
                  Lattes <span className="text-foreground">{r.lattes}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface p-5">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 font-serif text-[26px] text-foreground">{stat.value}</div>
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
            <SectionHeader eyebrow="Produção recente" title="Produções registradas" />
            <ul className="mt-5 divide-y hairline rounded-md border bg-surface">
              {r.recent.length > 0 ? (
                r.recent.map((production) => (
                  <li key={production.doi || production.title} className="p-5">
                    <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">
                      {production.venue && <span>{production.venue}</span>}
                      {production.venue && production.year > 0 && <span>·</span>}
                      {production.year > 0 && <span>{production.year}</span>}
                      {production.qualis && <Tag tone="scholar">Qualis {production.qualis}</Tag>}
                    </div>
                    <div className="mt-1 font-serif text-[16.5px] leading-snug text-foreground">
                      {production.title}
                    </div>
                    {production.doi && (
                      <div className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">
                        DOI: {production.doi}
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
                <div className="py-8 text-center text-[13.5px] text-muted-foreground">
                  Dados de produção não disponíveis.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionHeader eyebrow="Rede" title="Colaboração científica" />
            <ul className="mt-4 divide-y hairline overflow-hidden rounded-md border bg-surface text-[13px]">
              {r.collaborators.length > 0 ? (
                r.collaborators.map((collaborator) => (
                  <li
                    key={collaborator.name}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <div>
                      <div className="text-foreground">{collaborator.name}</div>
                      {collaborator.institution && (
                        <div className="text-[11.5px] text-muted-foreground">
                          {collaborator.institution}
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {collaborator.shared} coautorias
                    </span>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2.5 text-[12px] text-muted-foreground">
                  Nenhuma coautoria encontrada entre os pesquisadores carregados.
                </li>
              )}
            </ul>
          </div>

          {areas.length > 0 && (
            <div className="rounded-md border bg-surface p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Áreas informadas
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <Tag key={area}>{area}</Tag>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </PageShell>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
