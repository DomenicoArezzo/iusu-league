"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./ui";

/** Cornice delle pagine di accesso e recupero password: stessa grafica del login, a una colonna, comoda anche da telefono. */
export default function AuthFrame({
  title, intro, children, back = { href: "/login", label: "Torna al login" },
}: { title: string; intro?: ReactNode; children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <main id="contenuto" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href={back.href} className="mb-6 inline-flex min-h-tap items-center gap-1 self-start text-sm font-semibold text-neutral-300 hover:text-white">
        <Icon name="chevron" size={16} className="rotate-180" /> {back.label}
      </Link>

      <div className="mb-6 text-center">
        <div className="font-display text-6xl font-extrabold uppercase leading-none tracking-wider">
          IUSU <span className="text-pitch">LEAGUE</span>
        </div>
        <h1 className="mt-3 text-lg font-semibold">{title}</h1>
        {intro && <p className="mt-1 text-sm text-neutral-400">{intro}</p>}
      </div>

      <div className="rounded-2xl border border-ink-600 bg-ink-800/80 p-6">{children}</div>
    </main>
  );
}
