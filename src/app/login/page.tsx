"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button, Field } from "@/components/ui";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = getSupabase();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: error.message === "Invalid login credentials" ? "Email o password errate." : error.message, error: true });
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name || email.split("@")[0] } } });
      if (error) setMsg({ text: error.message, error: true });
      else if (!data.session) setMsg({ text: "Registrazione fatta. Controlla la mail per confermare l'account, poi accedi.", error: false });
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="font-display text-6xl font-extrabold uppercase leading-none tracking-wider">
          IUSU <span className="text-pitch">LEAGUE</span>
        </div>
        <p className="mt-2 text-sm text-neutral-400">Il calcetto di Iusu, a livello di campionato.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-600 bg-ink-800/80 p-6">
        {mode === "signup" && (
          <Field label="Come ti chiamiamo">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome o soprannome" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "Almeno 6 caratteri" : undefined}>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {msg && <p className={`text-sm ${msg.error ? "text-red-300" : "text-pitch"}`}>{msg.text}</p>}
        <Button variant="primary" className="w-full" disabled={busy} onClick={() => undefined} type="submit">
          {busy ? "Un attimo…" : mode === "login" ? "Entra" : "Crea account"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-neutral-400 hover:text-white"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMsg(null);
          }}
        >
          {mode === "login" ? "Prima volta? Crea il tuo account" : "Hai già un account? Accedi"}
        </button>
      </form>
    </main>
  );
}
