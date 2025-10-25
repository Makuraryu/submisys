import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import path from 'node:path';
import { authRoutes } from '@/api/auth';
import { studentRoutes } from '@/api/student';
import { teacherRoutes } from '@/api/teacher';
import { adminRoutes } from '@/api/admin';
import { getSessionFromRequest } from '@/utils/session';

const app = new Elysia();

const protectedPages: Array<{ route: string; role: 'student' | 'teacher' | 'admin' }> = [
  { route: '/student.html', role: 'student' },
  { route: '/teacher.html', role: 'teacher' },
  { route: '/admin.html', role: 'admin' },
];

const serveProtectedPage = (route: string, role: 'student' | 'teacher' | 'admin') => {
  app.get(route, ({ request }) => {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== role) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/index.html' },
      });
    }
    const filePath = path.join('public', route.replace(/^\//, ''));
    return new Response(Bun.file(filePath));
  });
};

protectedPages.forEach(({ route, role }) => serveProtectedPage(route, role));

app
  .use(
    staticPlugin({
      assets: 'public',
      prefix: '',
    })
  )
  .use(authRoutes)
  .use(studentRoutes)
  .use(teacherRoutes)
  .use(adminRoutes)
  .get('/health', () => ({ status: 'ok' }));

const port = Number(Bun.env.PORT ?? 3000);
app.listen(port);

console.log(`Server running at http://localhost:${port}`);
