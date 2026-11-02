"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import AuthFrame from "@/components/AuthFrame";
import { Button, Field, Icon } from "@/components/ui";

const COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // Tra una richiesta e l'altra passa un minuto (lo chiede anche Supabase): il conto alla rovescia evita tentativi a vuoto.
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Scrivi un indirizzo email valido.");
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/password/nuova`,
    });
    setBusy(false);
    if (err) {
      const limited = err.status === 429 || /rate limit|security purposes|too many/i.test(err.message);
      setError(
        limited
          ? "Hai chiesto troppe email in poco tempo. Aspetta qualche minuto e riprova."
          : "Non è stato possibile inviare l'email. Riprova tra poco.",
      );
      return;
    }
    // Stessa risposta anche se l'indirizzo non è registrato: così non si può scoprire chi ha un account.
    setSentTo(address);
    setWait(COOLDOWN_SECONDS);
  }

  return (
    <AuthFrame
      title="Password dimenticata"
      intro="Scrivi l'email con cui ti sei registrato: ti mandiamo un link per scegliere una nuova password."
    >
      {sentTo && (
        <div role="status" className="mb-4 rounded-lg border border-pitch/40 bg-pitch/10 p-3 text-sm">
          <p className="inline-flex items-center gap-1.5 font-semibold text-pitch">
            <Icon name="mail" size={18} /> Controlla la posta
          </p>
          <p className="mt-1 text-neutral-200">
            Se <span className="font-semibold break-all">{sentTo}</span> è registrato, ti abbiamo mandato un&apos;email con il link per reimpostare la password.
            Il link vale per un tempo limitato. Se non la vedi, guarda anche nello spam.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "errore-email" : undefined}
          />
        </Field>
        {error && <p id="errore-email" role="alert" className="text-sm text-red-300">{error}</p>}
        <Button variant="primary" className="w-full" type="submit" disabled={busy || wait > 0}>
          {busy ? "Un attimo…" : wait > 0 ? `Puoi reinviarla tra ${wait} s` : sentTo ? "Invia di nuovo" : "Invia il link"}
        </Button>
      </form>
    </AuthFrame>
  );
}
