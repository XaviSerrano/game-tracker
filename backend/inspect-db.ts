import Database from 'better-sqlite3';

const db = new Database('./gametracker.db', {
  readonly: true,
});

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all() as { name: string }[];

console.log('\nTABLAS EN gametracker.db:\n');

for (const table of tables) {
  console.log(`- ${table.name}`);

  const columns = db.prepare(`
    PRAGMA table_info(${table.name})
  `).all();

  console.table(columns);
}

db.close();