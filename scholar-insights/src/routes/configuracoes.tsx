import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Scientia Discovery" },
      {
        name: "description",
        content: "Configurações de conta, preferências de busca e integrações.",
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
          {[
            "Conta",
            "Preferências de busca",
            "Notificações",
            "Integrações",
            "Equipe institucional",
            "Faturamento",
          ].map((s, i) => (
            <a
              key={s}
              href="#"
              className={`block rounded-sm px-3 py-2 ${i === 0 ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </a>
          ))}
        </aside>

        <div className="space-y-10">
          <div>
            <SectionHeader eyebrow="Conta" title="Perfil institucional" />
            <div className="mt-6 grid gap-5 rounded-md border bg-surface p-6 md:grid-cols-2">
              <Field label="Nome completo" value="Ana Lúcia Cardoso" />
              <Field label="E-mail institucional" value="ana.cardoso@uneb.br" />
              <Field label="ORCID" value="0000-0002-5841-3320" />
              <Field label="Lattes" value="lattes.cnpq.br/3920481726354019" />
              <Field label="Instituição" value="Universidade do Estado da Bahia" />
              <Field label="Programa" value="PPGCOMP — Ciência da Computação" />
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="Preferências" title="Busca e exibição" />
            <ul className="mt-5 divide-y hairline overflow-hidden rounded-md border bg-surface">
              {[
                {
                  t: "Modo de busca padrão",
                  d: "Define como as consultas são executadas inicialmente.",
                  v: "Híbrido",
                },
                {
                  t: "Idioma das sínteses",
                  d: "Idioma utilizado pelo assistente para resumos.",
                  v: "Português",
                },
                { t: "Densidade de resultados", d: "Compacta ou confortável.", v: "Confortável" },
                { t: "Tema da interface", d: "Sistema, claro ou escuro.", v: "Sistema" },
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
                { n: "Plataforma Lattes", s: "Sincronizado · há 4 h" },
                { n: "ORCID", s: "Sincronizado · há 1 d" },
                { n: "DSpace institucional (UNEB)", s: "Sincronizado · há 2 h" },
                { n: "Power BI Workspace", s: "Não conectado" },
              ].map((i) => (
                <div
                  key={i.n}
                  className="flex items-center justify-between rounded-md border bg-surface p-4"
                >
                  <div>
                    <div className="text-[14px] text-foreground">{i.n}</div>
                    <div className="text-[12px] text-muted-foreground">{i.s}</div>
                  </div>
                  <button className="rounded-sm border px-3 py-1.5 text-[12.5px] hover:bg-muted">
                    Gerenciar
                  </button>
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
