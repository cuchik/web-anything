import { describe, expect, it } from "vitest";
import {
  authTokenSchema,
  emailSchema,
  failedPasswordRules,
  passwordSchema,
  setEmailSchema,
  signInSchema,
  signUpSchema,
  usernameSchema,
} from "@/lib/auth/credentials";

describe("usernameSchema", () => {
  it("normalises case and surrounding whitespace", () => {
    expect(usernameSchema.parse("  LuanNguyen ")).toBe("luannguyen");
  });

  it("rejects unusable or unsafe usernames", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(33)).success).toBe(false);
    expect(usernameSchema.safeParse(".leading").success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
    expect(usernameSchema.safeParse("email@host").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("normalises to a lowercase trimmed address", () => {
    expect(emailSchema.parse(" Person@Example.COM ")).toBe("person@example.com");
  });

  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse(`${"a".repeat(250)}@example.com`).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  const valid = "Bep2026!x";

  it("accepts a password meeting every rule", () => {
    expect(passwordSchema.safeParse(valid).success).toBe(true);
    expect(failedPasswordRules(valid)).toEqual([]);
  });

  it("requires each rule individually", () => {
    const cases: Record<string, string> = {
      length: "Bep20!x",
      lowercase: "BEP2026!X",
      uppercase: "bep2026!x",
      digit: "BepBepBep!x",
      special: "Bep2026xy",
    };

    for (const [ruleId, password] of Object.entries(cases)) {
      expect(passwordSchema.safeParse(password).success, ruleId).toBe(false);
      expect(failedPasswordRules(password).map((rule) => rule.id), ruleId).toEqual([ruleId]);
    }
  });

  it("does not count whitespace as a special character", () => {
    expect(failedPasswordRules("Bep 2026 x").map((rule) => rule.id)).toEqual(["special"]);
  });

  it("reports every unmet rule in one message", () => {
    const result = passwordSchema.safeParse("abc");
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = result.error.issues[0]?.message ?? "";
    expect(message).toContain("8 ký tự");
    expect(message).toContain("chữ hoa");
    expect(message).toContain("chữ số");
    expect(message).toContain("ký tự đặc biệt");
  });

  it("keeps character ranges intact in the message", () => {
    const result = passwordSchema.safeParse("bep2026!x");
    expect(result.success).toBe(false);
    if (result.success) return;

    // Lowercasing the whole label once turned "chữ hoa (A–Z)" into "(a–z)".
    expect(result.error.issues[0]?.message).toBe("Mật khẩu chưa đạt: có chữ hoa (A–Z).");
  });

  it("still enforces the maximum length", () => {
    expect(passwordSchema.safeParse(`${valid}${"a".repeat(200)}`).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("takes only a username and password", () => {
    expect(signUpSchema.parse({ username: " Chef_Luan ", password: "Bep2026!x" })).toEqual({
      username: "chef_luan",
      password: "Bep2026!x",
    });
  });

  it("ignores an email if one is sent", () => {
    const parsed = signUpSchema.parse({
      username: "chef_luan",
      password: "Bep2026!x",
      email: "chef@example.com",
    });

    expect(parsed).not.toHaveProperty("email");
  });

  it("rejects a password that fails the criteria", () => {
    expect(signUpSchema.safeParse({ username: "chef_luan", password: "bepbepbep" }).success).toBe(
      false,
    );
  });
});

describe("setEmailSchema", () => {
  it("normalises the address added after sign-in", () => {
    expect(setEmailSchema.parse({ email: " Chef@Example.COM " })).toEqual({
      email: "chef@example.com",
    });
    expect(setEmailSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty username so invalid and wrong look alike", () => {
    expect(signInSchema.parse({ username: " Chef@Host ", password: "x" }).username).toBe(
      "chef@host",
    );
    expect(signInSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
  });
});

describe("authTokenSchema", () => {
  it("only accepts a 64-character hex token", () => {
    expect(authTokenSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(authTokenSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(authTokenSchema.safeParse("a".repeat(63)).success).toBe(false);
    expect(authTokenSchema.safeParse("../../etc/passwd").success).toBe(false);
  });
});
