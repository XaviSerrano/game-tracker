import Database from 'better-sqlite3';

const db = new Database('./gametracker.db');

db.pragma('foreign_keys = ON');

console.log('🚀 Iniciando migración...\n');

const migrate = db.transaction(() => {
  /*
   * 1. USUARIOS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,

      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,

      avatar TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  /*
   * 2. JUEGOS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      igdb_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      release_date TEXT NOT NULL DEFAULT '',
      rating REAL,
      popularity REAL
    );
  `);

  /*
   * 3. GÉNEROS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_genres (
      game_id INTEGER NOT NULL,
      genre TEXT NOT NULL,

      PRIMARY KEY (game_id, genre),

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 4. PLATAFORMAS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_platforms (
      game_id INTEGER NOT NULL,
      platform TEXT NOT NULL,

      PRIMARY KEY (game_id, platform),

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 5. USUARIO - JUEGOS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_games (
      user_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,

      status TEXT NOT NULL DEFAULT 'WISHLIST',
      rating INTEGER NOT NULL DEFAULT 0,
      hours_played REAL NOT NULL DEFAULT 0,

      started_at TEXT,
      completed_at TEXT,

      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,

      PRIMARY KEY (user_id, game_id),

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 6. FAVORITOS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      added_at TEXT NOT NULL,

      PRIMARY KEY (user_id, game_id),

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 7. REVIEWS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,

      title TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER,

      created_at TEXT NOT NULL,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 8. LIKES DE REVIEWS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS review_likes (
      review_id TEXT NOT NULL,
      user_id TEXT NOT NULL,

      PRIMARY KEY (review_id, user_id),

      FOREIGN KEY (review_id)
        REFERENCES reviews(id)
        ON DELETE CASCADE,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 9. LISTAS PERSONALIZADAS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,

      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 10. ELEMENTOS DE LISTAS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_list_items (
      list_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,

      PRIMARY KEY (list_id, game_id),

      FOREIGN KEY (list_id)
        REFERENCES custom_lists(id)
        ON DELETE CASCADE,

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE CASCADE
    );
  `);

  /*
   * 11. FOLLOWS
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,

      PRIMARY KEY (follower_id, following_id),

      FOREIGN KEY (follower_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      FOREIGN KEY (following_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      CHECK (follower_id != following_id)
    );
  `);

  /*
   * 12. ACTIVIDAD
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,

      type TEXT NOT NULL,
      game_id INTEGER,
      target_user_id TEXT,
      details TEXT,

      created_at TEXT NOT NULL,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      FOREIGN KEY (game_id)
        REFERENCES games(igdb_id)
        ON DELETE SET NULL,

      FOREIGN KEY (target_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);
});



migrate();

console.log('✅ Migración completada correctamente.\n');

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all() as { name: string }[];

console.log('📦 Tablas disponibles:\n');

for (const table of tables) {
  const result = db
    .prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`)
    .get() as { count: number };

  console.log(`- ${table.name}: ${result.count} registros`);
}

db.close();