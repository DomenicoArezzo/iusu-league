"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { shareMessage, whatsappUrl } from "@/lib/signups";
import type { Match } from "@/lib/types";
import { Icon, buttonClass } from "./ui";

/**
 * "Condividi su WhatsApp": apre WhatsApp (app sul telefono, WhatsApp Web o app sul computer) con il messaggio già scritto.
 * Il messaggio si può modificare liberamente nella chat prima di inviarlo.
 */
export default function ShareWhatsApp({ match, className = "" }: { match: Match; className?: string }) {
  const { signupsByMatch } = useApp();
  const taken = signupsByMatch.get(match.id)?.length ?? 0;
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const text = shareMessage(match, taken, `${origin}/partite/${match.id}`);
  return (
    <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", false, className)}>
      <Icon name="chat" size={18} />
      Condividi su WhatsApp
      <span className="sr-only"> (si apre WhatsApp)</span>
    </a>
  );
}
