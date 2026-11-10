import './env.ts';
import crypto from 'crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import { db, initDb } from './db.ts';
import { IgdbService } from './services/igdb.ts';
import { translateText } from './services/translate.ts';
import type { Activity, ActivityType, User, UserGame, CustomList, Review } from '../../shared/types.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_ACTIVE_SESSIONS_PER_USER = 5;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
const MIN_PASSWORD_LENGTH = 8;
const SESSION_COOKIE_NAME = 'gt_session';
const DEFAULT_AVATAR = '/default-avatar.svg';
const MAX_AVATAR_LENGTH = 200_000;
const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const configuredPublicAppUrl = process.env.PUBLIC_APP_URL?.trim();
const publicAppUrl =
  configuredPublicAppUrl || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

if (!publicAppUrl) {
  throw new Error('PUBLIC_APP_URL debe estar configurada en producción para generar enlaces de recuperación.');
}

const parsedPublicAppUrl = new URL(publicAppUrl);
if (parsedPublicAppUrl.protocol !== 'http:' && parsedPublicAppUrl.protocol !== 'https:') {
  throw new Error('PUBLIC_APP_URL debe usar el protocolo HTTP o HTTPS.');
}

app.use(express.json({ limit: '300kb' }));
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

// --- AUTENTICACIÓN MIDDLEWARE ---
interface AuthenticatedRequest extends express.Request {
  currUser?: User;
  authToken?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const authRateLimits = new Map<string, RateLimitEntry>();

const getRequestIp = (req: express.Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0 && forwardedFor[0].trim()) {
    return forwardedFor[0].split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const recordSecurityEvent = (
  req: express.Request,
  eventType: string,
  details: string,
  userId?: string | null
) => {
  // Fire-and-forget: no bloqueamos la respuesta por el registro de auditoría.
  db.addSecurityEvent({
    eventType,
    userId: userId ?? null,
    ipAddress: getRequestIp(req),
    userAgent: req.get('user-agent') || null,
    details
  }).catch((err) => {
    console.error('Error registrando evento de seguridad:', err);
  });
};

const setSessionCookie = (res: express.Response, token: string) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    'SameSite=Strict'
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
};

const clearSessionCookie = (res: express.Response) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Strict'
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
};

const getCookie = (req: express.Request, name: string) => {
  const cookies = req.headers.cookie?.split(';') || [];
  const cookie = cookies.find(value => value.trim().startsWith(`${name}=`));
  return cookie ? cookie.trim().slice(name.length + 1) : null;
};

