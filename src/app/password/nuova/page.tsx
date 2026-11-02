"use client";

import { useEffect, useState } from "react";
import { PASSWORD_HINT, recoveryProblemFromHash, validatePassword } from "@/lib/password";
import { getSupabase } from "@/lib/supabase";
import AuthFrame from "@/components/AuthFrame";
import { Button, Field, Icon, LinkButton } from "@/components/ui";

type View = "checking" | "form" | "expired" | "invalid" | "done";

export default function NewPasswordPage() {
  const [view, setView] = useState<View>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Il link dell'email porta qui con un token nell'indirizzo: Supabase lo legge e apre una sessione di recupero.
  // Se il link è scaduto o già usato, nell'indirizzo c'è invece un errore.
  useEffect(() => {
    const problem = recoveryProblemFromHash(window.location.hash);
    if (problem) {
      setView(problem);
      return;
    }
    const sb = getSupabase();
    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (!cancelled) setView(data.session ? "form" : "invalid");
    });
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setView((v) => (v === "done" ? v : "form"));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = validatePassword(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const sb = getSupabase();
    const { error: err } = await sb.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      if (err.code === "same_password" || /different from the old/i.test(err.message)) {
        setError("La nuova password deve essere diversa da quella precedente.");
      } else if (err.code === "weak_password" || /at least|weak/i.test(err.message)) {
        setError(`La password non rispetta i requisiti di sicurezza. ${PASSWORD_HINT}`);
      } else if (err.status === 401 || err.status === 403 || /session|jwt|expired|not authenticated/i.test(err.message)) {
        setView("expired");
      } else {
        setError("Non è stato possibile aggiornare la password. Riprova.");
      }
      return;
    }
    // Si riparte dal login con la nuova password.
    await sb.auth.signOut();
    setBusy(false);
    setView("done");
  }

  if (view === "checking") {
    return (
      <AuthFrame title="Nuova password">
        <p role="status" className="py-4 text-center text-sm text-neutral-400">Controllo il link…</p>
      </AuthFrame>
    );
  }

  if (view === "expired" || view === "invalid") {
    return (
      <AuthFrame title={view === "expired" ? "Link scaduto" : "Link non valido"}>
        <p role="alert" className="text-sm text-neutral-200">
          {view === "expired"
            ? "Il link per reimpostare la password è scaduto o è già stato usato."
            : "Il link per reimpostare la password non è valido o è scaduto."}{" "}
          Richiedine uno nuovo: ci vuole un minuto.
        </p>
        <LinkButton href="/password/dimenticata" variant="primary" className="mt-4 w-full">Richiedi un nuovo link</LinkButton>
      </AuthFrame>
    );
  }

  if (view === "done") {
    return (
      <AuthFrame title="Password aggiornata">
        <p role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pitch">
          <Icon name="check" size={18} /> Fatto: la tua password è stata cambiata.
        </p>
        <p className="mt-2 text-sm text-neutral-300">Ora puoi accedere con la nuova password.</p>
        <LinkButton href="/login?reset=1" variant="primary" className="mt-4 w-full">Vai al login</LinkButton>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Scegli una nuova password" intro={PASSWORD_HINT}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nuova password">
          <input
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "errore-password" : undefined}
          />
        </Field>
        <Field label="Ripeti la nuova password">
          <input
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "errore-password" : undefined}
          />
        </Field>
        <label className="flex min-h-tap items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostra le password
        </label>
        {error && <p id="errore-password" role="alert" className="text-sm text-red-300">{error}</p>}
        <Button variant="primary" className="w-full" type="submit" disabled={busy}>
          {busy ? "Un attimo…" : "Salva la nuova password"}
        </Button>
      </form>
    </AuthFrame>
  );
}
