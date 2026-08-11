import { describe, expect, it } from "vitest";
import { safeRelativeReturnPath, signInPath, signUpPath } from "@/lib/auth/return-path";

describe("safeRelativeReturnPath", () => {
  it("keeps a same-site relative path with query and hash", () => {
    expect(safeRelativeReturnPath("/saved?tab=all#top")).toBe("/saved?tab=all#top");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeRelativeReturnPath("https://evil.example/steal")).toBe("/");
    expect(safeRelativeReturnPath("//evil.example/steal")).toBe("/");
    expect(safeRelativeReturnPath("http:/evil.example")).toBe("/");
    expect(safeRelativeReturnPath("javascript:alert(1)")).toBe("/");
    expect(safeRelativeReturnPath("saved")).toBe("/");
  });

  it("rejects missing values", () => {
    expect(safeRelativeReturnPath(undefined)).toBe("/");
    expect(safeRelativeReturnPath(null)).toBe("/");
    expect(safeRelativeReturnPath("")).toBe("/");
  });

  it("never returns an auth page, which would loop the user", () => {
    expect(safeRelativeReturnPath("/signin")).toBe("/");
    expect(safeRelativeReturnPath("/signup")).toBe("/");
    expect(safeRelativeReturnPath("/reset-password?token=abc")).toBe("/");
    expect(safeRelativeReturnPath("/verify-email")).toBe("/");
  });
});

describe("auth path builders", () => {
  it("encodes the validated return path", () => {
    expect(signInPath("/saved?tab=all")).toBe("/signin?return_to=%2Fsaved%3Ftab%3Dall");
    expect(signUpPath("https://evil.example")).toBe("/signup?return_to=%2F");
  });
});
