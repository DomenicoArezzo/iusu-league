import { describe, expect, it } from "vitest";
import {
  capacityOf, matchTitle, seatsLeft, shareMessage, signupErrorMessage, signupState, validateNewMatch, whatsappUrl,
} from "./signups";

const NOW = new Date("2026-11-02T10:00:00Z").getTime();
const FUTURE = "2026-11-04T20:00:00Z";
const PAST = "2026-11-01T20:00:00Z";

const m = (over: Partial<{ status: string; played_at: string; capacity: number | null }> = {}) =>
  ({ status: "programmata", played_at: FUTURE, capacity: 10, ...over }) as Parameters<typeof signupState>[0];

describe("signupState", () => {
  it("è aperta finché ci sono posti", () => {
    expect(signupState(m(), 0, NOW)).toBe("aperta");
    expect(signupState(m(), 9, NOW)).toBe("aperta");
  });

  it("diventa completa al decimo iscritto e si riapre quando uno si ritira", () => {
    expect(signupState(m(), 10, NOW)).toBe("completa");
    expect(signupState(m(), 9, NOW)).toBe("aperta");
  });

  it("annullata vince su tutto", () => {
    expect(signupState(m({ status: "annullata" }), 10, NOW)).toBe("annullata");
    expect(signupState(m({ status: "annullata" }), 0, NOW)).toBe("annullata");
  });

  it("è chiusa se la partita è già iniziata o non è più da giocare", () => {
    expect(signupState(m({ played_at: PAST }), 3, NOW)).toBe("chiusa");
    expect(signupState(m({ status: "conclusa" }), 3, NOW)).toBe("chiusa");
    expect(signupState(m({ status: "in_corso" }), 3, NOW)).toBe("chiusa");
  });

  it("usa 10 posti se la capienza manca (partite vecchie)", () => {
    expect(capacityOf({ capacity: null })).toBe(10);
    expect(capacityOf({})).toBe(10);
    expect(signupState(m({ capacity: null }), 10, NOW)).toBe("completa");
  });
});

describe("seatsLeft", () => {
  it("non scende mai sotto zero", () => {
    expect(seatsLeft({ capacity: 10 }, 7)).toBe(3);
    expect(seatsLeft({ capacity: 10 }, 12)).toBe(0);
  });
});

describe("validateNewMatch", () => {
  const base = { date: "2026-11-05", time: "21:00", court: "Iusu" as const, customCourt: "", info: "" };

  it("accetta un campo della lista", () => {
    const r = validateNewMatch(base, NOW);
    expect(r).toMatchObject({ ok: true, location: "Iusu", info: null });
    expect(validateNewMatch({ ...base, court: "Sporting" }, NOW)).toMatchObject({ ok: true, location: "Sporting" });
  });

  it("con 'Altro' usa il nome scritto a mano, ripulito", () => {
    const r = validateNewMatch({ ...base, court: "Altro", customCourt: "  Campo   Comunale  " }, NOW);
    expect(r).toMatchObject({ ok: true, location: "Campo Comunale" });
  });

  it("con 'Altro' pretende il nome del campo", () => {
    expect(validateNewMatch({ ...base, court: "Altro", customCourt: "   " }, NOW)).toMatchObject({ ok: false, error: "Scrivi il nome del campo." });
  });

  it("rifiuta date passate, vuote o nomi troppo lunghi", () => {
    expect(validateNewMatch({ ...base, date: "2026-11-01" }, NOW).ok).toBe(false);
    expect(validateNewMatch({ ...base, date: "" }, NOW).ok).toBe(false);
    expect(validateNewMatch({ ...base, court: "Altro", customCourt: "x".repeat(61) }, NOW).ok).toBe(false);
    expect(validateNewMatch({ ...base, info: "x".repeat(501) }, NOW).ok).toBe(false);
  });

  it("conserva le informazioni aggiuntive", () => {
    expect(validateNewMatch({ ...base, info: "  Portare le pettorine " }, NOW)).toMatchObject({ ok: true, info: "Portare le pettorine" });
  });
});

describe("shareMessage", () => {
  const match = { location: "Iusu", played_at: FUTURE, status: "programmata" as const, capacity: 10, info: null };
  const opts = { timeZone: "Europe/Rome", now: NOW };

  it("contiene nome, data, orario, campo, iscritti, posti liberi e link", () => {
    const text = shareMessage(match, 7, "https://iusu.example/partite/abc", opts);
    expect(text).toContain("Partita a Iusu");
    expect(text).toContain("mercoledì 4 novembre");
    expect(text).toContain("21:00");
    expect(text).toContain("📍 Iusu");
    expect(text).toContain("7/10 iscritti · 3 posti liberi");
    expect(text).toContain("https://iusu.example/partite/abc");
  });

  it("usa il singolare per l'ultimo posto e segnala la partita completa", () => {
    expect(shareMessage(match, 9, "u", opts)).toContain("1 posto libero");
    expect(shareMessage(match, 10, "u", opts)).toContain("COMPLETA");
  });

  it("mostra il nome del campo personalizzato e le informazioni", () => {
    const text = shareMessage({ ...match, location: "Campo Comunale", info: "Portare le pettorine" }, 2, "u", opts);
    expect(text).toContain("📍 Campo Comunale");
    expect(text).toContain("ℹ️ Portare le pettorine");
  });

  it("dice se è annullata", () => {
    expect(shareMessage({ ...match, status: "annullata" }, 4, "u", opts)).toContain("annullata");
  });
});

describe("whatsappUrl", () => {
  it("codifica il testo, compresi a capo e simboli", () => {
    const url = whatsappUrl("Ciao & ciao\nsecondo rigo");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain("Ciao%20%26%20ciao%0Asecondo%20rigo");
  });
});

describe("matchTitle", () => {
  it("ricava il titolo dal campo", () => {
    expect(matchTitle({ location: "Sporting" })).toBe("Partita a Sporting");
    expect(matchTitle({ location: "  " })).toBe("Partita a Iusu");
  });
});

describe("signupErrorMessage", () => {
  it("traduce i codici del database", () => {
    expect(signupErrorMessage("MATCH_FULL")).toContain("completa");
    expect(signupErrorMessage("ALREADY_JOINED")).toContain("già iscritto");
    expect(signupErrorMessage("NOT_JOINED")).toContain("Non risulti iscritto");
    expect(signupErrorMessage("NOT_AUTHENTICATED")).toContain("Accedi");
  });

  it("spiega quando manca la migrazione e lascia passare gli altri errori", () => {
    expect(signupErrorMessage("Could not find the function public.join_match(p_match_id) in the schema cache")).toContain("aggiornamento del database");
    expect(signupErrorMessage("boom")).toBe("boom");
  });
});
