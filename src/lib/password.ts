export const PASSWORD_MIN = 8;
export const PASSWORD_HINT = `Almeno ${PASSWORD_MIN} caratteri, con almeno una lettera e un numero.`;

/** Requisiti minimi di sicurezza. Restituisce un messaggio chiaro, oppure null se la password va bene. */
export function validatePassword(password: string, confirm?: string): string | null {
  if (password.length < PASSWORD_MIN) return `La password deve avere almeno ${PASSWORD_MIN} caratteri.`;
  if (!/\p{L}/u.test(password)) return "La password deve contenere almeno una lettera.";
  if (!/\p{N}/u.test(password)) return "La password deve contenere almeno un numero.";
  if (confirm !== undefined && password !== confirm) return "Le due password non coincidono.";
  return null;
}

export type RecoveryProblem = "expired" | "invalid";

/**
 * Legge il frammento (#...) che Supabase mette nel link dell'email.
 * Se il link è scaduto o già usato, il frammento contiene un errore invece del token.
 */
export function recoveryProblemFromHash(hash: string): RecoveryProblem | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code") ?? "";
  const error = params.get("error");
  if (!error && !code) return null;
  return code === "otp_expired" ? "expired" : "invalid";
}
