import { describe, expect, it } from "vitest";
import {
  authTokenSchema,
  emailSchema,
  passwordSchema,
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
  it("enforces the minimum and maximum length", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(12)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("returns normalised credentials", () => {
    expect(
      signUpSchema.parse({
        username: " Chef_Luan ",
        email: " Chef@Example.com ",
        password: "một mật khẩu dài",
      }),
    ).toEqual({
      username: "chef_luan",
      email: "chef@example.com",
      password: "một mật khẩu dài",
    });
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
