import { randomInt, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createAuth, type Auth } from "./config";

// Better Auth against Neon's test branch, through its HTTP endpoints (as
// the forms use it), so rate limiting and the Origin check are included.

const BASE = "http://localhost:3001";
let db: Db;
let auth: Auth;
const emails: string[] = [];
const ips: string[] = [];

beforeAll(() => {
  db = createPrismaClient(getTestDatabaseUrl());
  auth = createAuth({ db, secret: "t".repeat(40), baseURL: BASE, rateLimit: true });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.rateLimit.deleteMany({ where: { OR: ips.map((ip) => ({ key: { contains: ip } })) } });
  await db.$disconnect();
});

/** A fresh address per test, so tests don't share accounts or limits. */
function newIdentity() {
  const email = `auth-${randomUUID()}@example.com`;
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  emails.push(email);
  ips.push(ip);
  return { email, ip };
}

async function call(
  path: string,
  {
    body,
    ip,
    cookie,
    origin = BASE,
  }: { body?: unknown; ip: string; cookie?: string; origin?: string },
) {
  const headers = new Headers({ "x-forwarded-for": ip, origin });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  const response = await auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await response.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  // "name=value" pairs to send back, like a browser would.
  const setCookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return { status: response.status, json, setCookie };
}

const PASSWORD = "correct horse battery";

async function signUp(email: string, ip: string) {
  return call("/sign-up/email", { ip, body: { name: "Sara (sample)", email, password: PASSWORD } });
}

describe("sign up", () => {
  it("creates the user and stores only a hash of the password", async () => {
    const { email, ip } = newIdentity();
    const result = await signUp(email, ip);

    expect(result.status).toBe(200);
    expect(result.setCookie).toMatch(/session_token=/);

    const user = await db.user.findUniqueOrThrow({
      where: { email },
      include: { accounts: true },
    });
    expect(user.name).toBe("Sara (sample)");
    const account = user.accounts[0];
    expect(account?.providerId).toBe("credential");
    expect(account?.password).not.toContain(PASSWORD);
    // scrypt: a hex salt and a hex hash, separated by a colon.
    expect(account?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("refuses an email that already has an account", async () => {
    const { email, ip } = newIdentity();
    await signUp(email, ip);
    const again = await signUp(email, ip);
    expect(again.status).toBe(422);
    expect(String(again.json?.code)).toMatch(/^USER_ALREADY_EXISTS/);
  });

  it("checks the form's rules on the server too", async () => {
    const { email, ip } = newIdentity();
    const longName = await call("/sign-up/email", {
      ip,
      body: { name: "x".repeat(201), email, password: PASSWORD },
    });
    expect(longName.status).toBe(400);
    expect(longName.json?.code).toBe("INVALID_SIGN_UP");

    const shortPassword = await call("/sign-up/email", {
      ip,
      body: { name: "Sara (sample)", email, password: "short" },
    });
    expect(shortPassword.status).toBe(400);
    expect(await db.user.count({ where: { email } })).toBe(0);
  });
});

describe("sign in and out", () => {
  it("rejects a wrong password without saying which part was wrong", async () => {
    const { email, ip } = newIdentity();
    await signUp(email, ip);

    const wrongPassword = await call("/sign-in/email", {
      ip,
      body: { email, password: "not the password" },
    });
    const unknownEmail = await call("/sign-in/email", {
      ip,
      body: { email: `nobody-${randomUUID()}@example.com`, password: PASSWORD },
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.json?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(unknownEmail.json?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("starts a session that signing out ends", async () => {
    const { email, ip } = newIdentity();
    await signUp(email, ip);

    const signIn = await call("/sign-in/email", { ip, body: { email, password: PASSWORD } });
    expect(signIn.status).toBe(200);

    const session = await call("/get-session", { ip, cookie: signIn.setCookie });
    expect((session.json?.user as { email?: string } | undefined)?.email).toBe(email);

    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const before = await db.session.count({ where: { userId: user.id } });

    const signOut = await call("/sign-out", { ip, cookie: signIn.setCookie, body: {} });
    expect(signOut.status).toBe(200);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(before - 1);

    const after = await call("/get-session", { ip, cookie: signIn.setCookie });
    expect(after.json).toBeNull();
  });

  it("ignores a made-up session cookie", async () => {
    const { ip } = newIdentity();
    const result = await call("/get-session", {
      ip,
      cookie: "better-auth.session_token=forged.value",
    });
    expect(result.json).toBeNull();
  });
});

describe("protection", () => {
  it("slows down repeated sign-in attempts from one address", async () => {
    const { email, ip } = newIdentity();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await call("/sign-in/email", { ip, body: { email, password: "guess" } });
      statuses.push(result.status);
    }
    // Five tries a minute, then "too many requests".
    expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("refuses a request with the user's cookie sent from another site", async () => {
    const { email, ip } = newIdentity();
    const signedUp = await signUp(email, ip);

    // Another site making the browser send the session cookie (CSRF).
    const forged = await call("/sign-out", {
      ip,
      cookie: signedUp.setCookie,
      origin: "https://evil.example",
      body: {},
    });
    expect(forged.status).toBe(403);

    // The session is still there: the forged request did nothing.
    const session = await call("/get-session", { ip, cookie: signedUp.setCookie });
    expect((session.json?.user as { email?: string } | undefined)?.email).toBe(email);
  });
});
