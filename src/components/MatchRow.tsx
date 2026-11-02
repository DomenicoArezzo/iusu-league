"use client";

import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/derive";
import { STATUS_LABEL, TEAM_NAMES, type Match } from "@/lib/types";
import { Badge, Icon } from "./ui";

/** Riga partita: data a sinistra, luogo/ora al centro, risultato e stato a destra. Tutta la riga è un unico link. */
export default function MatchRow({ m }: { m: Match }) {
  const done = m.status === "conclusa";
  const hasScore = m.score_a != null && m.score_b != null;
  return (
    <Link
      href={`/partite/${m.id}`}
      className="group flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-ink-600 bg-ink-800/80 px-3 py-2.5 transition hover:border-pitch/70 sm:px-4"
    >
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-ink-900 py-1.5 leading-none" aria-hidden="true">
        <span className="text-xs font-semibold uppercase text-neutral-400">{fmtDate(m.played_at, { month: "short" }).replace(".", "")}</span>
        <span className="mt-0.5 font-display text-2xl font-bold">{fmtDate(m.played_at, { day: "numeric" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold capitalize">{fmtDate(m.played_at, { weekday: "long", day: "numeric", month: "long" })}</div>
        <div className="truncate text-sm text-neutral-400">ore {fmtTime(m.played_at)} · {m.location}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {hasScore && (
          <span
            aria-label={`${TEAM_NAMES.A} ${m.score_a}, ${TEAM_NAMES.B} ${m.score_b}`}
            className={`whitespace-nowrap font-display text-3xl font-bold leading-none ${done ? "text-white" : "text-neutral-400"}`}
          >
            {m.score_a}–{m.score_b}
          </span>
        )}
        <Badge tone={done ? "green" : m.status === "annullata" ? "red" : "gold"}>{STATUS_LABEL[m.status]}</Badge>
      </div>
      <Icon name="chevron" size={18} className="text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-pitch" />
    </Link>
  );
}
