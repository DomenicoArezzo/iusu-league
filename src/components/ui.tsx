"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Player } from "@/lib/types";
import { playerName } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Icone (SVG inline: nitide a ogni dimensione, nessun emoji da leggere) */
/* ------------------------------------------------------------------ */

const ICONS = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5v-5.5h4v5.5h4.5V10",
  calendar: "M7 3v3m10-3v3M4 8.5h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0M16.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2A6.5 6.5 0 0 1 21.5 20",
  chart: "M5 20V10m7 10V4m7 16v-7",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4.5v1.5A3.5 3.5 0 0 0 8 11m8-5h3.5v1.5A3.5 3.5 0 0 1 16 11m-4 4v3m-3.5 2h7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  login: "M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4m4 4H4",
  logout: "M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10m6-4 4-4-4-4m4 4H10",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-12.5 3.4 2.5-1.3 4h-4.2l-1.3-4L12 8.5Zm0 0V3.2m3.4 7.8 5-1.6m-6.3 5.6 3.1 4.2m-7.8 0 3.1-4.2M3.6 9.4l5 1.6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  crown: "M4 18h16M5 16 3.5 7.5 9 11l3-6 3 6 5.5-3.5L19 16H5Z",
  star: "m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8L12 3.5Z",
  chevron: "m9 6 6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8.2v.2",
  pin: "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2",
  shield: "M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-2.5Z",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Struttura                                                            */
/* ------------------------------------------------------------------ */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-ink-600 bg-ink-800/80 p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">{children}</h2>
      {right}
    </div>
  );
}

/** Link "Tutte →" a destra del titolo di una sezione. */
export function MoreLink({ href, children = "Vedi tutto" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-tap items-center gap-1 whitespace-nowrap text-sm font-semibold text-pitch hover:underline">
      {children}
      <Icon name="chevron" size={16} />
    </Link>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-neutral-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pulsanti                                                             */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "ghost" | "danger" | "gold";

/** Classi condivise da Button e LinkButton: bersaglio di tocco di almeno 44px (36px per i pulsanti piccoli). */
export function buttonClass(variant: Variant = "ghost", small = false, className = ""): string {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-40 disabled:pointer-events-none";
  const size = small ? "min-h-9 px-3 py-1 text-xs" : "min-h-tap px-4 py-2 text-sm";
  const look = {
    primary: "bg-pitch text-black hover:bg-pitch-glow",
    gold: "bg-gold text-black hover:brightness-110",
    ghost: "border border-control bg-ink-700 text-white hover:border-pitch",
    danger: "border border-red-500/50 bg-red-950/60 text-red-100 hover:bg-red-900/70",
  }[variant];
  return `${base} ${size} ${look} ${className}`;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean };

export function Button({ variant = "ghost", small, className = "", ...rest }: BtnProps) {
  return <button type="button" className={buttonClass(variant, small, className)} {...rest} />;
}

/** Un link che sembra un pulsante (il vecchio <Link><Button/></Link> annidava un pulsante dentro un link). */
export function LinkButton({
  href, variant = "ghost", small, className = "", ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; small?: boolean }) {
  return <Link href={href} className={buttonClass(variant, small, className)} {...rest} />;
}

/* ------------------------------------------------------------------ */
/* Etichette, campi, finestre                                           */
/* ------------------------------------------------------------------ */

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "gold" | "red" | "blue" }) {
  const t = {
    gray: "bg-ink-600 text-neutral-300",
    green: "bg-pitch/15 text-pitch",
    gold: "bg-gold/15 text-gold",
    red: "bg-red-500/15 text-red-300",
    blue: "bg-sky-500/15 text-sky-300",
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${t}`}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Accessibilità: Esc chiude, il focus entra nella finestra, resta al suo interno (Tab) e torna all'elemento di partenza.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-control bg-ink-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id={titleId} className="font-display text-2xl font-bold uppercase">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra"
            className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md text-neutral-400 hover:text-white"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Selettore a pulsanti. Con `label` il gruppo viene annunciato dagli screen reader. */
export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-tap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-pitch text-black" : "text-neutral-300 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Giocatori e dati                                                     */
/* ------------------------------------------------------------------ */

export function Avatar({ player, size = 40 }: { player: Pick<Player, "first_name" | "last_name" | "nickname" | "avatar_url">; size?: number }) {
  const initials = (player.first_name[0] ?? "") + (player.last_name[0] ?? player.first_name[1] ?? "");
  if (player.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatar_url} alt="" loading="lazy" width={size} height={size} className="shrink-0 rounded-full border border-ink-500 object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-pitch/40 bg-gradient-to-br from-ink-600 to-ink-800 font-display font-bold uppercase text-pitch"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  );
}

export function Spinner({ label = "Caricamento…" }: { label?: string }) {
  return <div role="status" className="py-16 text-center text-sm text-neutral-400">{label}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-control p-6 text-center text-sm text-neutral-400">{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "green" | "gold" }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone === "gold" ? "text-gold" : tone === "green" ? "text-pitch" : "text-white"}`}>{value}</div>
    </div>
  );
}

/** Posizione in classifica: medaglia per i primi tre, con testo per gli screen reader. */
export const MEDAL = ["🥇", "🥈", "🥉"];

export function Rank({ pos }: { pos: number }) {
  return (
    <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-neutral-400">
      {pos < 3 ? <span aria-hidden="true">{MEDAL[pos]}</span> : null}
      <span className={pos < 3 ? "sr-only" : ""}>{pos + 1}</span>
    </span>
  );
}