const createRateLimiter = (
  scope: string,
  maxAttempts: number,
  windowMs: number,
  keyResolver: (req: express.Request) => string
) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${scope}:${keyResolver(req)}`;
    const now = Date.now();
    const current = authRateLimits.get(key);

    if (authRateLimits.size > 1000) {
      for (const [limitKey, entry] of authRateLimits.entries()) {
        if (entry.resetAt <= now) {
          authRateLimits.delete(limitKey);
        }
      }
    }

    if (current && current.resetAt > now) {
      if (current.count >= maxAttempts) {
        res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000).toString());
        recordSecurityEvent(req, 'AUTH_RATE_LIMITED', scope);
        return res.status(429).json({ error: 'Demasiados intentos. Vuelve a probar más tarde.' });
      }

      current.count += 1;
      next();
      return;
    }

    authRateLimits.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    next();
  };
};

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => ({
  passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'),
  passwordSalt: salt
});

const verifyPassword = (password: string, passwordHash?: string, passwordSalt?: string) => {
  if (!passwordHash || !passwordSalt) return false;
  const computedHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(passwordHash, 'hex'));
};

const createSessionToken = async (userId: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(userId, token, new Date(Date.now() + SESSION_TTL_MS).toISOString());
  await db.revokeOldestSessionsForUser(userId, MAX_ACTIVE_SESSIONS_PER_USER);
  return token;
};

const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const createAuthMailer = () => {
  const from = process.env.SMTP_FROM || 'GameTracker <no-reply@gametracker.local>';
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return {
      transport: nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass }
      }),
      from,
      configured: true
    };
  }

  console.warn('SMTP no configurado. Los emails de recuperación se registraron en consola para entorno local.');
  return {
    transport: nodemailer.createTransport({ jsonTransport: true }),
    from,
    configured: false
  };
};

const authMailer = createAuthMailer();
const loginRateLimit = createRateLimiter(
  'auth_login',
  8,
  15 * 60 * 1000,
  (req) => `${getRequestIp(req)}:${normalizeEmail((req.body as { email?: unknown } | undefined)?.email)}`
);
const registerRateLimit = createRateLimiter(
  'auth_register',
  5,
  60 * 60 * 1000,
  (req) => getRequestIp(req)
);
const forgotPasswordRateLimit = createRateLimiter(
  'auth_forgot_password',
  3,
  60 * 60 * 1000,
  (req) => `${getRequestIp(req)}:${normalizeEmail((req.body as { email?: unknown } | undefined)?.email)}`
);
const resetPasswordRateLimit = createRateLimiter(
  'auth_reset_password',
  5,
  60 * 60 * 1000,
  (req) => getRequestIp(req)
);

const buildResetUrl = (token: string) => {
  const resetUrl = new URL('/', parsedPublicAppUrl);
  resetUrl.searchParams.set('resetToken', token);
  return resetUrl.toString();
};

const sendPasswordResetEmail = async (user: User, rawToken: string) => {
  const resetUrl = buildResetUrl(rawToken);
  await authMailer.transport.sendMail({
    from: authMailer.from,
    to: user.email,
    subject: 'Recupera tu contraseña de GameTracker',
    text: `Hola ${user.username},\n\nHemos recibido una solicitud para restablecer tu contraseña. Usa este enlace:\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje. El enlace caduca en 1 hora.`,
    html: `<p>Hola <strong>${user.username}</strong>,</p><p>Hemos recibido una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Si no solicitaste este cambio, ignora este mensaje. El enlace caduca en 1 hora.</p>`
  });

  if (!authMailer.configured) {
    console.info('Password reset email payload prepared in debug mode.');
  }

  return {
    resetUrl,
    usingDebugMailer: !authMailer.configured
  };
};

const authenticate = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = getCookie(req, SESSION_COOKIE_NAME) || bearerToken;
  if (!token) {
    return res.status(401).json({ error: 'Falta token de autorización' });
  }

  const user = await db.getUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }

  req.authToken = token;
  req.currUser = user;
  next();
};

// --- ENDPOINTS DE AUTENTICACIÓN ---

app.post('/api/auth/register', registerRateLimit, async (req, res) => {
  const { username, email, password, bio } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email y contraseña son obligatorios.' });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  const existingEmail = await db.getUserByEmail(normalizedEmail);
  if (existingEmail) {
    return res.status(400).json({ error: 'El email ya está registrado.' });
  }

  const existingUser = await db.getUserByUsername(normalizedUsername);
  if (existingUser) {
    return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
  }

  const id = `user_${Date.now()}`;
  const newUser: User = {
    id,
    username: normalizedUsername,
    email: normalizedEmail,
    avatar: DEFAULT_AVATAR,
    bio: bio || 'Hola! Soy nuevo en GameTracker.',
    createdAt: new Date().toISOString()
  };

  const passwordData = hashPassword(password);
  await db.createUser(newUser, passwordData);

  await db.addActivity({
    id: `act_${Date.now()}`,
    userId: id,
    type: 'FOLLOWED',
    details: 'se unió a GameTracker 🎮',
    createdAt: new Date().toISOString()
  });

  const token = await createSessionToken(id);
  setSessionCookie(res, token);
  recordSecurityEvent(req, 'REGISTRATION_SUCCESS', 'account_created', id);
  res.status(201).json({ user: newUser });
});

app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
  }

  const authUser = await db.getAuthUserByEmail(String(email).trim().toLowerCase());
  if (!authUser || !verifyPassword(password, authUser.passwordHash, authUser.passwordSalt)) {
    recordSecurityEvent(req, 'LOGIN_FAILED', 'invalid_credentials');
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }

  const user = (await db.getUser(authUser.id))!;
  const token = await createSessionToken(authUser.id);
  setSessionCookie(res, token);
  recordSecurityEvent(req, 'LOGIN_SUCCESS', 'session_created', authUser.id);
  res.json({ user });
});

app.post('/api/auth/forgot-password', forgotPasswordRateLimit, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const genericResponse = {
    message: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.'
  };

  const authUser = await db.getAuthUserByEmail(String(email).trim().toLowerCase());
  if (!authUser) {
    return res.json(genericResponse);
  }

  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await db.savePasswordResetToken(
      authUser.id,
      hashResetToken(rawToken),
      new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString()
    );

    const authUserForEmail = (await db.getUser(authUser.id))!;
    const { resetUrl, usingDebugMailer } = await sendPasswordResetEmail(authUserForEmail, rawToken);
    recordSecurityEvent(req, 'PASSWORD_RESET_REQUESTED', 'email_sent', authUser.id);
    res.json({
      ...genericResponse,
      ...(usingDebugMailer && process.env.NODE_ENV !== 'production' ? { debugResetUrl: resetUrl } : {})
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'No se pudo enviar el correo de recuperación.' });
  }
});

app.post('/api/auth/reset-password', resetPasswordRateLimit, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'El token y la nueva contraseña son obligatorios.' });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const authUser = await db.getAuthUserByPasswordResetTokenHash(hashResetToken(String(token)));
  if (!authUser) {
    recordSecurityEvent(req, 'PASSWORD_RESET_FAILED', 'invalid_or_expired_token');
    return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha caducado.' });
  }

  const passwordData = hashPassword(password);
  await db.setUserPassword(authUser.id, passwordData.passwordHash, passwordData.passwordSalt);
  await db.revokeSessionsForUser(authUser.id);
  const sessionToken = await createSessionToken(authUser.id);
  const user = (await db.getUser(authUser.id))!;
  setSessionCookie(res, sessionToken);
  recordSecurityEvent(req, 'PASSWORD_RESET_COMPLETED', 'password_updated', authUser.id);

  res.json({
    message: 'Contraseña actualizada correctamente.',
    user
  });
});

app.post('/api/auth/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  if (req.authToken) {
    await db.revokeSession(req.authToken);
  }
  if (req.currUser) {
    recordSecurityEvent(req, 'LOGOUT', 'session_revoked', req.currUser.id);
  }
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json(req.currUser);
});


// --- ENDPOINTS DE USUARIOS ---

// Obtener perfiles públicos
app.get('/api/users', async (req, res) => {
  const query = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (!query) return res.json([]);

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = getCookie(req, SESSION_COOKIE_NAME) || bearerToken;
  const currentUser = token ? await db.getUserBySessionToken(token) : null;

  const users = await db.searchUsersByUsername(query);
  res.json(currentUser ? users.filter(user => user.id !== currentUser.id) : users);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  const followersCount = (await db.getFollowers(user.id)).length;
  const followingCount = (await db.getFollowing(user.id)).length;
  res.json({ ...user, followersCount, followingCount });
});

// Modificar perfil de usuario
app.put('/api/users/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { username, bio, avatar } = req.body;

  if (avatar !== undefined && avatar !== '') {
    if (
      typeof avatar !== 'string' ||
      avatar.length > MAX_AVATAR_LENGTH ||
      (avatar !== DEFAULT_AVATAR && !AVATAR_DATA_URL.test(avatar))
    ) {
      return res.status(400).json({ error: 'La imagen de perfil no es válida (PNG, JPG o WebP, máx. 150 KB).' });
    }
  }
  if (username && username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = await db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya está tomado.' });
    }
  }

  const updated = await db.updateUser(user.id, {
    username: username || user.username,
    bio: bio !== undefined ? bio : user.bio,
    avatar: avatar || user.avatar
  });

  res.json(updated);
});

// --- ENDPOINTS DE SOCIAL ---

// Feed de actividad (público o seguido)
app.get('/api/social/feed', async (req, res) => {
  const userId = req.query.userId as string;
  const scope = req.query.scope as string; // 'all' or 'following'

  const withUsers = async (activities: Activity[]) => Promise.all(activities.map(async (activity) => ({
    ...activity,
    author: await db.getUser(activity.userId),
    targetUser: activity.targetUserId ? await db.getUser(activity.targetUserId) : null
  })));

  if (scope === 'following' && userId) {
    const following = await db.getFollowing(userId);
    // Include user's own activity as well
    const feed = await db.getActivities([...following, userId]);
    return res.json(await withUsers(feed));
  }

  const feed = await db.getActivities();
  res.json(await withUsers(feed));
});

  app.post('/api/games/import/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
      const existing = await db.getGame(id);

      if (existing) {
        return res.json(existing);
      }

      const game = await IgdbService.getGameDetails(id);

      if (!game) {
        return res.status(404).json({
          error: 'Juego no encontrado'
        });
      }

      await db.saveGame(game);

      res.json(game);
    } catch (err: any) {
      res.status(500).json({
        error: err.message
      });
    }
  });

// Seguir/Dejar de seguir a un usuario
app.post('/api/social/follow/:userId', authenticate, async (req: AuthenticatedRequest, res) => {
  const me = req.currUser!;
  const targetId = req.params.userId;

  if (me.id === targetId) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
  }

  const target = await db.getUser(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const isFollowingNow = await db.toggleFollow(me.id, target.id);

  if (isFollowingNow) {
    // Register activity
    await db.addActivity({
      id: `act_${Date.now()}`,
      userId: me.id,
      type: 'FOLLOWED',
      targetUserId: target.id,
      details: `@${me.username} comenzó a seguir a @${target.username}`,
      createdAt: new Date().toISOString()
    });
  }

  res.json({ following: isFollowingNow });
});

// Listas de seguidores/seguidos
app.get('/api/social/followers/:userId', async (req, res) => {
  const ids = await db.getFollowers(req.params.userId);
  const users = (await Promise.all(ids.map(id => db.getUser(id)))).filter(Boolean);
  res.json(users);
});

app.get('/api/social/following/:userId', async (req, res) => {
  const ids = await db.getFollowing(req.params.userId);
  const users = (await Promise.all(ids.map(id => db.getUser(id)))).filter(Boolean);
  res.json(users);
});

// --- ENDPOINTS DE VIDEOJUEGOS ---

const parseIdList = (value: unknown): number[] | null => {
  if (typeof value !== 'string' || !value.trim()) return [];
  const ids = value.split(',').map(part => Number.parseInt(part, 10));
  return ids.every(id => Number.isSafeInteger(id) && id > 0) ? [...new Set(ids)] : null;
};

app.get('/api/discover/home', async (_req, res) => {
  try {
    res.json(await IgdbService.getDiscoverHome());
  } catch (err: any) {
    console.error('Error loading Discover home:', err);
    const limited = typeof err?.message === 'string' && err.message.includes('(429)');
    res.status(limited ? 429 : 502).json({
      error: limited ? 'IGDB está temporalmente saturada. Inténtalo de nuevo en unos segundos.' : 'No se pudo cargar el catálogo de IGDB.'
    });
  }
});

app.get('/api/discover/popular', async (req, res) => {
  const rawPage = req.query.page === undefined ? '0' : req.query.page;
  if (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage) || !Number.isSafeInteger(Number(rawPage)) || Number(rawPage) > 33) {
    return res.status(400).json({ error: 'La página de juegos populares no es válida.' });
  }

  const page = Number(rawPage);
  const limit = 15;
  try {
    const games = await IgdbService.getPopularNow(500);
    const start = page * limit;
    res.json({ items: games.slice(start, start + limit), page, hasMore: start + limit < games.length });
  } catch (err: any) {
    console.error('Error loading popular games:', err);
    const limited = typeof err?.message === 'string' && err.message.includes('(429)');
    res.status(limited ? 429 : 502).json({
      error: limited ? 'IGDB está temporalmente saturada. Inténtalo de nuevo en unos segundos.' : 'No se pudieron cargar los juegos populares de IGDB.'
    });
  }
});

app.get('/api/games/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const genreIds = parseIdList(req.query.genres);
  const platformIds = parseIdList(req.query.platforms);
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'relevance';
  const page = Number.parseInt(typeof req.query.page === 'string' ? req.query.page : '0', 10);
  const limit = Number.parseInt(typeof req.query.limit === 'string' ? req.query.limit : '20', 10);
  const yearFrom = req.query.yearFrom === undefined ? undefined : Number.parseInt(String(req.query.yearFrom), 10);
  const yearTo = req.query.yearTo === undefined ? undefined : Number.parseInt(String(req.query.yearTo), 10);
  const minRating = req.query.minRating === undefined ? undefined : Number.parseFloat(String(req.query.minRating));
  const allowedSorts = ['relevance', 'newest', 'rating', 'popularity'];

  if (!genreIds || !platformIds) {
    return res.status(400).json({ error: 'Los filtros de género y plataforma deben ser IDs numéricos.' });
  }
  if (!allowedSorts.includes(sort)) {
    return res.status(400).json({ error: 'Orden de búsqueda no válido.' });
  }
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(limit) || limit < 1 || limit > 60) {
    return res.status(400).json({ error: 'La página o el límite de resultados no son válidos.' });
  }
  if ((yearFrom !== undefined && (!Number.isInteger(yearFrom) || yearFrom < 1950 || yearFrom > 2100))
    || (yearTo !== undefined && (!Number.isInteger(yearTo) || yearTo < 1950 || yearTo > 2100))
    || (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo)) {
    return res.status(400).json({ error: 'El rango de años no es válido.' });
  }
  if (minRating !== undefined && (!Number.isFinite(minRating) || minRating < 0 || minRating > 100)) {
    return res.status(400).json({ error: 'La valoración mínima debe estar entre 0 y 100.' });
  }

  try {
    const result = await IgdbService.searchCatalog({
      query,
      genreIds,
      platformIds,
      yearFrom,
      yearTo,
      minRating,
      sort: sort as 'relevance' | 'newest' | 'rating' | 'popularity',
      page,
      limit
    });
    res.json(result);
  } catch (err: any) {
    console.error('Error searching IGDB catalog:', err);
    const limited = typeof err?.message === 'string' && err.message.includes('(429)');
    res.status(limited ? 429 : 502).json({
      error: limited ? 'IGDB está temporalmente saturada. Inténtalo de nuevo en unos segundos.' : 'No se pudo consultar el catálogo de IGDB.'
    });
  }
});

app.get('/api/games', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const genreIds = parseIdList(req.query.genre);
  const platformIds = parseIdList(req.query.platform);
  const limit = Math.min(60, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = Math.max(0, Number.parseInt(String(req.query.offset || '0'), 10) || 0);
  try {
    const result = await IgdbService.searchCatalog({
      query: search,
      genreIds: genreIds || [],
      platformIds: platformIds || [],
      sort: req.query.sort === 'newest' ? 'newest'
        : req.query.sort === 'rating' ? 'rating'
          : req.query.sort === 'name' ? 'name'
            : 'popularity',
      page: Math.floor(offset / limit),
      limit
    });
    res.json(result.items);
  } catch (err: any) {
    console.error('Error loading game catalog:', err);
    res.status(502).json({ error: 'No se pudo consultar el catálogo de IGDB.' });
  }
});

app.get('/api/games/igdb/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  try {
    const games = await IgdbService.searchGames(q);
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/igdb/genres', async (_req, res) => {
  try {
    res.json(await IgdbService.getGenreOptions());
  } catch (err) {
    console.error('Error loading IGDB genres:', err);
    res.status(502).json({ error: 'No se pudieron cargar los géneros de IGDB.' });
  }
});

app.get('/api/igdb/platforms', async (_req, res) => {
  try {
    res.json(await IgdbService.getPlatformOptions());
  } catch (err) {
    console.error('Error loading IGDB platforms:', err);
    res.status(502).json({ error: 'No se pudieron cargar las plataformas de IGDB.' });
  }
});

app.get('/api/games/genres', async (req, res) => {
  try {
    const genres = await IgdbService.getGenres();
    res.json(genres);
  } catch (err: any) {
    console.error('Error loading genres:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los géneros.'
    });
  }
});

// Enlaces directos de tiendas para un juego
app.get('/api/games/:id/stores', async (req, res) => {
  const idNum = parseInt(req.params.id);
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID de juego inválido' });
  }

  try {
    res.json(await IgdbService.getStoreLinks(idNum));
  } catch (err: any) {
    console.error('Store links failed:', err);
    res.json({});
  }
});

// Descripción traducida de un juego (IGDB solo ofrece resúmenes en inglés)
app.get('/api/games/:id/summary', async (req, res) => {
  const idNum = parseInt(req.params.id);
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID de juego inválido' });
  }

  const lang = req.query.lang === 'es' ? 'es' : null;

  try {
    const game = await IgdbService.getGameDetails(idNum);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const summary = game.summary?.trim() ?? '';
    if (!lang || !summary || summary === 'No summary available.') {
      return res.json({ summary: game.summary ?? '', translated: false });
    }

    try {
      res.json({ summary: await translateText(summary, lang, `${idNum}:${summary.length}`), translated: true });
    } catch (err) {
      console.error('Summary translation failed:', err);
      res.json({ summary: game.summary, translated: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Detalle de juego individual (IGDB/Local)
app.get('/api/games/:id', async (req, res) => {
  const idNum = parseInt(req.params.id);
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID de juego inválido' });
  }

  try {
    const game = await IgdbService.getGameDetails(idNum);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    res.json(game);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ENDPOINTS DE BIBLIOTECA (USERGAMES) ---

// Biblioteca de un usuario
app.get('/api/users/:id/library', async (req, res) => {
  const userId = req.params.id;
  const userGames = await db.getUserGames(userId);

  try {
    const completeLibrary = await Promise.all(userGames.map(async (ug) => {
      let game = await db.getGame(ug.gameId);
      if (!game) {
        game = await IgdbService.getGameDetails(ug.gameId);
        if (game) {
          await db.saveGame(game);
        }
      }

      return {
        ...ug,
        game: game || {
          igdbId: ug.gameId,
          name: `Juego #${ug.gameId}`,
          slug: 'unknown',
          cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg',
          summary: 'Detalles desconocidos.',
          genres: [],
          platforms: [],
          releaseDate: ''
        }
      };
    }));

    res.json(completeLibrary);
  } catch (err: any) {
    console.error('Error loading library for user', userId, err);
    res.status(500).json({ error: err.message });
  }
});

