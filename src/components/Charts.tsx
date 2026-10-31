"use client";

/** Andamento dei voti: linea con punti, scala fissa 1-10. */
export function RatingChart({ points, height = 120 }: { points: { label: string; value: number }[]; height?: number }) {
  if (points.length === 0) return <div className="py-6 text-center text-sm text-neutral-500">Ancora nessuna partita.</div>;
  const w = 600;
  const pad = 22;
  const x = (i: number) => (points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1));
  const y = (v: number) => height - pad - ((v - 1) / 9) * (height - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Andamento dei voti partita per partita">
      {[2, 4, 6, 8, 10].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#262626" strokeDasharray={g === 6 ? "0" : "3 4"} />
          <text x={4} y={y(g) + 3} fontSize="9" fill="#737373">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#22e55e" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="#070707" stroke={p.value >= 7 ? "#f5c542" : "#22e55e"} strokeWidth="2">
          <title>{`${p.label}: ${p.value.toFixed(1)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-neutral-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-600">
        <div className="h-full rounded-full bg-gradient-to-r from-pitch-dark to-pitch" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="w-6 text-right font-display text-lg font-bold">{value}</span>
    </div>
  );
}
