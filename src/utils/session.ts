import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const SESSION_COOKIE_NAME = 'session_id';
const SESSION_COOKIE_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

type SessionRecord = {
  sessionId: string;
  userId: number;
  username: string;
  role: string;
  expiresAt: number;
};

const sessions = new Map<string, SessionRecord>();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(key);
    }
  }
};

export const createSession = (userId: number, role: string, username: string) => {
  cleanupExpired();
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    sessionId,
    userId,
    username,
    role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
};

export const getSession = (sessionId: string | undefined | null) => {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
};

export const deleteSession = (sessionId: string | undefined | null) => {
  if (!sessionId) return;
  sessions.delete(sessionId);
};

export const buildSessionCookie = (sessionId: string | null) => {
  const base = `${SESSION_COOKIE_NAME}=${sessionId ?? ''}; Path=/; HttpOnly; SameSite=Lax`;
  if (!sessionId) {
    return `${base}; Max-Age=0`;
  }
  return `${base}; Max-Age=${SESSION_COOKIE_MAX_AGE}`;
};

export const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = rest.join('=');
    return acc;
  }, {});
};

export const getSessionFromRequest = (request: Request) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const sessionId = cookies[SESSION_COOKIE_NAME];
  const session = getSession(sessionId);
  if (!session) return null;
  return { ...session };
};

export const getSessionIdFromRequest = (request: Request) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  return cookies[SESSION_COOKIE_NAME];
};

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = SESSION_COOKIE_MAX_AGE;
