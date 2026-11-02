"use client";

import Link from "next/link";
import type { Player } from "@/lib/types";
import { ROLE_LABEL, ROLE_SHORT, playerName } from "@/lib/types";
import { cardStats, computeOverall } from "@/lib/overall";
import { Avatar } from "./ui";

/** Tier colore in base all'overall, come nelle carte Ultimate Team. */
export function tierOf(ovr: number): { name: string; bg: string; text: string; ring: string } {
  if (ovr >= 80) return { name: "gold", bg: "from-[#f8e08e] via-[#e0b43a] to-[#8a6a14]", text: "text-[#2b1f00]", ring: "ring-[#f5c542]/60" };
  if (ovr >= 65) return { name: "silver", bg: "from-[#f0f0f0] via-[#b9bec6] to-[#6f7681]", text: "text-[#14181d]", ring: "ring-white/40" };
  return { name: "bronze", bg: "from-[#e2a87a] via-[#b0713f] to-[#6b3f1d]", text: "text-[#26120a]", ring: "ring-[#b0713f]/60" };
}

export default function PlayerCard({ player, href, size = "md" }: { player: Player; href?: string; size?: "sm" | "md" | "lg" }) {
  const ovr = computeOverall(player);
  const t = tierOf(ovr);
  // md occupa la colonna (max 11rem): su telefono stretto le carte non sbordano più dalla griglia a 2 colonne.
  const dim = { sm: "w-36", md: "w-full max-w-[11rem]", lg: "w-60 max-w-full" }[size];
  const body = (
    <div className={`${dim} select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)] transition hover:-translate-y-1`}>
      <div className={`fut-card bg-gradient-to-b ${t.bg} ${t.text} aspect-[3/4.1] px-3 pb-5 pt-5`}>
        <div className="flex h-full flex-col items-center">
          <div className="flex w-full items-start justify-between pl-3">
            <div className="leading-none">
              <div className={`font-display font-extrabold ${size === "lg" ? "text-5xl" : "text-4xl"}`}>{ovr}</div>
              <div className="font-display text-sm font-bold">{ROLE_SHORT[player.preferred_role]}</div>
            </div>
          </div>
          <div className="-mt-3">
            <Avatar player={player} size={size === "lg" ? 96 : 68} />
          </div>
          <div className="mt-1 w-full truncate text-center font-display text-lg font-extrabold uppercase leading-tight">{playerName(player)}</div>
          <div className="mt-1 h-px w-3/4 bg-current opacity-30" />
          <div className="mt-1.5 grid w-full grid-cols-2 gap-x-3 px-3 text-xs font-bold">
            {cardStats(player).map((s) => (
              <div key={s.label} className="flex justify-between font-display text-sm">
                <span>{s.value}</span>
                <span className="opacity-70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  // Per chi usa uno screen reader la carta (valori e sigle) è decorativa: leggiamo una frase sola.
  const spoken = `${playerName(player)}, ${ROLE_LABEL[player.preferred_role]}, valutazione ${ovr}`;
  return href ? (
    <Link href={href} className={size === "md" ? "block w-full max-w-[11rem]" : "block max-w-full"}>
      <span className="sr-only">{spoken}</span>
      <div aria-hidden="true">{body}</div>
    </Link>
  ) : (
    body
  );
}
