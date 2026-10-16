import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-client";

describe("authErrorMessage", () => {
  it("never says whether the email or the password was wrong", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "Email or password is incorrect.",
    );
  });

  it("explains rate limiting", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });

  it("points an existing account to sign-in", () => {
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toMatch(
      /already exists/,
    );
  });

  it("passes on the server's form message", () => {
    expect(authErrorMessage({ code: "INVALID_SIGN_UP", message: "Enter your name." })).toBe(
      "Enter your name.",
    );
  });

  it("hides anything unexpected behind a plain message", () => {
    expect(authErrorMessage({ code: "SOMETHING_INTERNAL", message: "db exploded" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
