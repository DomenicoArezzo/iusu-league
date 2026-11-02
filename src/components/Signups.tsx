"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { getSupabase } from "@/lib/supabase";
import { SIGNUP_STATE_LABEL, capacityOf, seatsLeft, signupErrorMessage, signupState, type SignupState } from "@/lib/signups";
import type { Match } from "@/lib/types";
import { Badge, Button, Card, Icon, LinkButton, SeatsBar, SectionTitle } from "./ui";

const TONE = { aperta: "green", completa: "gold", annullata: "red", chiusa: "gray" } as const;

/** Etichetta dello stato delle iscrizioni (Aperta, Completa, Annullata, Iscrizioni chiuse). */
export function SignupBadge({ state }: { state: SignupState }) {
  return <Badge tone={TONE[state]}>{SIGNUP_STATE_LABEL[state]}</Badge>;
}

export function seatsText(taken: number, capacity: number, state: SignupState): string {
  if (state === "annullata") return "partita annullata";
  const left = Math.max(0, capacity - taken);
  if (left === 0) return "partita completa";
  return `${left} ${left === 1 ? "posto libero" : "posti liberi"}`;
}

/** Iscrizione e ritiro. Tutti i controlli veri (limite di 10, doppioni, stato) sono nel database: qui si mostra solo l'esito. */
export default function Signups({ match }: { match: Match }) {
  const { session, signupsByMatch, refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () => [...(signupsByMatch.get(match.id) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [signupsByMatch, match.id],
  );
  const taken = list.length;
  const capacity = capacityOf(match);
  const state = signupState(match, taken);
  const mine = !!session && list.some((s) => s.user_id === session.user.id);
  const left = seatsLeft(match, taken);
  const loginHref = `/login?next=${encodeURIComponent(`/partite/${match.id}`)}`;

  async function act(fn: "join_match" | "leave_match") {
    if (fn === "leave_match" && !window.confirm("Vuoi ritirarti da questa partita? Il tuo posto verrà liberato.")) return;
    setBusy(true);
    const { error } = await getSupabase().rpc(fn, { p_match_id: match.id });
    if (error) toast(signupErrorMessage(error.message), "error");
    else toast(fn === "join_match" ? "Sei iscritto alla partita" : "Iscrizione annullata, posto liberato");
    // Si ricarica anche dopo un errore: così si vede lo stato reale (per esempio la partita nel frattempo è diventata completa).
    await refresh();
    setBusy(false);
  }

  return (
    <Card>
      <SectionTitle right={<SignupBadge state={state} />}>Iscrizioni</SectionTitle>

      <div aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-5xl font-extrabold leading-none text-pitch">
            {taken}
            <span className="text-neutral-400">/{capacity}</span>
          </span>
          <span className="text-sm text-neutral-300">{seatsText(taken, capacity, state)}</span>
        </div>
        <div className="mt-3">
          <SeatsBar taken={taken} capacity={capacity} full={left === 0} label="Iscritti alla partita" />
        </div>
      </div>

      <div className="mt-4">
        {state === "annullata" && <p className="text-sm text-neutral-300">Questa partita è stata annullata: le iscrizioni sono chiuse.</p>}
        {state === "chiusa" && <p className="text-sm text-neutral-300">Le iscrizioni a questa partita sono chiuse.</p>}

        {(state === "aperta" || state === "completa") && (
          <>
            {mine && (
              <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-pitch">
                <Icon name="check" size={18} /> Sei iscritto a questa partita
              </p>
            )}
            {!session ? (
              <div className="space-y-2">
                {state === "aperta" ? (
                  <LinkButton href={loginHref} variant="primary" className="w-full sm:w-auto">Accedi per iscriverti</LinkButton>
                ) : (
                  <p className="rounded-lg border border-control p-3 text-sm text-neutral-300">
                    La partita è completa. Se qualcuno si ritira si libera un posto e lo vedi qui.
                  </p>
                )}
                <p className="text-sm text-neutral-400">
                  Gli iscritti li vedono tutti. Per iscriverti o ritirarti serve un account.
                </p>
              </div>
            ) : mine ? (
              <Button variant="danger" className="w-full sm:w-auto" disabled={busy} onClick={() => act("leave_match")}>
                {busy ? "Un attimo…" : "Ritirati dalla partita"}
              </Button>
            ) : state === "aperta" ? (
              <Button variant="primary" className="w-full sm:w-auto" disabled={busy} onClick={() => act("join_match")}>
                {busy ? "Un attimo…" : "Iscriviti alla partita"}
              </Button>
            ) : (
              <p className="rounded-lg border border-control p-3 text-sm text-neutral-300">
                La partita è completa. Se qualcuno si ritira si libera un posto e compare qui subito.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-5 border-t border-ink-600 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-300">Giocatori iscritti ({taken})</h3>
        {taken === 0 ? (
          <p className="text-sm text-neutral-400">Nessuno si è ancora iscritto.</p>
        ) : (
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {list.map((s, i) => (
              <li key={s.id} className="flex min-h-9 items-center gap-2 rounded-lg bg-ink-900 px-3 py-1 text-sm">
                <span className="w-5 shrink-0 text-right font-display text-base text-neutral-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{s.display_name}</span>
                {session?.user.id === s.user_id && <Badge tone="green">Tu</Badge>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
