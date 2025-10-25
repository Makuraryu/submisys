import { Elysia, t } from 'elysia';
import { getDb } from '@/utils/dbClient';

export const teacherRoutes = new Elysia({ name: 'teacherRoutes', prefix: '/api/teacher' })
  .get('/slots/:id', ({ params, set }) => {
    const db = getDb();
    try {
      const rows = db
        .query(
          `SELECT ds.id as slotId,
                  ds.slot_time as slotTime,
                  ds.location,
                  ds.status,
                  p.id as projectId,
                  p.title as projectTitle,
                  p.student_id as studentId
           FROM teacher_assignments ta
           INNER JOIN defense_slots ds ON ds.id = ta.slot_id
           LEFT JOIN projects p ON p.defense_slot_id = ds.id
           WHERE ta.teacher_id = ?
           ORDER BY ds.slot_time`
        )
        .all(Number(params.id));

      const grouped = rows.reduce<Record<number, { slotId: number; slotTime: string; location: string; status: string; projects: Array<{ projectId: number | null; projectTitle: string | null; studentId: number | null }> }>>(
        (acc, row) => {
          if (!acc[row.slotId]) {
            acc[row.slotId] = {
              slotId: row.slotId,
              slotTime: row.slotTime,
              location: row.location,
              status: row.status,
              projects: [],
            };
          }
          acc[row.slotId].projects.push({
            projectId: row.projectId ?? null,
            projectTitle: row.projectTitle ?? null,
            studentId: row.studentId ?? null,
          });
          return acc;
        },
        {}
      );

      return Object.values(grouped);
    } catch (error) {
      console.error('teacher.slots', error);
      set.status = 500;
      return { message: 'Failed to load teacher slots' };
    }
  })
  .post(
    '/score',
    ({ body, set }) => {
      const db = getDb();
      try {
        const project = db
          .query(
            `SELECT id FROM projects WHERE student_id = ? AND defense_slot_id IS NOT NULL LIMIT 1`
          )
          .get(body.studentId) as { id: number } | undefined;
        if (!project) {
          set.status = 404;
          return { message: 'Project for student not found' };
        }

        const statement = db.prepare(`
          INSERT INTO scores (project_id, teacher_id, result, comments)
          VALUES (?1, ?2, ?3, ?4)
          ON CONFLICT(project_id, teacher_id)
          DO UPDATE SET
            result = excluded.result,
            comments = excluded.comments,
            updated_at = CURRENT_TIMESTAMP
        `);
        statement.run(project.id, body.teacherId, body.result, body.comments ?? null);

        const updateProject = db.prepare(`
          UPDATE projects SET status = ? WHERE id = ?
        `);
        updateProject.run(body.result === 'pass' ? 'approved' : 'rejected', project.id);

        return { message: 'Score saved' };
      } catch (error) {
        console.error('teacher.score', error);
        set.status = 500;
        return { message: 'Failed to submit score' };
      }
    },
    {
      body: t.Object({
        teacherId: t.Number(),
        studentId: t.Number(),
        result: t.Union([t.Literal('pass'), t.Literal('fail')]),
        comments: t.Optional(t.String()),
      }),
    }
  );
