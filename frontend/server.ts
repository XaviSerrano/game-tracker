import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { IgdbService } from './server/igdb.ts';
import { Activity, User, UserGame, CustomList, Review } from './src/types.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
const MIN_PASSWORD_LENGTH = 8;
const DEMO_ACCOUNT_PASSWORD = 'demo1234';

app.use(express.json());

// --- AUTENTICACI�N MIDDLEWARE ---
interface AuthenticatedRequest extends express.Request {
  currUser?: User;
  authToken?: string;
}

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => ({
  passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'),
  passwordSalt: salt
});

const verifyPassword = (password: string, passwordHash?: string, passwordSalt?: string) => {
  if (!passwordHash || !passwordSalt) return false;
  const computedHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(passwordHash, 'hex'));
};

const createSessionToken = (userId: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.createSession(userId, token, new Date(Date.now() + SESSION_TTL_MS).toISOString());
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

  console.warn('SMTP no configurado. Los emails de recuperaci�n se registrar�n en consola para entorno local.');
  return {
    transport: nodemailer.createTransport({ jsonTransport: true }),
    from,
    configured: false
  };
};

const authMailer = createAuthMailer();

const buildResetUrl = (req: express.Request, token: string) => {
  const host = req.get('host');
  return `${req.protocol}://${host}/?resetToken=${encodeURIComponent(token)}`;
};

const sendPasswordResetEmail = async (req: express.Request, user: User, rawToken: string) => {
  const resetUrl = buildResetUrl(req, rawToken);
  const info = await authMailer.transport.sendMail({
    from: authMailer.from,
    to: user.email,
    subject: 'Recupera tu contrase�a de GameTracker',
    text: `Hola ${user.username},\n\nHemos recibido una solicitud para restablecer tu contrase�a. Usa este enlace:\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje. El enlace caduca en 1 hora.`,
    html: `<p>Hola <strong>${user.username}</strong>,</p><p>Hemos recibido una solicitud para restablecer tu contrase�a.</p><p><a href="${resetUrl}">Restablecer contrase�a</a></p><p>Si no solicitaste este cambio, ignora este mensaje. El enlace caduca en 1 hora.</p>`
  });

  if (!authMailer.configured) {
    console.info('Password reset email payload:', info.message);
  }

  return {
    resetUrl,
    usingDebugMailer: !authMailer.configured
  };
};

const authenticate = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autorizaci�n' });
  }

  const token = authHeader.split(' ')[1];
  const user = db.getUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesi�n inv�lida o expirada.' });
  }

  req.authToken = token;
  req.currUser = user;
  next();
};

