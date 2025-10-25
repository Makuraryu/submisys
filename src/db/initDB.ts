import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, getDb } from '@/utils/dbClient';

const run = async () => {
  const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
  const schema = await readFile(schemaPath, 'utf8');
  const db = getDb();
  db.exec(schema);
  console.log('Database initialized.');
  closeDb();
};

run().catch((error) => {
  console.error('initDB failed', error);
  process.exit(1);
});
