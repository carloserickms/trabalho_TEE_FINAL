import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Scientia Discovery" },
      {
        name: "description",
        content: "Configurações da aplicação, fontes de dados e importação.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2 text-[13px]">
          {["Fontes", "Busca", "Importação", "Segurança"].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`block w-full rounded-sm px-3 py-2 text-left ${index === 0 ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item}
            </button>
          ))}
        </aside>

        <div className="space-y-10">
          <div>
            <SectionHeader eyebrow="Aplicação" title="Fontes de dados configuradas" />
            <div className="mt-6 grid gap-5 rounded-md border bg-surface p-6 md:grid-cols-2">
              <Field label="Backend local" value="http://localhost:8000" />
              <Field label="API CAPES" value="https://apigw-proxy.capes.gov.br/observatorio" />
              <Field label="Banco local" value="PostgreSQL" />
              <Field label="CORS desenvolvimento" value="localhost:3000, 5173, 8080" />
              <Field label="Importação Lattes" value="CSV/XML local" />
              <Field label="Rotas admin" value="X-Admin-Token" />
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="Preferências" title="Busca e exibição" />
            <ul className="mt-5 divide-y hairline overflow-hidden rounded-md border bg-surface">
              {[
                {
                  t: "Fonte da busca de produções",
                  d: "A tela de busca consulta a API pública da CAPES.",
                  v: "CAPES",
                },
                {
                  t: "Idioma das sínteses",
                  d: "Idioma usado nas mensagens da interface.",
                  v: "Português",
                },
                { t: "Densidade de resultados", d: "Compacta ou confortável.", v: "Confortável" },
              ].map((p) => (
                <li key={p.t} className="grid grid-cols-[1fr_auto] items-center gap-6 px-6 py-4">
                  <div>
                    <div className="text-[14px] text-foreground">{p.t}</div>
                    <div className="text-[12.5px] text-muted-foreground">{p.d}</div>
                  </div>
                  <button className="rounded-sm border bg-surface px-3 py-1.5 text-[12.5px] text-foreground hover:bg-muted">
                    {p.v}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader eyebrow="Integrações" title="Fontes de dados conectadas" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                { n: "Plataforma Sucupira/CAPES", s: "Conectada via /api/capes/*" },
                { n: "Base local Lattes", s: "Conectada via PostgreSQL" },
                { n: "Importação Qualis", s: "Disponível em rota administrativa protegida" },
                { n: "Importação de pesquisadores", s: "Disponível via scripts e backend local" },
              ].map((i) => (
                <div
                  key={i.n}
                  className="flex items-center justify-between rounded-md border bg-surface p-4"
                >
                  <div>
                    <div className="text-[14px] text-foreground">{i.n}</div>
                    <div className="text-[12px] text-muted-foreground">{i.s}</div>
                  </div>
                  <span className="rounded-sm border px-3 py-1.5 text-[12.5px] text-muted-foreground">
                    Ativo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        defaultValue={value}
        className="mt-1.5 w-full rounded-sm border bg-background px-3 py-2 text-[13.5px] text-foreground focus:border-foreground/40 focus:outline-none"
      />
    </label>
  );
}
