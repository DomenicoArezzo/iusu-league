"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, hasSupabaseEnv } from "./supabase";
import { mergeSettings, DEFAULT_SETTINGS, type Settings } from "./settings";
import type {
  Availability, ManualAward, MarketAdjustment, Match, MatchEvent, MatchPlayer, Player, Profile, Season,
} from "./types";

export interface AppData {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  players: Player[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  events: MatchEvent[];
  availability: Availability[];
  seasons: Season[];
  adjustments: MarketAdjustment[];
  manualAwards: ManualAward[];
  profiles: Profile[];
  settings: Settings;
  activeSeason: Season | null;
  refresh: () => Promise<void>;
  toast: (msg: string, kind?: "ok" | "error") => void;
  /** Esegue una scrittura, mostra l'errore se fallisce e ricarica i dati. */
  write: (fn: () => PromiseLike<{ error: { message: string } | null }>, okMsg?: string) => Promise<boolean>;
}

const Ctx = createContext<AppData | null>(null);

export function useApp(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp fuori dal provider");
  return v;
}

interface Toast { id: number; msg: string; kind: "ok" | "error" }

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [data, setData] = useState({
    profile: null as Profile | null,
    players: [] as Player[],
    matches: [] as Match[],
    matchPlayers: [] as MatchPlayer[],
    events: [] as MatchEvent[],
    availability: [] as Availability[],
    seasons: [] as Season[],
    adjustments: [] as MarketAdjustment[],
    manualAwards: [] as ManualAward[],
    profiles: [] as Profile[],
    settings: DEFAULT_SETTINGS,
  });
  const toastId = useRef(0);

  const toast = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 2500);
  }, []);

  // ---- sessione
  useEffect(() => {
    if (!hasSupabaseEnv) {
      setAuthReady(true);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    sb.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setAuthReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- caricamento dati
  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv) return;
    const sb = getSupabase();
    const q = (t: string) => sb.from(t).select("*");
    // Le tabelle "pubbliche" si leggono anche senza login (vedi supabase/public_read.sql).
    // I profili contengono le email: li leggiamo solo da utenti autenticati.
    const noProfiles = Promise.resolve({ data: [] as unknown[], error: null });
    const [pl, ma, mp, ev, av, se, ad, aw, pr, st] = await Promise.all([
      q("players"), q("matches"), q("match_players"), q("match_events"), q("availability"),
      q("seasons"), q("market_adjustments"), q("manual_awards"), session ? q("profiles") : noProfiles, q("settings"),
    ]);
    const firstError = [pl, ma, mp, ev, av, se, ad, aw, pr, st].find((r) => r.error);
    if (firstError?.error) {
      toast(`Errore di caricamento: ${firstError.error.message}`, "error");
      setLoading(false);
      return;
    }
    const profiles = (pr.data ?? []) as Profile[];
    setData({
      profile: session ? profiles.find((p) => p.id === session.user.id) ?? null : null,
      players: (pl.data ?? []) as Player[],
      matches: (ma.data ?? []) as Match[],
      matchPlayers: (mp.data ?? []) as MatchPlayer[],
      events: (ev.data ?? []) as MatchEvent[],
      availability: (av.data ?? []) as Availability[],
      seasons: ((se.data ?? []) as Season[]).sort((a, b) => b.starts_on.localeCompare(a.starts_on)),
      adjustments: (ad.data ?? []) as MarketAdjustment[],
      manualAwards: (aw.data ?? []) as ManualAward[],
      profiles,
      settings: mergeSettings((st.data ?? []) as { key: string; value: unknown }[]),
    });
    setLoading(false);
  }, [session, toast]);

  // Carica i dati appena la sessione è nota (anche da visitatore) e li ricarica
  // in silenzio quando si entra o si esce, senza far sparire la pagina.
  useEffect(() => {
    if (!authReady) return;
    refresh();
  }, [authReady, session, refresh]);

  // ---- aggiornamenti in tempo reale (con piccola attesa per raggruppare le modifiche)
  useEffect(() => {
    if (!hasSupabaseEnv || !authReady) return;
    const sb = getSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = sb
      .channel("iusu-live")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void sb.removeChannel(channel);
    };
  }, [authReady, refresh]);

  const write = useCallback<AppData["write"]>(
    async (fn, okMsg) => {
      const { error } = await fn();
      if (error) {
        toast(error.message, "error");
        return false;
      }
      if (okMsg) toast(okMsg);
      await refresh();
      return true;
    },
    [refresh, toast],
  );

  const value = useMemo<AppData>(
    () => ({
      loading: loading || !authReady,
      session,
      profile: data.profile,
      isAdmin: data.profile?.role === "admin",
      players: data.players,
      matches: data.matches,
      matchPlayers: data.matchPlayers,
      events: data.events,
      availability: data.availability,
      seasons: data.seasons,
      adjustments: data.adjustments,
      manualAwards: data.manualAwards,
      profiles: data.profiles,
      settings: data.settings,
      activeSeason: data.seasons.find((s) => s.is_active) ?? null,
      refresh,
      toast,
      write,
    }),
    [loading, authReady, session, data, refresh, toast, write],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-lg ${
              t.kind === "error" ? "border-red-500/50 bg-red-950 text-red-100" : "border-pitch/40 bg-ink-800 text-white"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
