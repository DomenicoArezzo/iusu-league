"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import TextSize from "./TextSize";
import { Icon, LinkButton, Spinner, type IconName } from "./ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/partite", label: "Partite", icon: "calendar" },
  { href: "/giocatori", label: "Giocatori", icon: "users" },
  { href: "/classifiche", label: "Classifiche", icon: "chart" },
  { href: "/premi", label: "Premi", icon: "trophy" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { loading, session, profile, isAdmin } = useApp();
  const path = usePathname();
  const router = useRouter();

  if (!hasSupabaseEnv) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="font-display text-3xl font-bold text-gold">Configurazione mancante</h1>
        <p className="mt-3 text-neutral-300">
          Imposta <code className="text-pitch">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="text-pitch">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (vedi README), poi riavvia l&apos;app.
        </p>
      </main>
    );
  }

  // La pagina di accesso ha un layout suo: il sito resta consultabile senza account.
  if (path === "/login") return <>{children}</>;

  const items = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: "settings" as IconName }] : NAV;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const loginHref = path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenuto" className="skip-link">Vai al contenuto</a>

      <header className="sticky top-0 z-40 border-b border-ink-600 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
          <Link href="/" className="inline-flex min-h-tap items-center font-display text-xl font-extrabold uppercase leading-none tracking-wider sm:text-2xl" aria-label="IUSU League, vai alla home">
            IUSU <span className="ml-1.5 text-pitch">LEAGUE</span>
          </Link>

          <nav aria-label="Principale" className="hidden gap-1 lg:flex">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`inline-flex min-h-tap items-center rounded-lg px-3 text-sm font-semibold transition ${
                  active(i.href) ? "bg-pitch text-black" : "text-neutral-300 hover:bg-ink-700 hover:text-white"
                }`}
              >
                {i.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="sm:hidden"><TextSize compact /></div>
            <div className="hidden sm:block"><TextSize /></div>
            {session ? (
              <>
                <span className="hidden max-w-[10rem] truncate text-xs text-neutral-400 lg:inline">
                  {profile?.display_name ?? session.user.email}
                  {isAdmin && <span className="text-gold"> · admin</span>}
                </span>
                <button
                  type="button"
                  aria-label="Esci dall'account"
                  title="Esci"
                  className="inline-flex min-h-tap items-center gap-1.5 rounded-lg border border-control px-3 text-sm font-semibold text-white hover:border-pitch"
                  onClick={async () => {
                    await getSupabase().auth.signOut();
                    router.refresh();
                  }}
                >
                  <Icon name="logout" size={18} />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </>
            ) : (
              <LinkButton href={loginHref} variant="primary" aria-label="Accedi" title="Accedi">
                <Icon name="login" size={18} />
                <span className="hidden sm:inline">Accedi</span>
              </LinkButton>
            )}
          </div>
        </div>
      </header>

      <main id="contenuto" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 outline-none lg:pb-10">
        {loading ? <Spinner /> : children}
      </main>

      <footer className="mx-auto hidden w-full max-w-6xl px-4 pb-8 text-xs text-neutral-500 lg:block">
        IUSU League · risultati, classifiche e statistiche della lega. Contano solo le partite confermate.
      </footer>

      <nav
        aria-label="Principale (mobile)"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-ink-600 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold ${active(i.href) ? "text-pitch" : "text-neutral-400"}`}
          >
            <Icon name={i.icon} size={22} />
            <span className="max-w-full truncate">{i.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
