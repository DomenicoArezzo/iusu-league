"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Player } from "@/lib/types";
import { playerName } from "@/lib/types";

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

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-neutral-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "gold"; small?: boolean };

export function Button({ variant = "ghost", small, className = "", ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-40 disabled:pointer-events-none";
  const size = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const look = {
    primary: "bg-pitch text-black hover:bg-pitch-glow",
    gold: "bg-gold text-black hover:brightness-110",
    ghost: "border border-ink-500 bg-ink-700 text-white hover:border-pitch/60",
    danger: "border border-red-500/40 bg-red-950/60 text-red-200 hover:bg-red-900/70",
  }[variant];
  return <button type="button" className={`${base} ${size} ${look} ${className}`} {...rest} />;
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "gold" | "red" | "blue" }) {
  const t = {
    gray: "bg-ink-600 text-neutral-300",
    green: "bg-pitch/15 text-pitch",
    gold: "bg-gold/15 text-gold",
    red: "bg-red-500/15 text-red-300",
    blue: "bg-sky-500/15 text-sky-300",
  }[tone];
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${t}`}>{children}</span>;
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

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-ink-500 bg-ink-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
          <button onClick={onClose} aria-label="Chiudi" className="rounded-md px-2 py-1 text-neutral-400 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-pitch text-black" : "text-neutral-300 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ player, size = 40 }: { player: Pick<Player, "first_name" | "last_name" | "nickname" | "avatar_url">; size?: number }) {
  const initials = (player.first_name[0] ?? "") + (player.last_name[0] ?? player.first_name[1] ?? "");
  if (player.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatar_url} alt={playerName(player)} width={size} height={size} className="rounded-full border border-ink-500 object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-pitch/40 bg-gradient-to-br from-ink-600 to-ink-800 font-display font-bold uppercase text-pitch"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  );
}

export function Spinner({ label = "Caricamento…" }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-neutral-500">{label}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ink-500 p-6 text-center text-sm text-neutral-400">{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "green" | "gold" }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone === "gold" ? "text-gold" : tone === "green" ? "text-pitch" : "text-white"}`}>{value}</div>
    </div>
  );
}

export const MEDAL = ["🥇", "🥈", "🥉"];
