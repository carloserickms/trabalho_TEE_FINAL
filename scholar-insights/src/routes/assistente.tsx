import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { Tag } from "@/components/ui-kit";
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
    role: "user",
    content:
      "Quais são os principais grupos brasileiros que pesquisam recuperação semântica aplicada a currículos Lattes?",
  },
  {
    role: "assistant",
    content:
      "A produção concentra-se em três núcleos principais. O grupo da UNEB, liderado por Ana Lúcia Cardoso, atua sobre embeddings contextuais e busca híbrida em currículos Lattes, com ênfase em mapeamento de competências regionais. Na USP, o grupo de Eduardo Pires trabalha escalabilidade de recuperação esparsa-densa em corpora científicos. Na UFPE, Sofia Beltrão lidera trabalhos de adaptação de modelos de linguagem ao português acadêmico. Há colaboração documentada entre UNEB e UFBA por meio do grupo de Marcelo H. Tavares, com foco em cienciometria.",
    sources: [
      {
        title:
          "Embeddings contextuais para mapeamento de competências em repositórios institucionais",
        venue: "SBBD",
        year: 2024,
      },
      {
        title: "Hybrid retrieval over Lattes curricula: a Brazilian case study",
        venue: "IP&M",
        year: 2024,
      },
      {
        title: "Scaling sparse-dense hybrid retrieval for scholarly corpora",
        venue: "SIGIR",
        year: 2024,
      },
    ],
  },
];

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "Síntese baseada nos documentos indexados: a literatura recente aponta convergência entre métodos de recuperação esparsa e densa. Recomendo consultar os trabalhos abaixo para um panorama mais completo, e considerar o filtro Qualis A1/A2 ao restringir a leitura.",
        sources: [
          {
            title: "Open knowledge graphs from institutional repositories",
            venue: "Scientometrics",
            year: 2023,
          },
        ],
      },
    ]);
    setInput("");
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
              contexto: 41 287 currículos · 312 940 produções
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {messages.map((m, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm font-mono text-[10.5px] ${
                    m.role === "user"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.role === "user" ? "Você" : "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15.5px] leading-relaxed text-foreground/95">
                    {m.content}
                  </div>
                  {m.sources && (
                    <div className="mt-4 rounded-md border bg-surface-elevated p-4">
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Fontes utilizadas
                      </div>
                      <ol className="mt-2 space-y-1.5 text-[13px]">
                        {m.sources.map((s, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              [{idx + 1}]
                            </span>
                            <span>
                              <span className="text-foreground">{s.title}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                — {s.venue}, {s.year}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Pergunte sobre pesquisadores, áreas, métricas ou peça resumos comparativos…"
                className="flex-1 resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              />
              <button
                onClick={send}
                className="rounded-sm bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Enviar
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>As respostas citam as fontes recuperadas da base institucional.</span>
              <span className="font-mono">⇧ + ↵ nova linha</span>
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
                "Resumir a produção de Ana L. Cardoso em 5 pontos",
                "Sugerir três pesquisadores afins a esta linha",
                "Comparar abordagens de busca híbrida",
                "Mapear evolução temática em 2020–2024",
              ].map((s) => (
                <li key={s}>
                  <button
                    onClick={() => setInput(s)}
                    className="text-left text-foreground/85 underline-offset-4 hover:underline"
                  >
                    {s}
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
                <span className="text-foreground/85">Área</span>
                <Tag>Ciência da Computação</Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/85">Janela temporal</span>
                <Tag>2020 — 2024</Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/85">Qualis</span>
                <Tag>A1, A2</Tag>
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-surface p-5 text-[12.5px] text-muted-foreground">
            O assistente opera sobre embeddings densos indexados em pgvector e recupera documentos
            por similaridade contextual; respostas sintetizam apenas o conteúdo recuperado.
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