// Guardar o cambiar estado de progreso/puntuación
app.post('/api/library', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { gameId, status, rating, hoursPlayed, notes, startedAt, completedAt } = req.body;

  if (gameId === undefined || !status) {
    return res.status(400).json({ error: 'Campos gameId y status son requeridos.' });
  }

  // Verify game details exist
  const game = await db.getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Videojuego no encontrado en el sistema. Búscalo en IGDB primero.' });
  }

  const existing = await db.getUserGame(user.id, gameId);
  const userGame: UserGame = {
    userId: user.id,
    gameId: parseInt(gameId),
    status,
    rating: rating !== undefined ? parseInt(rating) : (existing ? existing.rating : 0),
    hoursPlayed: hoursPlayed !== undefined ? parseFloat(hoursPlayed) : (existing ? existing.hoursPlayed : 0),
    notes: notes !== undefined ? notes : (existing ? existing.notes : ''),
    startedAt: startedAt !== undefined ? startedAt : (existing ? existing.startedAt : null),
    completedAt: completedAt !== undefined ? completedAt : (existing ? existing.completedAt : null),
    updatedAt: new Date().toISOString()
  };

  const saved = await db.saveUserGame(userGame);

  // Register social Activity if status changed
  if (!existing || existing.status !== status) {
    let actionTxt = 'añadió a su biblioteca';
    if (status === 'COMPLETED') actionTxt = 'completó 🏆';
    else if (status === 'PLAYING') actionTxt = 'está jugando a 🎮';
    else if (status === 'WISHLIST') actionTxt = 'añadió a su wishlist ⭐️';
    else if (status === 'ABANDONED') actionTxt = 'abandonó ❌';
    else if (status === 'PLAYED') actionTxt = 'jugó a';

    await db.addActivity({
      id: `act_${Date.now()}`,
      userId: user.id,
      type: status as ActivityType,
      gameId: game.igdbId,
      details: `${actionTxt} ${game.name}`,
      createdAt: new Date().toISOString()
    });
  }

  res.json({ ...saved, game });
});

