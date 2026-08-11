import { cookies } from "next/headers";
import { createSession, deleteSession, findSessionUser, type SessionUser } from "@/db/auth";
import { createAuthToken, hashAuthToken, TOKEN_PATTERN } from "@/lib/auth/token";

export const SESSION_COOKIE_NAME = "bepvideo_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

function sessionCookie(value: string, secure: boolean, maxAge: number): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge },
  };
}

export async function readSessionToken() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

export async function readSessionUser(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return findSessionUser(await hashAuthToken(token));
}

/** Issues a fresh session id, so a sign-in never reuses a pre-existing token. */
export async function startSession(userId: string, secure: boolean) {
  const { token, id } = await createAuthToken();
  await createSession(id, userId, Date.now() + SESSION_TTL_MS);
  return sessionCookie(token, secure, Math.floor(SESSION_TTL_MS / 1_000));
}

export async function endSession(secure: boolean) {
  const token = await readSessionToken();
  if (token) await deleteSession(await hashAuthToken(token));
  return sessionCookie("", secure, 0);
}

export type { SessionUser };
