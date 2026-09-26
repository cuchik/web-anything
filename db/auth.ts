import { getDatabase } from "@/db/client";
import type { StoredPassword } from "@/lib/auth/password";
import { ApplicationError } from "@/lib/errors/application-error";

export type AuthTokenPurpose = "password_reset" | "email_verification";
export type UserRecord = {
  id: string;
  username: string;
  email: string | null;
  emailVersion: number;
  password: StoredPassword;
  emailVerifiedAt: number | null;
};
export type SessionUser = Omit<UserRecord, "password" | "emailVerifiedAt"> & {
  emailVerified: boolean;
};
type UserRow = {
  id: string;
  username: string;
  email: string | null;
  email_version: number;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  email_verified_at: number | null;
};
const USER_COLUMNS = "id, username, email, email_version, password_hash, password_salt, password_iterations, email_verified_at";

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id, username: row.username, email: row.email, emailVersion: row.email_version,
    password: { hash: row.password_hash, salt: row.password_salt, iterations: row.password_iterations },
    emailVerifiedAt: row.email_verified_at,
  };
}

export async function findUserByUsername(username: string) {
  const database = await getDatabase();
  const row = await database.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`)
    .bind(username).first<UserRow>();
  return row ? toUserRecord(row) : null;
}

export async function findUserByEmail(email: string) {
  const database = await getDatabase();
  const row = await database.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`)
    .bind(email).first<UserRow>();
  return row ? toUserRecord(row) : null;
}

function isUniqueViolation(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export async function createUser(input: { username: string; password: StoredPassword }): Promise<UserRecord> {
  const database = await getDatabase();
  const id = crypto.randomUUID();
  try {
    await database.prepare(`INSERT INTO users (
      id, username, email, email_version, password_hash, password_salt, password_iterations,
      email_verified_at, created_at
    ) VALUES (?, ?, NULL, 0, ?, ?, ?, NULL, ?)`)
      .bind(id, input.username, input.password.hash, input.password.salt, input.password.iterations, Date.now()).run();
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApplicationError("USERNAME_TAKEN", 409, "Tên đăng nhập này đã được sử dụng.");
    throw error;
  }
  return { id, username: input.username, email: null, emailVersion: 0, password: input.password, emailVerifiedAt: null };
}

/** Compare-and-swap rejects a password check made before a concurrent reset. */
export async function updateUserEmail(user: UserRecord, email: string) {
  const database = await getDatabase();
  try {
    const results = await database.batch([
      database.prepare(`UPDATE users SET email = ?, email_verified_at = NULL, email_version = email_version + 1
        WHERE id = ? AND password_hash = ? AND email_version = ? RETURNING id`)
        .bind(email, user.id, user.password.hash, user.emailVersion),
      database.prepare(`DELETE FROM auth_tokens WHERE user_id = ? AND email_version IS NOT
        (SELECT email_version FROM users WHERE id = ?)`)
        .bind(user.id, user.id),
    ]);
    if (!results[0].results.length) throw new ApplicationError("ACCOUNT_CHANGED", 409, "Tài khoản đã thay đổi. Hãy đăng nhập lại.");
    return { ...user, email, emailVersion: user.emailVersion + 1, emailVerifiedAt: null };
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApplicationError("EMAIL_TAKEN", 409, "Email này đã được dùng cho tài khoản khác.");
    throw error;
  }
}

export async function createSession(sessionId: string, userId: string, expiresAt: number, passwordHash: string) {
  const database = await getDatabase();
  const result = await database.prepare(`INSERT INTO sessions (id, user_id, expires_at, created_at)
    SELECT ?, id, ?, ? FROM users WHERE id = ? AND password_hash = ?`)
    .bind(sessionId, expiresAt, Date.now(), userId, passwordHash).run();
  if (!result.meta.changes) throw new ApplicationError("INVALID_CREDENTIALS", 401, "Tên đăng nhập hoặc mật khẩu không đúng.");
}

export async function findSessionUser(sessionId: string): Promise<SessionUser | null> {
  const database = await getDatabase();
  const row = await database.prepare(`SELECT users.id, users.username, users.email, users.email_version, users.email_verified_at
    FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > ?`)
    .bind(sessionId, Date.now()).first<Pick<UserRow, "id" | "username" | "email" | "email_version" | "email_verified_at">>();
  return row ? { id: row.id, username: row.username, email: row.email, emailVersion: row.email_version, emailVerified: row.email_verified_at !== null } : null;
}

export async function deleteSession(sessionId: string) {
  const database = await getDatabase();
  await database.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export async function createAuthTokenRecord(input: {
  id: string; userId: string; email: string; emailVersion: number; purpose: AuthTokenPurpose; expiresAt: number;
}) {
  const database = await getDatabase();
  const results = await database.batch([
    database.prepare(`DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ? AND EXISTS (
      SELECT 1 FROM users WHERE id = ? AND email = ? AND email_version = ?
    )`).bind(input.userId, input.purpose, input.userId, input.email, input.emailVersion),
    database.prepare(`INSERT INTO auth_tokens (id, user_id, purpose, email_version, expires_at, used_at, created_at)
      SELECT ?, id, ?, email_version, ?, NULL, ? FROM users
      WHERE id = ? AND email = ? AND email_version = ? AND (? <> 'password_reset' OR email_verified_at IS NOT NULL)
      RETURNING id`)
      .bind(input.id, input.purpose, input.expiresAt, Date.now(), input.userId, input.email, input.emailVersion, input.purpose),
  ]);
  if (!results[1].results.length) throw new ApplicationError("ACCOUNT_CHANGED", 409, "Tài khoản đã thay đổi. Hãy thử lại.");
}

// D1 executes a batch transactionally. Keep the token until the last statement
// so password/session/token mutations share a single-use authorization predicate.
const VALID_TOKEN_USER = `SELECT t.user_id FROM auth_tokens t JOIN users u ON u.id = t.user_id
  WHERE t.id = ? AND t.purpose = ? AND t.used_at IS NULL AND t.expires_at > ?
    AND t.email_version = u.email_version AND u.email IS NOT NULL
    AND (? <> 'password_reset' OR u.email_verified_at IS NOT NULL)`;

export async function resetPasswordWithToken(id: string, password: StoredPassword) {
  const database = await getDatabase();
  const args = [id, "password_reset", Date.now(), "password_reset"];
  const results = await database.batch([
    database.prepare(`UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?
      WHERE id IN (${VALID_TOKEN_USER}) RETURNING id`)
      .bind(password.hash, password.salt, password.iterations, ...args),
    database.prepare(`DELETE FROM sessions WHERE user_id IN (${VALID_TOKEN_USER})`).bind(...args),
    database.prepare(`DELETE FROM auth_tokens WHERE user_id IN (${VALID_TOKEN_USER})`).bind(...args),
  ]);
  return results[0].results.length === 1;
}

export async function verifyEmailWithToken(id: string) {
  const database = await getDatabase();
  const args = [id, "email_verification", Date.now(), "email_verification"];
  const results = await database.batch([
    database.prepare(`UPDATE users SET email_verified_at = ? WHERE id IN (${VALID_TOKEN_USER}) RETURNING id`)
      .bind(Date.now(), ...args),
    database.prepare(`DELETE FROM auth_tokens WHERE id = ? AND user_id IN (${VALID_TOKEN_USER})`).bind(id, ...args),
  ]);
  return results[0].results.length === 1;
}