// Eliminar de biblioteca
app.delete('/api/library/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const gameId = parseInt(req.params.id);
  if (isNaN(gameId)) {
    return res.status(400).json({ error: 'ID de juego inválido' });
  }

  const success = await db.deleteUserGame(user.id, gameId);
  res.json({ success });
});

// --- ENDPOINTS DE RESEÑAS ---

// Obtener reseñas de un juego
app.get('/api/reviews/:gameId', async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const reviews = await db.getReviews(gameId);

  // Decorar con perfiles de usuarios
  const fullReviews = await Promise.all(reviews.map(async r => {
    const author = await db.getUser(r.userId);
    const tracking = await db.getUserGame(r.userId, r.gameId);
    return {
      ...r,
      rating: tracking?.rating ?? 0,
      author: author || { username: 'desconocido', avatar: DEFAULT_AVATAR }
    };
  }));

  res.json(fullReviews);
});

// Escribir reseña
app.post('/api/reviews', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { gameId, title, content, rating } = req.body;

  if (!gameId || !title || !content) {
    return res.status(400).json({ error: 'Campos gameId, title y content son obligatorios.' });
  }

  const game = await db.getGame(parseInt(gameId));
  if (!game) {
    return res.status(444).json({ error: 'El juego debe existir.' });
  }

  const review: Review = {
    id: `rev_${Date.now()}`,
    userId: user.id,
    gameId: parseInt(gameId),
    title,
    content,
    likes: [],
    createdAt: new Date().toISOString()
  };

  await db.saveReview(review);

  // Single source of truth for rating: always persist/read from UserGame.
  const existingUg = await db.getUserGame(user.id, game.igdbId);
  const parsedRating = Number.parseInt(String(rating), 10);
  const normalizedRating =
    Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5
      ? parsedRating
      : (existingUg?.rating ?? 0);

  const syncedUserGame = await db.saveUserGame({
    userId: user.id,
    gameId: game.igdbId,
    status: existingUg ? existingUg.status : 'PLAYED',
    rating: normalizedRating,
    hoursPlayed: existingUg ? existingUg.hoursPlayed : 0,
    notes: existingUg ? existingUg.notes : '',
    startedAt: existingUg ? existingUg.startedAt : null,
    completedAt: existingUg ? existingUg.completedAt : null,
    updatedAt: new Date().toISOString()
  });

  // Register social activity
  await db.addActivity({
    id: `act_${Date.now()}`,
    userId: user.id,
    type: 'REVIEWED',
    gameId: game.igdbId,
    details: `reseñó ${game.name}: "${title}" (${syncedUserGame.rating > 0 ? syncedUserGame.rating : 'sin'} ⭐)`,
    createdAt: new Date().toISOString()
  });

  res.json(review);
});

