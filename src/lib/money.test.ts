import { describe, expect, it } from "vitest";
import {
  amountInputValue,
  currencyForTimeZone,
  formatMoney,
  isCurrencyCode,
  optionalAmount,
  parseAmount,
  sumAmounts,
} from "./money";

describe("parseAmount", () => {
  it("reads the ways people type amounts, in minor units", () => {
    expect(parseAmount("1500")).toEqual({ minor: 150000 });
    expect(parseAmount(" 1500.5 ")).toEqual({ minor: 150050 });
    expect(parseAmount("1500,50")).toEqual({ minor: 150050 });
    expect(parseAmount("1,500.50")).toEqual({ minor: 150050 });
    expect(parseAmount("1 500,05")).toEqual({ minor: 150005 });
    expect(parseAmount("12,000")).toEqual({ minor: 1200000 });
    expect(parseAmount("0")).toEqual({ minor: 0 });
    expect(parseAmount("0.99")).toEqual({ minor: 99 });
  });

  it("refuses anything else, and amounts over 10 million", () => {
    for (const text of ["", "abc", "-5", "1.234", "1,50,0", "1e5", "15$", "1.500.000"]) {
      expect(parseAmount(text)).toHaveProperty("error");
    }
    expect(parseAmount("10000000")).toEqual({ minor: 1_000_000_000 });
    expect(parseAmount("10000000.01")).toHaveProperty("error");
    expect(parseAmount("99999999999999999999")).toHaveProperty("error");
  });
});

describe("optionalAmount", () => {
  it("empty is null; bad text explains itself", () => {
    expect(optionalAmount.parse("")).toBeNull();
    expect(optionalAmount.parse(undefined)).toBeNull();
    expect(optionalAmount.parse("2,500")).toBe(250000);
    const result = optionalAmount.safeParse("lots");
    expect(result.success).toBe(false);
  });
});

describe("formatMoney", () => {
  it("prints the code and drops decimals from whole amounts", () => {
    expect(formatMoney(150000, "MAD")).toBe("MAD 1,500");
    expect(formatMoney(150050, "EUR")).toBe("EUR 1,500.50");
    expect(formatMoney(0, "USD")).toBe("USD 0");
    expect(formatMoney(1250000, "MAD", { compact: true })).toBe("MAD 12.5K");
  });
});

describe("helpers", () => {
  it("shows a stored amount in the form", () => {
    expect(amountInputValue(150050)).toBe("1500.50");
    expect(amountInputValue(150005)).toBe("1500.05");
    expect(amountInputValue(150000)).toBe("1500");
    expect(amountInputValue(null)).toBe("");
  });

  it("adds amounts, skipping empty ones", () => {
    expect(sumAmounts([100, null, 250, undefined])).toBe(350);
    expect(sumAmounts([])).toBe(0);
  });

  it("guesses a currency from the time zone", () => {
    expect(currencyForTimeZone("Africa/Casablanca")).toBe("MAD");
    expect(currencyForTimeZone("Europe/Paris")).toBe("EUR");
    expect(currencyForTimeZone("Europe/London")).toBe("GBP");
    expect(currencyForTimeZone("America/New_York")).toBe("USD");
    expect(currencyForTimeZone("UTC")).toBe("USD");
  });

  it("knows its currency codes", () => {
    expect(isCurrencyCode("MAD")).toBe(true);
    expect(isCurrencyCode("XYZ")).toBe(false);
    expect(isCurrencyCode(5)).toBe(false);
  });
});
