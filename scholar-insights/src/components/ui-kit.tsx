import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export function SearchInput({
  defaultValue = "",
  size = "lg",
  withSuggestions = true,
}: {
  defaultValue?: string;
  size?: "lg" | "md";
  withSuggestions?: boolean;
}) {
  const [v, setV] = useState(defaultValue);
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setV(defaultValue);
  }, [defaultValue]);

  const sugg = useMemo(() => {
    const base = [
      "competências em recuperação de informação no Nordeste",
      "pesquisadores e produções em ciência de dados",
      "ontologias em ciência da informação",
      "PLN para o português brasileiro em domínios acadêmicos",
      "evolução da produção em educação digital 2018-2024",
    ];
    if (!v) return base;
    const q = v.toLowerCase();
    return base.filter((s) => s.toLowerCase().includes(q)).slice(0, 5);
  }, [v]);

  const tall = size === "lg" ? "h-14" : "h-11";
  const text = size === "lg" ? "text-[15px]" : "text-[13.5px]";

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams(
            typeof window !== "undefined" ? window.location.search : "",
          );
          params.set("q", v);
          params.delete("mode");
          params.set("page", "0");
          navigate({
            to: "/buscar",
            search: Object.fromEntries(params.entries()) as never,
          });
        }}
        className={`flex ${tall} items-center gap-3 rounded-md border bg-surface px-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-foreground/5`}
      >
        <SearchGlyph />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          placeholder='Pesquise por tema, autor, instituição ou termo CAPES, ex.: "redes neurais educação superior"'
          className={`flex-1 bg-transparent ${text} text-foreground placeholder:text-muted-foreground/80 focus:outline-none`}
        />
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-sm border hairline bg-muted px-2 py-1 font-mono text-[10.5px] text-muted-foreground">
            CAPES
          </span>
          <span className="rounded-sm border hairline bg-muted px-2 py-1 font-mono text-[10.5px] text-muted-foreground">
            Facetas
          </span>
        </div>
        <button
          type="submit"
          className="ml-1 rounded-sm bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          Buscar
        </button>
      </form>

      {withSuggestions && focus && sugg.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-md border bg-popover shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Sugestões de busca
          </div>
          <ul className="border-t hairline">
            {sugg.map((s) => (
              <li key={s}>
                <Link
                  to="/buscar"
                  search={(() => {
                    return { q: s } as never;
                  })()}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] hover:bg-muted"
                >
                  <SearchGlyph small />
                  <span className="flex-1 truncate">{s}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">↵</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SearchGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 14 : 16;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-md border bg-surface p-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-serif text-[28px] leading-none text-foreground">{value}</div>
        {trend && (
          <span className="text-[12px] text-muted-foreground">
            <span className="text-foreground/80">{trend}</span> vs. ano anterior
          </span>
        )}
      </div>
      {sub && <div className="mt-2 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-2 font-serif text-[26px] leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Tag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "scholar" | "muted";
}) {
  const t =
    tone === "scholar"
      ? "border-scholar/30 bg-scholar/8 text-scholar"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "border bg-surface text-foreground/85";
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium ${t}`}
    >
      {children}
    </span>
  );
}
