"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/app";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import { Spinner } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/partite", label: "Partite", icon: "📅" },
  { href: "/giocatori", label: "Giocatori", icon: "👤" },
  { href: "/classifiche", label: "Classifiche", icon: "📊" },
  { href: "/premi", label: "Premi", icon: "🏆" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { loading, session, profile, isAdmin } = useApp();
  const path = usePathname();
  const router = useRouter();
  const isLogin = path === "/login";

  useEffect(() => {
    if (!hasSupabaseEnv || loading) return;
    if (!session && !isLogin) router.replace("/login");
    if (session && isLogin) router.replace("/");
  }, [loading, session, isLogin, router]);

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

  if (isLogin) return <>{children}</>;
  if (loading || !session) return <Spinner />;

  const items = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: "⚙️" }] : NAV;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-ink-600 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display text-2xl font-extrabold uppercase leading-none tracking-wider">
            IUSU <span className="text-pitch">LEAGUE</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active(i.href) ? "bg-pitch text-black" : "text-neutral-300 hover:bg-ink-700 hover:text-white"
                }`}
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="hidden sm:inline">
              {profile?.display_name ?? session.user.email} {isAdmin && <span className="text-gold">· admin</span>}
            </span>
            <button
              className="rounded-md border border-ink-500 px-2 py-1 hover:border-pitch/60 hover:text-white"
              onClick={async () => {
                await getSupabase().auth.signOut();
                router.replace("/login");
              }}
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-ink-600 bg-ink-950/95 backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active(i.href) ? "text-pitch" : "text-neutral-400"}`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