// --- ENDPOINTS DE AUTENTICACI�N ---

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, bio, avatar } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email y contrase�a son obligatorios.' });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La contrase�a debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  const existingEmail = db.getUserByEmail(normalizedEmail);
  if (existingEmail) {
    return res.status(400).json({ error: 'El email ya est� registrado.' });
  }

  const existingUser = db.getUserByUsername(normalizedUsername);
  if (existingUser) {
    return res.status(400).json({ error: 'El nombre de usuario ya est� en uso.' });
  }

  const id = `user_${Date.now()}`;
  const newUser: User = {
    id,
    username: normalizedUsername,
    email: normalizedEmail,
    avatar: avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${normalizedUsername}`,
    bio: bio || '�Hola! Soy nuevo en GameTracker.',
    createdAt: new Date().toISOString()
  };

  const passwordData = hashPassword(password);
  db.createUser(newUser, passwordData);

  db.addActivity({
    id: `act_${Date.now()}`,
    userId: id,
    type: 'FOLLOWED',
    details: 'se uni� a GameTracker ??',
    createdAt: new Date().toISOString()
  });

  const token = createSessionToken(id);
  res.status(201).json({ user: newUser, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'El email y la contrase�a son obligatorios.' });
  }

  const authUser = db.getAuthUserByEmail(String(email).trim().toLowerCase());
  if (!authUser || !verifyPassword(password, authUser.passwordHash, authUser.passwordSalt)) {
    return res.status(401).json({ error: 'Email o contrase�a incorrectos.' });
  }

  const user = db.getUser(authUser.id)!;
  const token = createSessionToken(authUser.id);
  res.json({ user, token });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const genericResponse = {
    message: 'Si existe una cuenta con ese email, recibir�s un enlace para restablecer la contrase�a.'
  };

  const authUser = db.getAuthUserByEmail(String(email).trim().toLowerCase());
  if (!authUser) {
    return res.json(genericResponse);
  }

  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    db.savePasswordResetToken(
      authUser.id,
      hashResetToken(rawToken),
      new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString()
    );

    const { resetUrl, usingDebugMailer } = await sendPasswordResetEmail(req, db.getUser(authUser.id)!, rawToken);
    res.json({
      ...genericResponse,
      ...(usingDebugMailer ? { debugResetUrl: resetUrl } : {})
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'No se pudo enviar el correo de recuperaci�n.' });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'El token y la nueva contrase�a son obligatorios.' });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La contrase�a debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const authUser = db.getAuthUserByPasswordResetTokenHash(hashResetToken(String(token)));
  if (!authUser) {
    return res.status(400).json({ error: 'El enlace de recuperaci�n es inv�lido o ha caducado.' });
  }

  const passwordData = hashPassword(password);
  db.setUserPassword(authUser.id, passwordData.passwordHash, passwordData.passwordSalt);
  db.revokeSessionsForUser(authUser.id);
  const sessionToken = createSessionToken(authUser.id);
  const user = db.getUser(authUser.id)!;

  res.json({
    message: 'Contrase�a actualizada correctamente.',
    user,
    token: sessionToken
  });
});

app.post('/api/auth/logout', authenticate, (req: AuthenticatedRequest, res) => {
  if (req.authToken) {
    db.revokeSession(req.authToken);
  }
  res.status(204).end();
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json(req.currUser);
});

app.get('/api/auth/demo-credentials', (_req, res) => {
  res.json({ password: DEMO_ACCOUNT_PASSWORD });
});

// --- ENDPOINTS DE USUARIOS ---

// Obtener perfiles públicos
app.get('/api/users/:id', (req, res) => {
  const user = db.getUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  const followersCount = db.getFollowers(user.id).length;
  const followingCount = db.getFollowing(user.id).length;
  res.json({ ...user, followersCount, followingCount });
});

// Modificar perfil de usuario
app.put('/api/users/profile', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { username, bio, avatar } = req.body;

  if (username && username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya está tomado.' });
    }
  }

  const updated = db.updateUser(user.id, {
    username: username || user.username,
    bio: bio !== undefined ? bio : user.bio,
    avatar: avatar || user.avatar
  });

  res.json(updated);
});

// --- ENDPOINTS DE SOCIAL ---

// Feed de actividad (público o seguido)
app.get('/api/social/feed', (req, res) => {
  const userId = req.query.userId as string;
  const scope = req.query.scope as string; // 'all' or 'following'

  if (scope === 'following' && userId) {
    const following = db.getFollowing(userId);
    // Include user's own activity as well
    const feed = db.getActivities([...following, userId]);
    return res.json(feed);
  }

  const feed = db.getActivities();
  res.json(feed);
});

  app.post('/api/games/import/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
      const existing = db.getGame(id);

      if (existing) {
        return res.json(existing);
      }

      const game = await IgdbService.getGameDetails(id);

      if (!game) {
        return res.status(404).json({
          error: 'Juego no encontrado'
        });
      }

      db.saveGame(game);

      res.json(game);
    } catch (err: any) {
      res.status(500).json({
        error: err.message
      });
    }
  });

// Seguir/Dejar de seguir a un usuario
app.post('/api/social/follow/:userId', authenticate, (req: AuthenticatedRequest, res) => {
  const me = req.currUser!;
  const targetId = req.params.userId;

  if (me.id === targetId) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
  }

  const target = db.getUser(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const isFollowingNow = db.toggleFollow(me.id, target.id);

  if (isFollowingNow) {
    // Register activity
    db.addActivity({
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
app.get('/api/social/followers/:userId', (req, res) => {
  const ids = db.getFollowers(req.params.userId);
  const users = ids.map(id => db.getUser(id)).filter(Boolean);
  res.json(users);
});

app.get('/api/social/following/:userId', (req, res) => {
  const ids = db.getFollowing(req.params.userId);
  const users = ids.map(id => db.getUser(id)).filter(Boolean);
  res.json(users);
});

// --- ENDPOINTS DE VIDEOJUEGOS ---

// Descubrimiento de juegos desde IGDB
app.get('/api/games', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const genre = (req.query.genre as string) || '';
    const platform = (req.query.platform as string) || '';
    const sort = (req.query.sort as string) || 'popularity'; // rating | popularity | name | newest
    const hasSearch = search.trim().length > 0;

    let games = hasSearch
      ? await IgdbService.searchGames(search, 50)
      : (sort === 'newest'
        ? await IgdbService.getRecentGames(80)
        : await IgdbService.getPopularGames(80));

    if (genre) {
      games = games.filter(g => g.genres.some(gen => gen.toLowerCase() === genre.toLowerCase()));
    }
    if (platform) {
      games = games.filter(g => g.platforms.some(p => p.toLowerCase() === platform.toLowerCase()));
    }

    if (sort === 'rating') {
      games = [...games].sort((a, b) => {
        const ratingDifference = (b.rating || 0) - (a.rating || 0);
        if (ratingDifference !== 0) return ratingDifference;

        return (b.popularity || 0) - (a.popularity || 0);
      });
    } else if (sort === 'popularity' && hasSearch) {
      games = [...games].sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0));
    } else if (sort === 'name') {
      games = [...games].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'newest') {
      games = [...games].sort((a, b) => {
        const bTime = Date.parse(b.releaseDate);
        const aTime = Date.parse(a.releaseDate);
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      });
    }

    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar en IGDB (con fallback a local)
app.get('/api/games/igdb/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  try {
    const games = await IgdbService.searchGames(q);
    res.json(games);
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
  const userGames = db.getUserGames(userId);

  try {
    const completeLibrary = await Promise.all(userGames.map(async (ug) => {
      let game = db.getGame(ug.gameId);
      if (!game) {
        game = await IgdbService.getGameDetails(ug.gameId);
        if (game) {
          db.saveGame(game);
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
app.post('/api/library', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { gameId, status, rating, hoursPlayed, notes, startedAt, completedAt } = req.body;

  if (gameId === undefined || !status) {
    return res.status(400).json({ error: 'Campos gameId y status son requeridos.' });
  }

  // Verify game details exist
  const game = db.getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Videojuego no encontrado en el sistema. Búscalo en IGDB primero.' });
  }

  const existing = db.getUserGame(user.id, gameId);
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

  const saved = db.saveUserGame(userGame);

  // Register social Activity if status changed
  if (!existing || existing.status !== status) {
    let actionTxt = 'añadió a su biblioteca';
    if (status === 'COMPLETED') actionTxt = 'completó 🏆';
    else if (status === 'PLAYING') actionTxt = 'está jugando a 🎮';
    else if (status === 'WISHLIST') actionTxt = 'añadió a su wishlist ⭐️';
    else if (status === 'ABANDONED') actionTxt = 'abandonó ❌';
    else if (status === 'PLAYED') actionTxt = 'jugó a';

    db.addActivity({
      id: `act_${Date.now()}`,
      userId: user.id,
      type: status === 'COMPLETED' ? 'COMPLETED' : (status === 'WISHLIST' ? 'WISHLIST' : 'PLAYING'),
      gameId: game.igdbId,
      details: `${actionTxt} ${game.name}`,
      createdAt: new Date().toISOString()
    });
  }

  res.json({ ...saved, game });
});

// Eliminar de biblioteca
app.delete('/api/library/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const gameId = parseInt(req.params.id);
  if (isNaN(gameId)) {
    return res.status(400).json({ error: 'ID de juego inválido' });
  }

  const success = db.deleteUserGame(user.id, gameId);
  res.json({ success });
});

// --- ENDPOINTS DE RESEÑAS ---

// Obtener reseñas de un juego
app.get('/api/reviews/:gameId', (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const reviews = db.getReviews(gameId);
  
  // Decorar con perfiles de usuarios
  const fullReviews = reviews.map(r => {
    const author = db.getUser(r.userId);
    const tracking = db.getUserGame(r.userId, r.gameId);
    return {
      ...r,
      rating: tracking?.rating ?? 0,
      author: author || { username: 'desconocido', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=unknown' }
    };
  });

  res.json(fullReviews);
});

// Escribir reseña
app.post('/api/reviews', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const { gameId, title, content, rating } = req.body;

  if (!gameId || !title || !content) {
    return res.status(400).json({ error: 'Campos gameId, title y content son obligatorios.' });
  }

  const game = db.getGame(parseInt(gameId));
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

  db.saveReview(review);

  // Single source of truth for rating: always persist/read from UserGame.
  const existingUg = db.getUserGame(user.id, game.igdbId);
  const parsedRating = Number.parseInt(String(rating), 10);
  const normalizedRating =
    Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5
      ? parsedRating
      : (existingUg?.rating ?? 0);

  const syncedUserGame = db.saveUserGame({
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
  db.addActivity({
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
app.post('/api/reviews/:id/like', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const updatedReview = db.toggleLikeReview(req.params.id, user.id);
  if (!updatedReview) {
    return res.status(404).json({ error: 'Reseña no encontrada.' });
  }
  res.json(updatedReview);
});

// --- ENDPOINTS DE LISTAS PERSONALIZADAS ---

// Listas de todos
app.get('/api/lists', async (req, res) => {
  const userId = req.query.userId as string;
  const lists = db.getLists(userId);

  const fullLists = await Promise.all(lists.map(async (l) => {
    const author = db.getUser(l.userId);
    const gameIds = db.getListItems(l.id);
    const games = (await Promise.all(gameIds.map(async (gId) => {
      let game = db.getGame(gId);
      if (!game) {
        game = await IgdbService.getGameDetails(gId);
        if (game) {
          db.saveGame(game);
        }
      }
      return game;
    }))).filter(Boolean);

    return {
      ...l,
      author,
      games
    };
  }));

  res.json(fullLists);
});

// Detalle de lista
app.get('/api/lists/:id', async (req, res) => {
  const list = db.getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista no encontrada' });
  const author = db.getUser(list.userId);
  const gameIds = db.getListItems(list.id);
  const games = (await Promise.all(gameIds.map(async (gId) => {
    let game = db.getGame(gId);
    if (!game) {
      game = await IgdbService.getGameDetails(gId);
      if (game) {
        db.saveGame(game);
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
app.post('/api/lists', authenticate, (req: AuthenticatedRequest, res) => {
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

  db.createList(newList);

  if (gameIds && Array.isArray(gameIds)) {
    db.saveListItems(listId, gameIds.map(id => parseInt(id)));
  }

  // Register activity
  db.addActivity({
    id: `act_${Date.now()}`,
    userId: user.id,
    type: 'LIST_CREATED',
    details: `creó la lista '${name}' 📁`,
    createdAt: new Date().toISOString()
  });

  res.json(newList);
});

// Eliminar lista
app.delete('/api/lists/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  const list = db.getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista no encontrada.' });

  if (list.userId !== user.id) {
    return res.status(403).json({ error: 'No tienes permiso para borrar esta lista.' });
  }

  db.deleteList(list.id);
  res.json({ success: true });
});

// --- ENDPOINTS DE ESTADÍSTICAS ---
app.get('/api/users/:id/stats', (req, res) => {
  const stats = db.getUserStats(req.params.id);
  res.json(stats);
});

// --- ENDPOINTS DE RECOMENDACIONES INTELIGENTES ---
app.get('/api/recommendations', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.currUser!;
  IgdbService.getPopularGames(120)
    .then((popularGames) => {
      popularGames.forEach(game => db.saveGame(game));
      const recs = db.getRecommendations(user.id);
      res.json(recs);
    })
    .catch((err: any) => {
      res.status(500).json({ error: err.message });
    });
});

// --- VITE EXPRES INTERFACE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GameTracker Express Server listening on port ${PORT}`);
  });
}

startServer();


