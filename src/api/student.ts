import { Elysia, t } from 'elysia';
import { getDb } from '@/utils/dbClient';

export const studentRoutes = new Elysia({ name: 'studentRoutes', prefix: '/api' })
  .group('/student', (app) =>
    app.post(
      '/submit',
      ({ body, set }) => {
        const db = getDb();
        try {
          const statement = db.prepare(`
            INSERT INTO projects (student_id, title, description, defense_slot_id, status)
            VALUES (?1, ?2, ?3, ?4, 'pending')
            ON CONFLICT(student_id)
            DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              defense_slot_id = excluded.defense_slot_id,
              status = 'pending'
          `);
          statement.run(body.studentId, body.title, body.description ?? '', body.defenseSlotId ?? null);
          return { message: 'Submission saved' };
        } catch (error) {
          console.error('student.submit', error);
          set.status = 500;
          return { message: 'Failed to save project' };
        }
      },
      {
        body: t.Object({
          studentId: t.Number(),
          title: t.String(),
          description: t.Optional(t.String()),
          defenseSlotId: t.Optional(t.Number()),
        }),
      }
    ).get(
      '/project/:studentId',
      ({ params, set }) => {
        const db = getDb();
        try {
          const project = db
            .query(
              `SELECT id,
                      student_id as studentId,
                      title,
                      description,
                      defense_slot_id as defenseSlotId,
                      status
               FROM projects
               WHERE student_id = ?
               LIMIT 1`
            )
            .get(Number(params.studentId));
          return { project: project ?? null };
        } catch (error) {
          console.error('student.project', error);
          set.status = 500;
          return { message: 'Failed to load project' };
        }
      },
      {
        params: t.Object({
          studentId: t.String(),
        }),
      }
    )
  )
  .get('/defense/slots', ({ set }) => {
    const db = getDb();
    try {
      const slots = db
        .query(
          `SELECT id, slot_time as slotTime, location, status
           FROM defense_slots
           ORDER BY slot_time`
        )
        .all();
      return slots;
    } catch (error) {
      console.error('defense.slots', error);
      set.status = 500;
      return { message: 'Failed to load defense slots' };
    }
  });
