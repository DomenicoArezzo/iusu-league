"use client";

import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/derive";
import { STATUS_LABEL, type Match } from "@/lib/types";
import { Badge } from "./ui";

export default function MatchRow({ m }: { m: Match }) {
  const done = m.status === "conclusa";
  return (
    <Link href={`/partite/${m.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800/80 px-4 py-3 transition hover:border-pitch/60">
      <div>
        <div className="font-semibold capitalize">{fmtDate(m.played_at, { weekday: "long", day: "numeric", month: "long" })}</div>
        <div className="text-sm text-neutral-400">{fmtTime(m.played_at)} · {m.location}</div>
      </div>
      <div className="flex items-center gap-3">
        {m.score_a != null && m.score_b != null && (
          <span className={`whitespace-nowrap font-display text-3xl font-bold ${done ? "text-white" : "text-neutral-500"}`}>{m.score_a}–{m.score_b}</span>
        )}
        <Badge tone={done ? "green" : m.status === "annullata" ? "red" : "gold"}>{STATUS_LABEL[m.status]}</Badge>
      </div>
    </Link>
  );
}

