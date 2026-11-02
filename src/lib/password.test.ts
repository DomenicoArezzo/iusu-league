import { describe, expect, it } from "vitest";
import { recoveryProblemFromHash, validatePassword } from "./password";

describe("validatePassword", () => {
  it("accetta una password con lettere e numeri di almeno 8 caratteri", () => {
    expect(validatePassword("calcetto2026")).toBeNull();
    expect(validatePassword("èàùòì1234")).toBeNull();
  });

  it("rifiuta le password troppo corte", () => {
    expect(validatePassword("abc123")).toContain("almeno 8");
  });

  it("pretende almeno una lettera e un numero", () => {
    expect(validatePassword("12345678")).toContain("lettera");
    expect(validatePassword("abcdefgh")).toContain("numero");
  });

  it("controlla che le due password coincidano", () => {
    expect(validatePassword("calcetto2026", "calcetto2025")).toContain("non coincidono");
    expect(validatePassword("calcetto2026", "calcetto2026")).toBeNull();
  });
});

describe("recoveryProblemFromHash", () => {
  it("non vede problemi in un link buono o senza frammento", () => {
    expect(recoveryProblemFromHash("")).toBeNull();
    expect(recoveryProblemFromHash("#access_token=abc&type=recovery")).toBeNull();
  });

  it("riconosce un link scaduto", () => {
    expect(recoveryProblemFromHash("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toBe("expired");
  });

  it("riconosce un link non valido", () => {
    expect(recoveryProblemFromHash("#error=access_denied&error_code=bad_jwt")).toBe("invalid");
    expect(recoveryProblemFromHash("#error=server_error")).toBe("invalid");
  });
});
