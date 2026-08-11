import { getDatabase } from "@/db/client";
import type { StoredPassword } from "@/lib/auth/password";
import { ApplicationError } from "@/lib/errors/application-error";

export type AuthTokenPurpose = "password_reset" | "email_verification";

export type UserRecord = {
  id: string;
  username: string;
  email: string | null;
  password: StoredPassword;
  emailVerifiedAt: number | null;
};

export type SessionUser = {
  id: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  email_verified_at: number | null;
};

let schemaReady: Promise<void> | undefined;

async function ensureSchema() {
  schemaReady ??= (async () => {
    const database = await getDatabase();
    await database.batch([
      database.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          username TEXT NOT NULL,
          email TEXT,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          password_iterations INTEGER NOT NULL,
          email_verified_at INTEGER,
          created_at INTEGER NOT NULL
        )
      `),
      database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username)"),
      database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)"),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `),
      database.prepare("CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)"),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          purpose TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          used_at INTEGER,
          created_at INTEGER NOT NULL
        )
      `),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose_idx ON auth_tokens (user_id, purpose)",
      ),
    ]);
  })();
  await schemaReady;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: {
      hash: row.password_hash,
      salt: row.password_salt,
      iterations: row.password_iterations,
    },
    emailVerifiedAt: row.email_verified_at,
  };
}

const USER_COLUMNS =
  "id, username, email, password_hash, password_salt, password_iterations, email_verified_at";

export async function findUserByUsername(username: string) {
  await ensureSchema();
  const database = await getDatabase();
  const row = await database
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`)
    .bind(username)
    .first<UserRow>();
  return row ? toUserRecord(row) : null;
}

export async function findUserByEmail(email: string) {
  await ensureSchema();
  const database = await getDatabase();
  const row = await database
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`)
    .bind(email)
    .first<UserRow>();
  return row ? toUserRecord(row) : null;
}

function isUniqueViolation(error: unknown) {
  // The unique indexes are the authoritative guard against a race between two writers.
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export async function createUser(input: {
  username: string;
  password: StoredPassword;
}): Promise<UserRecord> {
  await ensureSchema();
  const database = await getDatabase();
  const id = crypto.randomUUID();

  try {
    await database
      .prepare(`
        INSERT INTO users (
          id, username, email, password_hash, password_salt, password_iterations,
          email_verified_at, created_at
        ) VALUES (?, ?, NULL, ?, ?, ?, NULL, ?)
      `)
      .bind(
        id,
        input.username,
        input.password.hash,
        input.password.salt,
        input.password.iterations,
        Date.now(),
      )
      .run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApplicationError("USERNAME_TAKEN", 409, "Tên đăng nhập này đã được sử dụng.");
    }
    throw error;
  }

  return {
    id,
    username: input.username,
    email: null,
    password: input.password,
    emailVerifiedAt: null,
  };
}

/** Setting or changing the address always drops verification back to unverified. */
export async function updateUserEmail(userId: string, email: string) {
  await ensureSchema();
  const database = await getDatabase();

  try {
    await database
      .prepare("UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?")
      .bind(email, userId)
      .run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApplicationError("EMAIL_TAKEN", 409, "Email này đã được dùng cho tài khoản khác.");
    }
    throw error;
  }
}

export async function updateUserPassword(userId: string, password: StoredPassword) {
  await ensureSchema();
  const database = await getDatabase();
  await database
    .prepare(
      "UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?",
    )
    .bind(password.hash, password.salt, password.iterations, userId)
    .run();
}

export async function markEmailVerified(userId: string) {
  await ensureSchema();
  const database = await getDatabase();
  await database
    .prepare("UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL")
    .bind(Date.now(), userId)
    .run();
}

export async function createSession(sessionId: string, userId: string, expiresAt: number) {
  await ensureSchema();
  const database = await getDatabase();
  const now = Date.now();
  await database.batch([
    database.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    database
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(sessionId, userId, expiresAt, now),
  ]);
}

export async function findSessionUser(sessionId: string): Promise<SessionUser | null> {
  await ensureSchema();
  const database = await getDatabase();
  const row = await database
    .prepare(`
      SELECT users.id, users.username, users.email, users.email_verified_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > ?
    `)
    .bind(sessionId, Date.now())
    .first<Pick<UserRow, "id" | "username" | "email" | "email_verified_at">>();

  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
  };
}

export async function deleteSession(sessionId: string) {
  await ensureSchema();
  const database = await getDatabase();
  await database.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export async function deleteSessionsForUser(userId: string) {
  await ensureSchema();
  const database = await getDatabase();
  await database.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export async function createAuthTokenRecord(input: {
  id: string;
  userId: string;
  purpose: AuthTokenPurpose;
  expiresAt: number;
}) {
  await ensureSchema();
  const database = await getDatabase();
  await database.batch([
    // Only the newest token per purpose stays usable.
    database
      .prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?")
      .bind(input.userId, input.purpose),
    database
      .prepare(`
        INSERT INTO auth_tokens (id, user_id, purpose, expires_at, used_at, created_at)
        VALUES (?, ?, ?, ?, NULL, ?)
      `)
      .bind(input.id, input.userId, input.purpose, input.expiresAt, Date.now()),
  ]);
}

/** Single-use redemption: the same token can never be spent twice. */
export async function consumeAuthToken(id: string, purpose: AuthTokenPurpose) {
  await ensureSchema();
  const database = await getDatabase();
  const row = await database
    .prepare(`
      UPDATE auth_tokens SET used_at = ?
      WHERE id = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
      RETURNING user_id
    `)
    .bind(Date.now(), id, purpose, Date.now())
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}
