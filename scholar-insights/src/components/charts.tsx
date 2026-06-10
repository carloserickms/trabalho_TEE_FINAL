export function ProductionBars({
  data,
  height = 80,
}: {
  data: { year: number; count: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-muted-foreground"
        style={{ height }}
      >
        Sem dados
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="overflow-x-auto" style={{ height }}>
      <div className="flex items-end gap-1.5 min-w-max" style={{ height: "100%" }}>
        {data.map((d) => (
          <div key={d.year} className="flex w-6 flex-col items-center gap-1">
            <div
              className="w-full rounded-[2px] bg-primary/85 shrink-0"
              style={{ height: `${(d.count / max) * (height - 18)}px` }}
              title={`${d.year}: ${d.count}`}
            />
            <span className="font-mono text-[9.5px] text-muted-foreground whitespace-nowrap">
              '{String(d.year).slice(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const defaultAreas = [
  { name: "Ciência da Computação", count: 4821, share: 0.22 },
  { name: "Ciência da Informação", count: 2104, share: 0.1 },
  { name: "Educação", count: 3917, share: 0.18 },
  { name: "Engenharias", count: 2890, share: 0.13 },
  { name: "Ciências Sociais Aplicadas", count: 2210, share: 0.1 },
  { name: "Ciências da Saúde", count: 3415, share: 0.16 },
  { name: "Ciências Humanas", count: 2540, share: 0.11 },
];

export function AreaShareBars({ data }: { data?: { name: string; count: number }[] }) {
  const items = data && data.length > 0 ? data : defaultAreas;
  const max = Math.max(...items.map((a) => a.count));
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div
          key={a.name}
          className="grid grid-cols-[180px_1fr_60px] items-center gap-3 text-[12.5px]"
        >
          <div className="truncate text-foreground/85">{a.name}</div>
          <div className="h-2 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-primary/80"
              style={{ width: `${(a.count / max) * 100}%` }}
            />
          </div>
          <div className="text-right font-mono text-[11.5px] text-muted-foreground">
            {a.count.toLocaleString("pt-BR")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollaborationGraph() {
  const nodes = [
    { id: "ana", label: "A. Cardoso", x: 50, y: 50, r: 18, primary: true },
    { id: "marcelo", label: "M. Tavares", x: 18, y: 28, r: 12 },
    { id: "rafaela", label: "R. Nunes", x: 78, y: 22, r: 10 },
    { id: "eduardo", label: "E. Pires", x: 82, y: 70, r: 11 },
    { id: "sofia", label: "S. Beltrão", x: 22, y: 78, r: 10 },
    { id: "joana", label: "J. Ribeiro", x: 50, y: 88, r: 8 },
  ];
  const links = [
    ["ana", "marcelo"],
    ["ana", "rafaela"],
    ["ana", "eduardo"],
    ["ana", "sofia"],
    ["marcelo", "joana"],
    ["sofia", "eduardo"],
  ];
  const find = (id: string) => nodes.find((n) => n.id === id)!;
  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-md border bg-surface bg-grid">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {links.map(([a, b], i) => {
          const A = find(a),
            B = find(b);
          return (
            <line
              key={i}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="currentColor"
              strokeWidth="0.18"
              className="text-foreground/30"
            />
          );
        })}
      </svg>
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          <div
            className={`flex items-center justify-center rounded-full ${n.primary ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-foreground border"}`}
            style={{ width: n.r * 2, height: n.r * 2 }}
          >
            <span className="font-serif text-[10px]">
              {n.label.split(" ")[0][0]}
              {n.label.split(" ")[1]?.[0]}
            </span>
          </div>
          <div className="mt-1 whitespace-nowrap text-center font-mono text-[10px] text-muted-foreground">
            {n.label}
          </div>
        </div>
      ))}
    </div>
  );
}
