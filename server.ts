import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { IgdbService } from './server/igdb.ts';
import { Activity, User, UserGame, CustomList, Review } from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- AUTENTICACIÓN MIDDLEWARE ---
interface AuthenticatedRequest extends express.Request {
  currUser?: User;
}

const authenticate = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autorización' });
  }
  const userId = authHeader.split(' ')[1];
  const user = db.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado o no autorizado' });
  }
  req.currUser = user;
  next();
};

// --- ENDPOINTS DE AUTENTICACIÓN ---

// Registrarse
app.post('/api/auth/register', (req, res) => {
  const { username, email, bio, avatar } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username y email son obligatorios.' });
  }

  const existingEmail = db.getUserByEmail(email);
  if (existingEmail) {
    return res.status(400).json({ error: 'El email ya está registrado.' });
  }

  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
  }

  const id = `user_${Date.now()}`;
  const newUser: User = {
    id,
    username,
    email,
    avatar: avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
    bio: bio || '¡Hola! Soy nuevo en GameTracker.',
    createdAt: new Date().toISOString()
  };

  db.createUser(newUser);

  // Auto activity
  db.addActivity({
    id: `act_${Date.now()}`,
    userId: id,
    type: 'FOLLOWED',
    details: 'se unió a GameTracker 🎉',
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ user: newUser, token: id });
});

// Iniciar sesión
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  res.json({ user, token: user.id });
});

// Obtener usuario actual
app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json(req.currUser);
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

// Descubrimiento & Lista de juegos locales
app.get('/api/games', (req, res) => {
  let games = db.getGames();

  // Filtros query
  const search = req.query.search as string;
  const genre = req.query.genre as string;
  const platform = req.query.platform as string;
  const sort = req.query.sort as string; // 'rating' | 'popularity' | 'name' | 'newest'

  if (search) {
    const q = search.toLowerCase();
    games = games.filter(g => g.name.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q));
  }
  if (genre) {
    games = games.filter(g => g.genres.some(gen => gen.toLowerCase() === genre.toLowerCase()));
  }
  if (platform) {
    games = games.filter(g => g.platforms.some(p => p.toLowerCase() === platform.toLowerCase()));
  }

  // Ordenar
  if (sort === 'rating') {
    games = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'popularity') {
    games = [...games].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  } else if (sort === 'name') {
    games = [...games].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'newest') {
    games = [...games].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }

  res.json(games);
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
app.get('/api/users/:id/library', (req, res) => {
  const userId = req.params.id;
  const userGames = db.getUserGames(userId);
  
  // Enlazar los detalles completos del videojuego
  const completeLibrary = userGames.map(ug => {
    const g = db.getGame(ug.gameId);
    return {
      ...ug,
      game: g || {
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
  });

  res.json(completeLibrary);
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
    return {
      ...r,
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

  // If rating is passed, ensure it is saved inside user's library as well
  if (rating) {
    const existingUg = db.getUserGame(user.id, game.igdbId);
    db.saveUserGame({
      userId: user.id,
      gameId: game.igdbId,
      status: existingUg ? existingUg.status : 'PLAYED',
      rating: parseInt(rating),
      hoursPlayed: existingUg ? existingUg.hoursPlayed : 0,
      notes: existingUg ? existingUg.notes : '',
      startedAt: existingUg ? existingUg.startedAt : null,
      completedAt: existingUg ? existingUg.completedAt : null,
      updatedAt: new Date().toISOString()
    });
  }

  // Register social activity
  db.addActivity({
    id: `act_${Date.now()}`,
    userId: user.id,
    type: 'REVIEWED',
    gameId: game.igdbId,
    details: `reseñó ${game.name}: "${title}" (${rating ? rating : 'sin'} ⭐)`,
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
app.get('/api/lists', (req, res) => {
  const userId = req.query.userId as string;
  const lists = db.getLists(userId);

  const fullLists = lists.map(l => {
    const author = db.getUser(l.userId);
    const gameIds = db.getListItems(l.id);
    const games = gameIds.map(gId => db.getGame(gId)).filter(Boolean);
    return {
      ...l,
      author,
      games
    };
  });

  res.json(fullLists);
});

// Detalle de lista
app.get('/api/lists/:id', (req, res) => {
  const list = db.getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista no encontrada' });
  const author = db.getUser(list.userId);
  const gameIds = db.getListItems(list.id);
  const games = gameIds.map(gId => db.getGame(gId)).filter(Boolean);

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
  const recs = db.getRecommendations(user.id);
  res.json(recs);
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
