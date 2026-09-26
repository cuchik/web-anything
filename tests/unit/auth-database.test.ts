import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthTokenRecord, createSession, createUser, findUserByUsername, resetPasswordWithToken, updateUserEmail, verifyEmailWithToken } from "@/db/auth";
import { createRecipe, deleteRecipe, listRecipes } from "@/db/recipes";
import type { SavedRecipePayload } from "@/lib/recipes/saved-recipe";

const holder = vi.hoisted(() => ({ database: null as D1Database | null }));
vi.mock("@/db/client", () => ({ getDatabase: async () => holder.database }));
let sql: DatabaseSync;
const password = { hash: "old-hash", salt: "test-salt", iterations: 210_000 };
const replacement = { ...password, hash: "new-hash" };

// Uses actual SQLite statements/migrations with transactional batch semantics.
// This is not a substitute for the final Cloudflare D1 staging gate.
function adapter(database: DatabaseSync) {
  function prepare(query: string, values: SQLInputValue[] = []) {
    const execute = () => {
      const results = database.prepare(query).all(...values);
      const changes = database.prepare("SELECT changes() AS count").get()?.count;
      return { results, success: true, meta: { changes: Number(changes) } };
    };
    return {
      bind: (...bindings: SQLInputValue[]) => prepare(query, bindings),
      first: async () => database.prepare(query).get(...values) ?? null,
      run: async () => execute(), all: async () => execute(), execute,
    };
  }
  return {
    prepare,
    batch: async (statements: Array<ReturnType<typeof prepare>>) => {
      database.exec("BEGIN");
      try {
        const result = statements.map((statement) => statement.execute());
        database.exec("COMMIT");
        return result;
      } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  } as unknown as D1Database;
}

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const file of readdirSync("drizzle").filter((file) => file.endsWith(".sql")).sort()) {
    sql.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }
  holder.database = adapter(sql);
});
afterEach(() => sql.close());

async function account(verified = true) {
  const user = await createUser({ username: "test-chef", password });
  sql.prepare("UPDATE users SET email = ?, email_verified_at = ? WHERE id = ?")
    .run("chef@example.test", verified ? Date.now() : null, user.id);
  return (await findUserByUsername(user.username))!;
}
async function token(user: Awaited<ReturnType<typeof account>>, purpose: "password_reset" | "email_verification" = "password_reset") {
  await createAuthTokenRecord({ id: "token-digest", userId: user.id, email: user.email!, emailVersion: user.emailVersion, purpose, expiresAt: Date.now() + 60_000 });
}

