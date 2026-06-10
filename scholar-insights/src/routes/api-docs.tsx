import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API — Scientia Discovery" },
      {
        name: "description",
        content: "Documentação da API REST para acesso programático à base indexada.",
      },
    ],
  }),
  component: ApiDocsPage,
});

const endpoints = [
  {
    m: "GET",
    p: "/v1/researchers",
    d: "Lista pesquisadores com filtros por área, instituição e Qualis.",
  },
  { m: "GET", p: "/v1/researchers/{id}", d: "Retorna o perfil consolidado de um pesquisador." },
  {
    m: "POST",
    p: "/v1/search",
    d: "Executa busca textual, semântica ou híbrida sobre as produções.",
  },
  {
    m: "POST",
    p: "/v1/embeddings",
    d: "Gera embeddings vetoriais a partir de um trecho ou documento.",
  },
  { m: "GET", p: "/v1/metrics/area", d: "Indicadores agregados por área CNPq." },
  { m: "GET", p: "/v1/metrics/institution", d: "Indicadores agregados por instituição." },
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
                "Autenticação",
                "Pesquisadores",
                "Busca",
                "Embeddings",
                "Métricas",
                "Limites",
              ].map((s) => (
                <li key={s}>
                  <a href="#" className="hover:text-foreground">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              SDKs
            </div>
            <ul className="mt-3 space-y-1.5 text-foreground/85">
              {["Python · scientia-py", "TypeScript · @scientia/sdk", "R · scientiaR"].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-12">
          <div>
            <SectionHeader
              eyebrow="API REST"
              title="Acesso programático à base"
              description="A API expõe os mesmos recursos disponíveis na interface, com versionamento estável, autenticação por chave e limites por instituição."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Info label="Base URL" value="https://api.scientia.discovery/v1" />
              <Info label="Formato" value="JSON · UTF-8" />
              <Info label="Autenticação" value="Bearer token" />
            </div>
          </div>

          <div>
            <SectionHeader title="Endpoints" />
            <ul className="mt-5 divide-y hairline overflow-hidden rounded-md border bg-surface">
              {endpoints.map((e) => (
                <li
                  key={e.p}
                  className="grid grid-cols-[64px_1fr_2fr] items-center gap-4 px-5 py-3 text-[13.5px]"
                >
                  <span
                    className={`inline-flex w-fit rounded-sm px-2 py-0.5 font-mono text-[11px] ${
                      e.m === "GET" ? "bg-primary/8 text-primary" : "bg-scholar/10 text-scholar"
                    }`}
                  >
                    {e.m}
                  </span>
                  <code className="font-mono text-[13px] text-foreground">{e.p}</code>
                  <span className="text-muted-foreground">{e.d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader title="Exemplo — busca híbrida" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-md border bg-surface-elevated p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
                {`curl -X POST https://api.scientia.discovery/v1/search \\
  -H "Authorization: Bearer $SCIENTIA_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "embeddings para mapeamento de competências",
    "mode": "hybrid",
    "filters": {
      "area": ["Ciência da Computação"],
      "year": { "from": 2020, "to": 2024 },
      "qualis": ["A1", "A2"]
    },
    "limit": 20
  }'`}
              </pre>
              <pre className="overflow-x-auto rounded-md border bg-surface-elevated p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
                {`{
  "took_ms": 142,
  "total": 1247,
  "results": [
    {
      "id": "wos:000984712300012",
      "title": "Embeddings contextuais para…",
      "authors": ["Ana L. Cardoso", "M. H. Tavares"],
      "venue": "SBBD",
      "year": 2024,
      "qualis": "A2",
      "doi": "10.5753/sbbd.2024.0142",
      "similarity": 0.94
    }
  ]
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
