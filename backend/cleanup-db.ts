import Database from 'better-sqlite3';

const db = new Database('./gametracker.db');

db.pragma('foreign_keys = ON');

console.log('🧹 Limpiando tablas antiguas...\n');

db.exec(`
  DROP TABLE IF EXISTS favorites_v2;
  DROP TABLE IF EXISTS user_games_v2;
`);

console.log('✅ Tablas antiguas eliminadas.\n');

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all() as { name: string }[];

for (const table of tables) {
  const result = db
    .prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`)
    .get() as { count: number };

  console.log(`- ${table.name}: ${result.count} registros`);
}

db.close();