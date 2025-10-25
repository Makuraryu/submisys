import { Elysia, t } from 'elysia';
import { getDb } from '@/utils/dbClient';

export const authRoutes = new Elysia({ name: 'authRoutes', prefix: '/api' }).post(
  '/login',
  ({ body, set }) => {
    const db = getDb();
    try {
      const statement = db.prepare(
        `SELECT id, role FROM users WHERE username = ?1 AND password = ?2 LIMIT 1`
      );
      const user = statement.get(body.username, body.password) as { id: number; role: string } | undefined;
      if (!user) {
        set.status = 401;
        return { message: 'Invalid credentials' };
      }
      return user;
    } catch (error) {
      console.error('auth.login', error);
      set.status = 500;
      return { message: 'Unable to login' };
    }
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
  }
);
