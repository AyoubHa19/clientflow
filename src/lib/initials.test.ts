import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first and last names", () => {
    expect(initials("Sara Bennani")).toBe("SB");
    expect(initials("Sara El Amrani")).toBe("SA");
  });

  it("works with one word", () => {
    expect(initials("sara")).toBe("S");
  });

  it("skips brackets and symbols", () => {
    expect(initials("Sara Bennani (sample)")).toBe("SB");
    expect(initials("  Omar  - ")).toBe("O");
  });

  it("keeps letters from any alphabet", () => {
    expect(initials("سارة بناني")).toBe("سب");
    expect(initials("Élodie Ünal")).toBe("ÉÜ");
  });

  it("falls back to a question mark", () => {
    expect(initials("   ")).toBe("?");
    expect(initials("(sample)")).toBe("?");
  });
});
