import type { Express, Request, Response } from 'express';
import { createSession, db, hashPassword, verifyPassword } from './db.ts';
import {
  clearSessionCookie, getRequestToken, hashToken, makeRecoveryCode, rateLimit,
  requireUser, setSessionCookie, validName, validPassword, type SessionUser,
} from './security.ts';

type Account = SessionUser & { passwordHash: string; status: string; recoveryCodeHash: string | null };
const dummyPasswordHash = hashPassword(makeRecoveryCode());
const registrationLimit = Number(process.env.AUTH_REGISTER_LIMIT ?? 10);
if (!Number.isInteger(registrationLimit) || registrationLimit < 1 || registrationLimit > 600) {
  throw new Error('AUTH_REGISTER_LIMIT 必须为 1–600 的整数。');
}

// The current SNI gateway shares a network peer across visitors. Keep per-account
// protection independent while the global API limiter still bounds aggregate load.
function accountRateKey(req: Request) {
  const name = typeof req.body?.name === 'string' && req.body.name.length <= 40 ? req.body.name.trim() : '<invalid>';
  const peer = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${peer}:${hashToken(name)}`;
}
function userRateKey(_req: Request, res: Response) {
  return `user:${(res.locals.user as SessionUser).id}`;
}

function accountByName(name: string) {
  return db.prepare(`SELECT id, name, role, status, password_hash as passwordHash,
    recovery_code_hash as recoveryCodeHash FROM users WHERE name = ?`).get(name) as Account | undefined;
}

function authenticated(res: Response, user: SessionUser, extra: Record<string, unknown> = {}) {
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role }, ...extra });
}

export function registerAuthRoutes(app: Express) {
  app.use('/api/auth', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  app.post('/api/auth/login', rateLimit(30, 15 * 60_000, accountRateKey), (req, res) => {
    const { name, password } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 40 ||
        typeof password !== 'string' || !password || password.length > 128) {
      res.status(400).json({ message: '请输入有效账号与密码。' }); return;
    }
    const user = accountByName(name.trim());
    const matches = verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);
    if (!user || !matches || user.status !== 'active') {
      res.status(401).json({ message: '账号或密码错误，或账号已停用。' }); return;
    }
    authenticated(res, user);
  });

  app.post('/api/auth/register', rateLimit(registrationLimit, 60 * 60_000), (req, res) => {
    const { name, password } = req.body;
    if (!validName(name) || !validPassword(password)) {
      res.status(400).json({ message: '账号需 2–40 个字符，密码需 8–128 个字符。' }); return;
    }
    const normalizedName = name.trim();
    if (accountByName(normalizedName)) {
      res.status(409).json({ message: '该账号名称已存在。' }); return;
    }
    const recoveryCode = makeRecoveryCode();
    const inserted = db.prepare(`INSERT INTO users (name, password_hash, role, recovery_code_hash)
      VALUES (?, ?, 'user', ?)`).run(normalizedName, hashPassword(password), hashToken(recoveryCode));
    authenticated(res, { id: Number(inserted.lastInsertRowid), name: normalizedName, role: 'user' }, { recoveryCode });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = getRequestToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.put('/api/me/password', requireUser, rateLimit(15, 15 * 60_000, userRateKey), (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128 || !validPassword(newPassword)) {
      res.status(400).json({ message: '请输入当前密码，新密码需 8–128 个字符。' }); return;
    }
    const user = res.locals.user as SessionUser;
    const account = accountByName(user.name)!;
    if (!verifyPassword(currentPassword, account.passwordHash)) {
      res.status(401).json({ message: '当前密码不正确。' }); return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({ message: '新密码不能与当前密码相同。' }); return;
    }
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    })();
    authenticated(res, user, { ok: true });
  });

  app.post('/api/me/recovery-code', requireUser, rateLimit(10, 15 * 60_000, userRateKey), (req, res) => {
    const { currentPassword } = req.body;
    const user = res.locals.user as SessionUser;
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128 ||
        !verifyPassword(currentPassword, accountByName(user.name)!.passwordHash)) {
      res.status(401).json({ message: '当前密码不正确。' }); return;
    }
    const recoveryCode = makeRecoveryCode();
    db.prepare('UPDATE users SET recovery_code_hash = ? WHERE id = ?').run(hashToken(recoveryCode), user.id);
    res.json({ recoveryCode });
  });

  app.post('/api/auth/recover', rateLimit(10, 15 * 60_000, accountRateKey), (req, res) => {
    const { name, recoveryCode, newPassword } = req.body;
    if (!validName(name) || !validPassword(newPassword) || typeof recoveryCode !== 'string' || recoveryCode.length > 128) {
      res.status(400).json({ message: '请填写账号、恢复码及 8–128 位新密码。' }); return;
    }
    const user = accountByName(name.trim());
    if (!user || user.status !== 'active' || !user.recoveryCodeHash || user.recoveryCodeHash !== hashToken(recoveryCode.trim())) {
      res.status(401).json({ message: '账号或恢复码不正确，或账号已停用。' }); return;
    }
    const nextRecoveryCode = makeRecoveryCode();
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ?, recovery_code_hash = ? WHERE id = ?')
        .run(hashPassword(newPassword), hashToken(nextRecoveryCode), user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    })();
    clearSessionCookie(res);
    res.json({ ok: true, recoveryCode: nextRecoveryCode });
  });
}