// Dar like/Quitar like a reseña
app.post('/api/reviews/:id/like', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const updatedReview = await db.toggleLikeReview(req.params.id, user.id);
  if (!updatedReview) {
    return res.status(404).json({ error: 'Reseña no encontrada.' });
  }
  res.json(updatedReview);
});

// --- ENDPOINTS DE LISTAS PERSONALIZADAS ---

// Listas públicas, opcionalmente filtradas por creador.
app.get(
  '/api/lists',
  async (req, res) => {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const lists = await db.getLists(userId);

      const fullLists = await Promise.all(
        lists.map(async (list) => {
          const author = await db.getUser(list.userId);
          const gameIds = await db.getListItems(list.id);

          const games = (
            await Promise.all(
              gameIds.map(async (gameId) => {
                let game = await db.getGame(gameId);

                if (!game) {
                  game = await IgdbService.getGameDetails(gameId);

                  if (game) {
                    await db.saveGame(game);
                  }
                }

                return game;
              })
            )
          ).filter(Boolean);

          return {
            ...list,
            author,
            games
          };
        })
      );

      res.json(fullLists);
    } catch (error) {
      console.error('Error obteniendo las listas:', error);

      res.status(500).json({
        error: 'No se pudieron cargar las listas.'
      });
    }
  }
);

