// Carga las variables de entorno antes que cualquier otro módulo.
//
// Importante: en ES modules todas las sentencias `import` de un archivo se
// resuelven y ejecutan antes que el propio código del archivo (hoisting de
// imports), sin importar en qué línea estén escritas. Por eso no basta con
// llamar a `dotenv.config()` dentro de server.ts: para cuando esa línea se
// ejecuta, módulos importados antes (como server/db.ts) ya se han evaluado
// y han leído `process.env` sin las variables cargadas todavía.
//
// Este módulo debe ser el PRIMER import de server.ts para garantizar que
// `process.env` esté listo antes de importar server/db.ts o cualquier otro
// módulo que lea variables de entorno al cargarse.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../backend/.env') });
dotenv.config();
