"use client";

import Link from "next/link";
import { useApp } from "@/lib/app";
import { fmtDate, fmtTime } from "@/lib/derive";
import { capacityOf, matchTitle, signupState } from "@/lib/signups";
import { STATUS_LABEL, TEAM_NAMES, type Match } from "@/lib/types";
import { SignupBadge } from "./Signups";
import { Badge, Icon, SeatsBar } from "./ui";

/**
 * Scheda partita: data a sinistra, titolo e orario al centro, a destra posti (7/10) e stato.
 * Per le partite da giocare c'è anche la barra delle iscrizioni; per le altre il risultato.
 * Tutta la riga è un unico link.
 */
export default function MatchRow({ m }: { m: Match }) {
  const { signupsByMatch } = useApp();
  const done = m.status === "conclusa";
  const hasScore = m.score_a != null && m.score_b != null;
  const taken = signupsByMatch.get(m.id)?.length ?? 0;
  const capacity = capacityOf(m);
  const state = signupState(m, taken);
  const showSeats = m.status === "programmata";

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
        <div className="truncate font-semibold">{matchTitle(m)}</div>
        <div className="truncate text-sm text-neutral-400">
          <span className="capitalize">{fmtDate(m.played_at, { weekday: "long", day: "numeric", month: "long" })}</span> · ore {fmtTime(m.played_at)}
        </div>
        {showSeats && (
          <div className="mt-1.5">
            <SeatsBar taken={taken} capacity={capacity} full={taken >= capacity} label="Iscritti" />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {showSeats ? (
          <>
            <span aria-hidden="true" className="whitespace-nowrap font-display text-3xl font-bold leading-none">
              {taken}
              <span className="text-neutral-400">/{capacity}</span>
            </span>
            <span className="sr-only">{taken} iscritti su {capacity}</span>
            <SignupBadge state={state} />
          </>
        ) : (
          <>
            {hasScore && (
              <span
                aria-label={`${TEAM_NAMES.A} ${m.score_a}, ${TEAM_NAMES.B} ${m.score_b}`}
                className={`whitespace-nowrap font-display text-3xl font-bold leading-none ${done ? "text-white" : "text-neutral-400"}`}
              >
                {m.score_a}–{m.score_b}
              </span>
            )}
            <Badge tone={done ? "green" : m.status === "annullata" ? "red" : "gold"}>{STATUS_LABEL[m.status]}</Badge>
          </>
        )}
      </div>
      <Icon name="chevron" size={18} className="text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-pitch" />
    </Link>
  );
}
