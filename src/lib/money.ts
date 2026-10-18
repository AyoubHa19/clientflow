import { z } from "zod";

// Money (Stage 15). Amounts are whole numbers of minor units (cents,
// centimes): 1,500.50 MAD is stored as 150050. No floating point, so sums
// never drift. Every currency offered has two decimals.

/** The currencies a workspace can choose; all of them have 2 decimals. */
export const CURRENCIES = [
  { code: "MAD", name: "Moroccan dirham" },
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "AED", name: "UAE dirham" },
  { code: "SAR", name: "Saudi riyal" },
  { code: "QAR", name: "Qatari riyal" },
  { code: "EGP", name: "Egyptian pound" },
  { code: "DZD", name: "Algerian dinar" },
  { code: "NGN", name: "Nigerian naira" },
  { code: "ZAR", name: "South African rand" },
  { code: "INR", name: "Indian rupee" },
  { code: "BRL", name: "Brazilian real" },
  { code: "MXN", name: "Mexican peso" },
  { code: "TRY", name: "Turkish lira" },
  { code: "SEK", name: "Swedish krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "DKK", name: "Danish krone" },
  { code: "PLN", name: "Polish złoty" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code) as [
  CurrencyCode,
  ...CurrencyCode[],
];

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);

/** The largest amount accepted: 10 million, which fits the database's integers. */
export const MAX_AMOUNT = 10_000_000;
const MINOR_PER_UNIT = 100;

/** A first guess at a workspace's currency, from its time zone. */
export function currencyForTimeZone(timeZone: string): CurrencyCode {
  const exact: Record<string, CurrencyCode> = {
    "Africa/Casablanca": "MAD",
    "Africa/El_Aaiun": "MAD",
    "Africa/Algiers": "DZD",
    "Africa/Cairo": "EGP",
    "Africa/Lagos": "NGN",
    "Africa/Johannesburg": "ZAR",
    "Asia/Dubai": "AED",
    "Asia/Riyadh": "SAR",
    "Asia/Qatar": "QAR",
    "Asia/Kolkata": "INR",
    "Asia/Calcutta": "INR",
    "Europe/London": "GBP",
    "Europe/Zurich": "CHF",
    "Europe/Istanbul": "TRY",
    "Europe/Stockholm": "SEK",
    "Europe/Oslo": "NOK",
    "Europe/Copenhagen": "DKK",
    "Europe/Warsaw": "PLN",
    "America/Toronto": "CAD",
    "America/Vancouver": "CAD",
    "America/Mexico_City": "MXN",
    "America/Sao_Paulo": "BRL",
  };
  if (exact[timeZone]) return exact[timeZone];
  if (timeZone.startsWith("Europe/")) return "EUR";
  if (timeZone.startsWith("Australia/")) return "AUD";
  return "USD";
}

export const AMOUNT_HINT = "Like 1500 or 1,500.50.";
const INVALID = "Enter an amount like 1500 or 1,500.50, or leave it empty.";
const TOO_BIG = "That's more than 10,000,000. Enter a smaller amount.";

/**
 * Reads an amount someone typed: "1500", "1500.5", "1 500,50", "1,500.50".
 * A "," or "." followed by one or two digits at the end is the decimal
 * point; groups of three digits may be split by spaces or commas. Returns
 * minor units, or an error message.
 */
export function parseAmount(text: string): { minor: number } | { error: string } {
  const value = text.trim().replace(/[\s  ]/g, "");
  let whole: string;
  let fraction = "";
  const decimal = /^(\d+)[.,](\d{1,2})$/.exec(value);
  const grouped = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(value);
  if (/^\d+$/.test(value)) {
    whole = value;
  } else if (decimal) {
    whole = decimal[1]!;
    fraction = decimal[2]!;
  } else if (grouped) {
    whole = grouped[1]!.replaceAll(",", "");
    fraction = grouped[2] ?? "";
  } else {
    return { error: INVALID };
  }
  if (whole.replace(/^0+/, "").length > 9) return { error: TOO_BIG };
  const minor = Number(whole) * MINOR_PER_UNIT + Number(fraction.padEnd(2, "0"));
  if (minor > MAX_AMOUNT * MINOR_PER_UNIT) return { error: TOO_BIG };
  return { minor };
}

/** An optional amount field: empty is null, anything else must read as an amount. */
export const optionalAmount = z
  .string()
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (!value || !value.trim()) return null;
    const result = parseAmount(value);
    if ("error" in result) {
      ctx.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.minor;
  });

/**
 * An amount for people to read: "MAD 1,500", "EUR 1,500.50". Whole amounts
 * drop the decimals; `compact` shortens big ones ("MAD 12.5K") for tight
 * spots. The locale is fixed, so the server and the browser agree.
 */
export function formatMoney(minor: number, currency: string, { compact = false } = {}) {
  const whole = minor % MINOR_PER_UNIT === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }),
  })
    .format(minor / MINOR_PER_UNIT)
    .replace(/ /g, " ");
}

/** A stored amount as the form shows it: 150050 → "1500.50", 150000 → "1500". */
export function amountInputValue(minor: number | null | undefined) {
  if (minor === null || minor === undefined) return "";
  const units = Math.trunc(minor / MINOR_PER_UNIT);
  const cents = minor % MINOR_PER_UNIT;
  return cents === 0 ? String(units) : `${units}.${String(cents).padStart(2, "0")}`;
}

/** Adds up amounts, skipping the empty ones. */
export function sumAmounts(amounts: (number | null | undefined)[]) {
  return amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}
