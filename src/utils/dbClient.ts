import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Database } from 'bun:sqlite';

let dbInstance: Database | null = null;

const ensureDirectory = (databasePath: string) => {
  const directory = path.dirname(databasePath);
  mkdirSync(directory, { recursive: true });
};

const resolveDatabasePath = () => {
  const configuredPath = Bun.env.DATABASE_URL;
  if (configuredPath) {
    return configuredPath;
  }
  return path.resolve(process.cwd(), 'data/app.db');
};

export const getDb = () => {
  if (!dbInstance) {
    const databasePath = resolveDatabasePath();
    ensureDirectory(databasePath);
    dbInstance = new Database(databasePath, { create: true });
    dbInstance.run('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
};

export const closeDb = () => {
  dbInstance?.close();
  dbInstance = null;
};
