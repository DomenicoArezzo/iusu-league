"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { PASSWORD_HINT, PASSWORD_MIN, validatePassword } from "@/lib/password";
import { getSupabase } from "@/lib/supabase";
import { Button, Field, Icon } from "@/components/ui";

/** Dopo l'accesso si torna alla pagina da cui si veniva (solo percorsi interni del sito). */
function nextPath(): string {
  if (typeof window === "undefined") return "/";
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { session } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (session) router.replace(nextPath());
  }, [session, router]);

  // Si arriva qui con ?reset=1 dopo aver cambiato la password.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setMsg({ text: "Password aggiornata. Accedi con la nuova password.", error: false });
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (mode === "signup") {
      const problem = validatePassword(password);
      if (problem) {
        setMsg({ text: problem, error: true });
        return;
      }
    }
    setBusy(true);
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
    <main id="contenuto" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-6 inline-flex min-h-tap items-center gap-1 self-start text-sm font-semibold text-neutral-300 hover:text-white">
        <Icon name="chevron" size={16} className="rotate-180" /> Continua senza accedere
      </Link>

      <div className="mb-6 text-center">
        <div className="font-display text-6xl font-extrabold uppercase leading-none tracking-wider">
          IUSU <span className="text-pitch">LEAGUE</span>
        </div>
        <h1 className="mt-3 text-lg font-semibold">{mode === "login" ? "Accedi" : "Crea il tuo account"}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Per guardare partite, risultati e classifiche non serve l&apos;account. Serve per iscriverti alle partite, crearne una o gestire la lega.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-600 bg-ink-800/80 p-6">
        {mode === "signup" && (
          <Field label="Come ti chiamiamo" hint="Questo nome compare nella lista degli iscritti alle partite, visibile a tutti.">
            <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome o soprannome" autoComplete="nickname" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint={mode === "signup" ? PASSWORD_HINT : undefined}>
          <input
            type="password"
            required
            minLength={mode === "signup" ? PASSWORD_MIN : 6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {mode === "login" && (
          <div className="-mt-2 text-right">
            <Link href="/password/dimenticata" className="inline-flex min-h-tap items-center text-sm font-semibold text-pitch hover:underline">
              Password dimenticata?
            </Link>
          </div>
        )}
        {msg && (
          <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-red-300" : "text-pitch"}`}>
            {msg.text}
          </p>
        )}
        <Button variant="primary" className="w-full" disabled={busy} type="submit">
          {busy ? "Un attimo…" : mode === "login" ? "Entra" : "Crea account"}
        </Button>
        <button
          type="button"
          className="min-h-tap w-full text-center text-sm text-neutral-300 hover:text-white"
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
