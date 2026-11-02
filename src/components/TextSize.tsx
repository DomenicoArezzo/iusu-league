"use client";

import { useEffect, useState } from "react";

export type TextSizeKey = "md" | "lg" | "xl";
export const TEXT_SIZE_STORAGE_KEY = "iusu-text-size";

// Il nome accessibile inizia con il testo visibile (A, A+, A++): WCAG 2.5.3 "label in name".
const OPTIONS: { value: TextSizeKey; label: string; name: string }[] = [
  { value: "md", label: "A", name: "A, testo normale" },
  { value: "lg", label: "A+", name: "A+, testo grande" },
  { value: "xl", label: "A++", name: "A++, testo molto grande" },
];

function apply(size: TextSizeKey) {
  document.documentElement.dataset.textSize = size;
}

/**
 * Scelta della dimensione del testo, ricordata sul dispositivo (WCAG 1.4.4).
 * `compact`: un solo pulsante che passa da una misura alla successiva (per l'intestazione su telefono).
 */
export default function TextSize({ compact = false }: { compact?: boolean }) {
  const [size, setSize] = useState<TextSizeKey>("md");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
      if (saved === "md" || saved === "lg" || saved === "xl") setSize(saved);
    } catch {
      /* archiviazione non disponibile: si resta sul valore predefinito */
    }
  }, []);

  function choose(v: TextSizeKey) {
    setSize(v);
    apply(v);
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, v);
    } catch {
      /* ignorato */
    }
  }

  if (compact) {
    const order: TextSizeKey[] = ["md", "lg", "xl"];
    const next = order[(order.indexOf(size) + 1) % order.length];
    const current = OPTIONS.find((o) => o.value === size)!;
    return (
      <button
        type="button"
        onClick={() => choose(next)}
        aria-label={`Aa, dimensione del testo: ${current.name.split(", ")[1]}. Tocca per cambiarla`}
        title="Dimensione del testo"
        className="inline-flex min-h-tap min-w-tap items-center justify-center gap-0.5 rounded-lg border border-control bg-ink-900 px-2 text-sm font-bold text-white hover:border-pitch"
      >
        Aa{size !== "md" && <span className="text-pitch" aria-hidden="true">{size === "lg" ? "+" : "++"}</span>}
      </button>
    );
  }

  return (
    <div role="group" aria-label="Dimensione del testo" className="inline-flex rounded-lg border border-control bg-ink-900 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={size === o.value}
          aria-label={o.name}
          title={o.name.split(", ")[1]}
          onClick={() => choose(o.value)}
          className={`min-h-10 min-w-10 rounded-md px-1.5 text-xs font-bold ${size === o.value ? "bg-pitch text-black" : "text-neutral-300 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
