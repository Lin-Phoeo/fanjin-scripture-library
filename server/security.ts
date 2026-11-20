import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, SESSION_TTL_SECONDS } from './db.ts';

export type SessionUser = { id: number; name: string; role: string };
export const SESSION_COOKIE = 'fanjin_session';

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function makeRecoveryCode() {
  return randomBytes(24).toString('base64url');
}

export function getBearerToken(header: string | undefined) {
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

export function getRequestToken(req: Request) {
  const bearer = getBearerToken(req.headers.authorization);
  if (bearer) return bearer;
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return undefined;
  try { return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)); }
  catch { return undefined; }
}

export function getUserByToken(token: string | undefined): SessionUser | null {
  if (!token || token.length > 256) return null;
  return db.prepare(`SELECT users.id, users.name, users.role FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ? AND users.status = 'active'`)
    .get(hashToken(token), Date.now()) as SessionUser | undefined ?? null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: SESSION_TTL_SECONDS * 1000,
  });
  res.setHeader('Cache-Control', 'no-store');
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
  });
  res.setHeader('Cache-Control', 'no-store');
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = getUserByToken(getRequestToken(req));
  if (!user) { res.status(401).json({ message: '登录已过期，请重新登录。' }); return; }
  res.locals.user = user;
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  // Retain the legacy export while all content management follows the admin-only policy.
  requireAdmin(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireUser(req, res, () => {
    if (res.locals.user.role !== 'admin') {
      res.status(403).json({ message: '此操作需要管理员权限。' }); return;
    }
    next();
  });
}

/** Defaults to Express's trusted peer; endpoints may add a bounded account-specific key. */
export function rateLimit(limit: number, windowMs: number, keyFn?: (req: Request, res: Response) => string) {
  const windows = new Map<string, { count: number; until: number }>();
  let nextSweep = 0;
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now >= nextSweep) {
      for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
      nextSweep = now + Math.min(windowMs, 60_000);
    }
    const key = keyFn ? keyFn(req, res) : req.ip ?? req.socket.remoteAddress ?? 'unknown';
    let window = windows.get(key);
    if (!window || window.until <= now) {
      // Keep memory bounded without evicting live limits under a flood.
      if (windows.size >= 20_000 && !windows.has(key)) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ message: '请求繁忙，请稍后重试。' }); return;
      }
      window = { count: 0, until: now + windowMs };
      windows.set(key, window);
    }
    window.count += 1;
    if (window.count > limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((window.until - now) / 1000))));
      res.status(429).json({ message: '操作过于频繁，请稍后重试。' }); return;
    }
    next();
  };
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
}

export function protectOrigin(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
    const origin = req.headers.origin;
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== sameOrigin && !allowedOrigins.includes(origin)) ||
        (!origin && req.get('sec-fetch-site') === 'cross-site')) {
      res.status(403).json({ message: '请求来源不被允许。' }); return;
    }
    next();
  };
}

export function validPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

export function validName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 40 &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}