// Actualizar lista
app.put('/api/lists/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const listId = req.params.id;
  const { name, description, gameIds } = req.body;

  const list = await db.getList(listId);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada.' });
  }

  if (list.userId !== user.id) {
    return res.status(403).json({
      error: 'No tienes permiso para editar esta lista.'
    });
  }

  const updatedList = await db.updateList(listId, {
    name: name !== undefined ? name : list.name,
    description: description !== undefined
      ? description
      : list.description
  });

  if (gameIds && Array.isArray(gameIds)) {
    await db.saveListItems(
      listId,
      gameIds.map(id => parseInt(id))
    );
  }

  res.json(updatedList);
});

// Detalle público de lista.
app.get('/api/lists/:id', async (req, res) => {
  const list = await db.getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista no encontrada' });
  const author = await db.getUser(list.userId);
  const gameIds = await db.getListItems(list.id);
  const games = (await Promise.all(gameIds.map(async (gId) => {
    let game = await db.getGame(gId);
    if (!game) {
      game = await IgdbService.getGameDetails(gId);
      if (game) {
        await db.saveGame(game);
      }
    }
    return game;
  }))).filter(Boolean);

  res.json({
    ...list,
    author,
    games
  });
});

// Crear lista
app.post('/api/lists', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { name, description, gameIds } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre de la lista es obligatorio.' });
  }

  const listId = `list_${Date.now()}`;
  const newList: CustomList = {
    id: listId,
    userId: user.id,
    name,
    description: description || '',
    createdAt: new Date().toISOString()
  };

  await db.createList(newList);

  if (gameIds && Array.isArray(gameIds)) {
    await db.saveListItems(listId, gameIds.map(id => parseInt(id)));
  }

  // Register activity
  await db.addActivity({
    id: `act_${Date.now()}`,
    userId: user.id,
    type: 'LIST_CREATED',
    details: `creó la lista '${name}' 📁`,
    createdAt: new Date().toISOString()
  });

  res.json(newList);
});

// Eliminar lista
app.delete('/api/lists/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const list = await db.getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista no encontrada.' });

  if (list.userId !== user.id) {
    return res.status(403).json({ error: 'No tienes permiso para borrar esta lista.' });
  }

  await db.deleteList(list.id);
  res.json({ success: true });
});

// --- ENDPOINTS DE ESTADÍSTICAS ---
app.get('/api/users/:id/stats', async (req, res) => {
  try {
    const stats = await db.getUserStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error(
      '❌ Error obteniendo estadísticas:',
      error
    );

    res.status(500).json({
      error: 'No se pudieron calcular las estadísticas.'
    });
  }
});

async function startServer() {
  await initDb();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GameTracker Express Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err);
  process.exit(1);
});
