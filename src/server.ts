import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { authRoutes } from '@/api/auth';
import { studentRoutes } from '@/api/student';
import { teacherRoutes } from '@/api/teacher';
import { adminRoutes } from '@/api/admin';

const app = new Elysia()
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
