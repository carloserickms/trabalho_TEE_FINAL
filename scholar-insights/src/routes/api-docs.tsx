import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API — Scientia Discovery" },
      {
        name: "description",
        content: "Documentação da API REST disponível no backend atual.",
      },
    ],
  }),
  component: ApiDocsPage,
});

const endpoints = [
  {
    m: "GET",
    p: "/api/capes/producoes",
    d: "Consulta produções na API pública da Plataforma Sucupira/CAPES com search, query por facetas e paginação.",
  },
  {
    m: "GET",
    p: "/api/capes/facets",
    d: "Lista as facetas de produção disponíveis para montar filtros no front.",
  },
  {
    m: "GET",
    p: "/api/capes/facets/{filter_name}",
    d: "Obtém valores válidos de uma faceta CAPES, como ano, instituição, área ou programa.",
  },
  {
    m: "GET",
    p: "/api/pesquisadores",
    d: "Lista pesquisadores importados da base local Lattes.",
  },
  { m: "GET", p: "/api/pesquisadores/{id}", d: "Retorna o perfil consolidado de um pesquisador." },
  {
    m: "GET",
    p: "/api/producoes/busca",
    d: "Executa busca textual/ranqueada sobre as produções carregadas no banco local.",
  },
  {
    m: "POST",
    p: "/v1/search",
    d: "Endpoint compatível com clientes externos para busca na base local.",
  },
  {
    m: "POST",
    p: "/v1/embeddings",
    d: "Gera um vetor determinístico simples para prototipação e testes de integração.",
  },
  { m: "GET", p: "/api/dashboard/stats", d: "Totais e série histórica do painel." },
  { m: "GET", p: "/api/metrics/area", d: "Indicadores agregados por área." },
  { m: "GET", p: "/api/metrics/institution", d: "Indicadores agregados por instituição." },
];

function ApiDocsPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6 text-[13px]">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Sumário
            </div>
            <ul className="mt-3 space-y-1.5 text-foreground/85">
              {[
                "Visão geral",
                "CAPES",
                "Pesquisadores",
                "Busca local",
                "Métricas",
                "Administração",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border bg-surface p-4 text-[12.5px] text-muted-foreground">
            Rotas administrativas de importação exigem o header <code>X-Admin-Token</code> quando o
            backend está configurado com <code>ADMIN_API_TOKEN</code>.
          </div>
        </aside>

        <div className="space-y-12">
          <div>
            <SectionHeader
              eyebrow="API REST"
              title="Endpoints disponíveis no backend atual"
              description="A API combina a base local Lattes importada para PostgreSQL com consultas em tempo real à Plataforma Sucupira/CAPES para produções e facetas."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Info label="Base local" value="http://localhost:8000" />
              <Info label="Formato" value="JSON · UTF-8" />
              <Info label="CAPES" value="/api/capes/*" />
            </div>
          </div>

          <div>
            <SectionHeader title="Endpoints" />
            <ul className="mt-5 divide-y hairline overflow-hidden rounded-md border bg-surface">
              {endpoints.map((endpoint) => (
                <li
                  key={endpoint.p}
                  className="grid gap-3 px-5 py-3 text-[13.5px] md:grid-cols-[64px_1fr_2fr] md:items-center md:gap-4"
                >
                  <span
                    className={`inline-flex w-fit rounded-sm px-2 py-0.5 font-mono text-[11px] ${
                      endpoint.m === "GET"
                        ? "bg-primary/8 text-primary"
                        : "bg-scholar/10 text-scholar"
                    }`}
                  >
                    {endpoint.m}
                  </span>
                  <code className="font-mono text-[13px] text-foreground">{endpoint.p}</code>
                  <span className="text-muted-foreground">{endpoint.d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader title="Exemplo — busca CAPES com facetas" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-md border bg-surface-elevated p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
                {`curl "http://localhost:8000/api/capes/producoes?search=inteligencia%20artificial&year=2024&institution=UFBA&page=0&size=20"`}
              </pre>
              <pre className="overflow-x-auto rounded-md border bg-surface-elevated p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
                {`{
  "results": [
    {
      "id": "capes-...",
      "title": "Título da produção",
      "authors": ["Autor"],
      "venue": "UFBA · Programa",
      "year": 2024,
      "highlights": ["Bibliográfica", "Artigo"]
    }
  ],
  "page": 0,
  "size": 20,
  "hasMore": true,
  "source": "capes"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-[13px] text-foreground">{value}</div>
    </div>
  );
}
