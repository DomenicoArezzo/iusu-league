"use client";

import { useMemo } from "react";
import { useApp } from "./app";
import { computeStats, confirmedMatches, filterMatches, type Period } from "./stats";

/** Statistiche calcolate sulle sole partite confermate, per il periodo scelto. */
export function useStats(period: Period = { kind: "all" }) {
  const { players, matches, matchPlayers, events, settings } = useApp();
  const confirmed = useMemo(() => confirmedMatches(matches), [matches]);
  const periodKey = JSON.stringify(period);
  const filtered = useMemo(() => filterMatches(confirmed, period), [confirmed, periodKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(
    () => computeStats({ players, matchPlayers, events }, filtered, settings.rating),
    [players, matchPlayers, events, filtered, settings.rating],
  );
  return { confirmed, matches: filtered, stats };
}

export function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("it-IT", opts ?? { weekday: "short", day: "numeric", month: "short" });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/** Valore per <input type="datetime-local"> in ora locale. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
