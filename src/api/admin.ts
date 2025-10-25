import { Elysia, t } from 'elysia';
import { getDb } from '@/utils/dbClient';

export const adminRoutes = new Elysia({ name: 'adminRoutes', prefix: '/api/admin' })
  .get('/slots', ({ set }) => {
    const db = getDb();
    try {
      const slots = db
        .query(
          `SELECT ds.id,
                  ds.slot_time as slotTime,
                  ds.location,
                  ds.status,
                  COUNT(DISTINCT ta.teacher_id) as teacherCount,
                  COUNT(DISTINCT p.id) as projectCount
           FROM defense_slots ds
           LEFT JOIN teacher_assignments ta ON ta.slot_id = ds.id
           LEFT JOIN projects p ON p.defense_slot_id = ds.id
           GROUP BY ds.id
           ORDER BY ds.slot_time`
        )
        .all();
      return slots;
    } catch (error) {
      console.error('admin.slots', error);
      set.status = 500;
      return { message: 'Failed to load slots' };
    }
  })
  .get('/projects', ({ set }) => {
    const db = getDb();
    try {
      const projects = db
        .query(
          `SELECT p.id,
                  p.student_id as studentId,
                  u.username as studentName,
                  p.title,
                  p.description,
                  p.status,
                  p.defense_slot_id as defenseSlotId
           FROM projects p
           JOIN users u ON u.id = p.student_id
           ORDER BY p.id`
        )
        .all();
      return projects;
    } catch (error) {
      console.error('admin.projects', error);
      set.status = 500;
      return { message: 'Failed to load projects' };
    }
  })
  .post(
    '/approve',
    ({ body, set }) => {
      const db = getDb();
      try {
        const result = db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(body.status, body.projectId);
        if (result.changes === 0) {
          set.status = 404;
          return { message: 'Project not found' };
        }
        return { message: 'Project updated' };
      } catch (error) {
        console.error('admin.approve', error);
        set.status = 500;
        return { message: 'Failed to update project status' };
      }
    },
    {
      body: t.Object({
        projectId: t.Number(),
        status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
      }),
    }
  )
  .post(
    '/slot/new',
    ({ body, set }) => {
      const db = getDb();
      try {
        const statement = db.prepare('INSERT INTO defense_slots (slot_time, location, status) VALUES (?1, ?2, ?3)');
        statement.run(body.slotTime, body.location, body.status ?? 'open');
        return { message: 'Slot created' };
      } catch (error) {
        console.error('admin.slot.new', error);
        set.status = 500;
        return { message: 'Failed to create slot' };
      }
    },
    {
      body: t.Object({
        slotTime: t.String(),
        location: t.String(),
        status: t.Optional(t.String()),
      }),
    }
  );
