import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { Tag } from "@/components/ui-kit";
import { searchCapesProductions } from "@/lib/api";
import { useState } from "react";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — Scientia Discovery" },
      {
        name: "description",
        content: "Assistente de descoberta científica com contexto sobre a base indexada.",
      },
    ],
  }),
  component: AssistantPage,
});

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; venue: string; year: number }[];
};

const initial: Msg[] = [
  {
    role: "assistant",
    content:
      "Digite um termo, área, autor, instituição ou tema para recuperar produções diretamente da API pública da Plataforma Sucupira/CAPES.",
  },
];

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: query },
      { role: "assistant", content: "Consultando a base CAPES..." },
    ]);
    setInput("");

    try {
      const response = await searchCapesProductions(query, {}, 0, 5);
      const sources = response.results.map((result) => ({
        title: result.title,
        venue: result.venue || "CAPES",
        year: result.year,
      }));
      const content =
        response.results.length > 0
          ? `Encontrei ${response.results.length} produções relacionadas na base CAPES. Os primeiros resultados indicam ${summarizeResults(response.results)}. Use a página de busca para refinar por ano, instituição, área ou subtipo.`
          : "Nenhuma produção foi encontrada na CAPES para essa consulta. Tente um termo mais amplo, uma instituição ou uma área de conhecimento.";

      setMessages((current) =>
        replaceLastAssistant(current, { role: "assistant", content, sources }),
      );
    } catch (error) {
      setMessages((current) =>
        replaceLastAssistant(current, {
          role: "assistant",
          content:
            error instanceof Error
              ? `Não foi possível consultar a API CAPES agora: ${error.message}`
              : "Não foi possível consultar a API CAPES agora.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_300px]">
        <div className="flex min-h-[70vh] flex-col rounded-md border bg-surface">
          <div className="flex items-center justify-between border-b hairline px-6 py-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Assistente
              </div>
              <h1 className="mt-1 font-serif text-[20px] tracking-tight">
                Conversar com a base indexada
              </h1>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              contexto: API CAPES · base local Lattes
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {messages.map((message, index) => (
              <div key={index} className="flex gap-4">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm font-mono text-[10.5px] ${
                    message.role === "user"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.role === "user" ? "Você" : "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15.5px] leading-relaxed text-foreground/95">
                    {message.content}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 rounded-md border bg-surface-elevated p-4">
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Fontes utilizadas
                      </div>
                      <ol className="mt-2 space-y-1.5 text-[13px]">
                        {message.sources.map((source, idx) => (
                          <li key={`${source.title}-${idx}`} className="flex gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              [{idx + 1}]
                            </span>
                            <span>
                              <span className="text-foreground">{source.title}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                — {source.venue}, {source.year || "ano não informado"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t hairline p-4">
            <div className="flex items-end gap-3 rounded-md border bg-background p-3 focus-within:border-foreground/40">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Pergunte sobre pesquisadores, áreas, instituições ou temas de produção científica..."
                className="flex-1 resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              />
              <button
                onClick={() => void send()}
                disabled={loading}
                className="rounded-sm bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Buscando" : "Enviar"}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>As respostas usam os primeiros registros recuperados da API CAPES.</span>
              <span className="font-mono">Shift + Enter nova linha</span>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Sugestões
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {[
                "inteligência artificial educação",
                "produção científica em saúde coletiva",
                "recuperação da informação",
                "UFBA educação 2024",
              ].map((suggestion) => (
                <li key={suggestion}>
                  <button
                    onClick={() => setInput(suggestion)}
                    className="text-left text-foreground/85 underline-offset-4 hover:underline"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Contexto ativo
            </div>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-foreground/85">Consulta</span>
                <Tag>Texto livre</Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/85">Janela temporal</span>
                <Tag>Sem filtro</Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/85">Fonte</span>
                <Tag>CAPES</Tag>
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-surface p-5 text-[12.5px] text-muted-foreground">
            Esta tela recupera produções reais pela API pública da Plataforma Sucupira/CAPES e
            apresenta uma síntese simples dos primeiros resultados retornados.
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function replaceLastAssistant(messages: Msg[], next: Msg): Msg[] {
  const updated = [...messages];
  for (let index = updated.length - 1; index >= 0; index -= 1) {
    if (updated[index].role === "assistant") {
      updated[index] = next;
      return updated;
    }
  }
  return [...updated, next];
}

function summarizeResults(results: Awaited<ReturnType<typeof searchCapesProductions>>["results"]) {
  const years = [...new Set(results.map((result) => result.year).filter(Boolean))].sort(
    (a, b) => b - a,
  );
  const venues = [...new Set(results.map((result) => result.venue).filter(Boolean))].slice(0, 3);
  const authors = [...new Set(results.flatMap((result) => result.authors).filter(Boolean))].slice(
    0,
    3,
  );

  const parts = [];
  if (years.length) parts.push(`registros entre ${years[years.length - 1]} e ${years[0]}`);
  if (venues.length) parts.push(`vínculos como ${venues.join(", ")}`);
  if (authors.length) parts.push(`autorias incluindo ${authors.join(", ")}`);
  return parts.length ? parts.join("; ") : "registros relacionados ao termo informado";
}