describe("auth database invariants", () => {
  it("preserves existing user data when upgrading through 0004 and new migrations", () => {
    const legacy = new DatabaseSync(":memory:");
    try {
      const files = readdirSync("drizzle").filter((file) => file.endsWith(".sql")).sort();
      for (const file of files.filter((file) => file < "0004")) legacy.exec(readFileSync(`drizzle/${file}`, "utf8"));
      legacy.prepare("INSERT INTO users (id, username, email, password_hash, password_salt, password_iterations, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("legacy-id", "legacy-chef", "legacy@example.test", password.hash, password.salt, password.iterations, 123, 456);
      for (const file of files.filter((file) => file >= "0004")) legacy.exec(readFileSync(`drizzle/${file}`, "utf8"));
      expect(legacy.prepare("SELECT id, password_hash, email_verified_at, email_version FROM users").get())
        .toMatchObject({ id: "legacy-id", password_hash: password.hash, email_verified_at: 123, email_version: 0 });
      expect(() => legacy.prepare("INSERT INTO users (id, username, password_hash, password_salt, password_iterations, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run("new-id", "legacy-chef", password.hash, password.salt, password.iterations, 789)).toThrow();
    } finally { legacy.close(); }
  });
  it("reset changes the password, revokes sessions and consumes tokens atomically", async () => {
    const user = await account(); await token(user);
    await createSession("session", user.id, Date.now() + 60_000, password.hash);
    expect(await resetPasswordWithToken("token-digest", replacement)).toBe(true);
    expect((await findUserByUsername(user.username))?.password.hash).toBe(replacement.hash);
    expect(sql.prepare("SELECT * FROM sessions").all()).toHaveLength(0);
    expect(sql.prepare("SELECT * FROM auth_tokens").all()).toHaveLength(0);
    expect(await resetPasswordWithToken("token-digest", password)).toBe(false);
  });
  it("allows only one of two competing redemptions", async () => {
    const user = await account(); await token(user);
    expect(await Promise.all([resetPasswordWithToken("token-digest", replacement), resetPasswordWithToken("token-digest", password)]))
      .toEqual([true, false]);
  });
  it("rolls back every mutation when session revocation fails", async () => {
    const user = await account(); await token(user);
    await createSession("session", user.id, Date.now() + 60_000, password.hash);
    sql.exec("CREATE TRIGGER fail_revocation BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
    await expect(resetPasswordWithToken("token-digest", replacement)).rejects.toThrow();
    expect((await findUserByUsername(user.username))?.password.hash).toBe(password.hash);
    expect(sql.prepare("SELECT * FROM auth_tokens").all()).toHaveLength(1);
    expect(sql.prepare("SELECT * FROM sessions").all()).toHaveLength(1);
  });
  it("email changes invalidate reset and verification tokens, including change-away-and-back", async () => {
    const user = await account(); await token(user, "email_verification");
    const changed = await updateUserEmail(user, "new@example.test");
    await updateUserEmail(changed, user.email!);
    expect(await verifyEmailWithToken("token-digest")).toBe(false);
    await expect(createAuthTokenRecord({ id: "stale", userId: user.id, email: user.email!, emailVersion: 0, purpose: "email_verification", expiresAt: Date.now() + 60_000 }))
      .rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
  });
  it("does not issue recovery tokens to unverified email", async () => {
    await expect(token(await account(false))).rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
  });
  it("rejects expired and pre-migration unbound tokens", async () => {
    const user = await account(); await token(user);
    sql.prepare("UPDATE auth_tokens SET expires_at = 0").run();
    expect(await resetPasswordWithToken("token-digest", replacement)).toBe(false);
    sql.prepare("UPDATE auth_tokens SET expires_at = ?, email_version = NULL").run(Date.now() + 60_000);
    expect(await resetPasswordWithToken("token-digest", replacement)).toBe(false);
  });
  it("verification is single-use and bound to the current email version", async () => {
    const user = await account(false); await token(user, "email_verification");
    expect(await verifyEmailWithToken("token-digest")).toBe(true);
    expect(await verifyEmailWithToken("token-digest")).toBe(false);
    expect((await findUserByUsername(user.username))?.emailVerifiedAt).not.toBeNull();
  });
  it("rejects stale sign-in and email-change authorization after reset", async () => {
    const user = await account(); await token(user);
    await resetPasswordWithToken("token-digest", replacement);
    await expect(createSession("stale", user.id, Date.now() + 60_000, password.hash)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(updateUserEmail(user, "new@example.test")).rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
  });
});

describe("recipe database invariants", () => {
  const recipe: SavedRecipePayload = {
    isFood: true, title: "Canh rau", subtitle: "Canh rau củ", duration: "20 phút", servings: "2 người",
    calories: "~200 kcal", confidence: 70, confidenceBand: "medium", analysisMode: "thumbnail",
    observations: ["Có rau"], assumptions: ["Gia vị ước tính"], ingredients: ["Rau", "Nước", "Muối"],
    steps: ["Rửa rau", "Nấu rau"], warnings: [], image: "https://scontent.fbcdn.net/dish.jpg",
    sourceUrl: "https://www.facebook.com/reel/123", promptVersion: "test",
  };
  it("enforces ownership and rejects corrupt stored payloads", async () => {
    const saved = await createRecipe("owner-a", recipe);
    expect(await listRecipes("owner-b")).toEqual([]);
    expect(await deleteRecipe("owner-b", saved.id)).toBe(false);
    expect(await listRecipes("owner-a")).toHaveLength(1);
    sql.prepare("UPDATE recipes SET recipe_json = ? WHERE id = ?").run('{"sourceUrl":"javascript:alert(1)"}', saved.id);
    expect(await listRecipes("owner-a")).toEqual([]);
  });
  it("caps writes at 100 rows per owner without blocking another owner", async () => {
    for (let index = 0; index < 100; index += 1) await createRecipe("owner-a", recipe);
    await expect(createRecipe("owner-a", recipe)).rejects.toMatchObject({ code: "RECIPE_QUOTA_REACHED" });
    await expect(createRecipe("owner-b", recipe)).resolves.toMatchObject({ title: recipe.title });
  });
});
