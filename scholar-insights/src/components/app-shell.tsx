import { Link, useRouterState } from "@tanstack/react-router";

const nav = [
  { to: "/", label: "Início" },
  { to: "/buscar", label: "Buscar" },
  { to: "/pesquisadores", label: "Pesquisadores" },
  { to: "/dashboard", label: "Analytics" },
  { to: "/assistente", label: "Assistente" },
  { to: "/api-docs", label: "API" },
] as const;

export function AppHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-8 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <span className="font-serif text-[15px] leading-none">S</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-[17px] tracking-tight text-foreground">Scientia</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Discovery
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-sm px-3 py-1.5 text-[13px] transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {active && <span className="mt-1 block h-px bg-foreground/80" aria-hidden />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="hidden rounded-sm border hairline px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground md:inline-flex">
            <span className="mr-2">Buscar</span>
            <kbd className="rounded border hairline bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <Link
            to="/configuracoes"
            className="rounded-sm border hairline bg-surface px-3 py-1.5 text-[13px] text-foreground hover:bg-muted"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-24 border-t hairline">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <span className="font-serif text-[13px] leading-none">S</span>
            </div>
            <span className="font-serif text-[15px]">Scientia Discovery</span>
          </div>
          <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
            Plataforma de busca semântica e mapeamento de competências científicas, integrada à base
            Lattes e a repositórios institucionais.
          </p>
        </div>
        {[
          { t: "Plataforma", l: ["Busca", "Pesquisadores", "Analytics", "Assistente"] },
          { t: "Recursos", l: ["Documentação", "API REST", "Changelog", "Status"] },
          { t: "Institucional", l: ["Sobre", "Pesquisa & dados", "Privacidade", "Contato"] },
        ].map((c) => (
          <div key={c.t}>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {c.t}
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {c.l.map((i) => (
                <li key={i}>
                  <a href="#" className="text-foreground/80 hover:text-foreground">
                    {i}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t hairline">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[12px] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} Scientia Discovery — Pesquisa e desenvolvimento acadêmico.
          </span>
          <span className="font-mono text-[11px]">v0.4.2 · build 2410</span>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>{children}</main>
      <AppFooter />
    </div>
  );
}
