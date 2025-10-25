import { Elysia, t } from 'elysia';
import { getDb } from '@/utils/dbClient';

export const adminRoutes = new Elysia({ name: 'adminRoutes', prefix: '/api/admin' })
  .get('/users', ({ set }) => {
    const db = getDb();
    try {
      const users = db
        .query(
          `SELECT id, username, role
           FROM users
           ORDER BY id`
        )
        .all();
      return users;
    } catch (error) {
      console.error('admin.users.list', error);
      set.status = 500;
      return { message: 'Failed to load users' };
    }
  })
  .post(
    '/users/save',
    ({ body, set }) => {
      const db = getDb();
      try {
        const statement = db.prepare(
          `INSERT INTO users (id, username, password, role)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(id) DO UPDATE SET
             username = excluded.username,
             password = excluded.password,
             role = excluded.role`
        );
        statement.run(body.id, body.username, body.password, body.role);
        return { message: 'User saved' };
      } catch (error) {
        console.error('admin.users.save', error);
        set.status = 500;
        return { message: 'Failed to save user' };
      }
    },
    {
      body: t.Object({
        id: t.Number(),
        username: t.String(),
        password: t.String(),
        role: t.Union([t.Literal('student'), t.Literal('teacher'), t.Literal('admin')]),
      }),
    }
  )
  .post(
    '/users/delete',
    ({ body, set }) => {
      const db = getDb();
      try {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(body.id);
        if (result.changes === 0) {
          set.status = 404;
          return { message: 'User not found' };
        }
        return { message: 'User deleted' };
      } catch (error) {
        console.error('admin.users.delete', error);
        set.status = 500;
        return { message: 'Failed to delete user' };
      }
    },
    {
      body: t.Object({
        id: t.Number(),
      }),
    }
  )
  .get('/slots', ({ set }) => {
    const db = getDb();
    try {
      const rows = db
        .query(
          `SELECT ds.id,
                  ds.slot_time as slotTime,
                  ds.location,
                  ds.status,
                  COUNT(DISTINCT ta.teacher_id) as teacherCount,
                  COUNT(DISTINCT p.id) as projectCount,
                  GROUP_CONCAT(DISTINCT ta.teacher_id) as teacherIds
           FROM defense_slots ds
           LEFT JOIN teacher_assignments ta ON ta.slot_id = ds.id
           LEFT JOIN projects p ON p.defense_slot_id = ds.id
           GROUP BY ds.id
           ORDER BY ds.slot_time`
        )
        .all();
      const slots = rows.map((row) => ({
        ...row,
        teacherIds: row.teacherIds
          ? String(row.teacherIds)
              .split(',')
              .filter(Boolean)
              .map((id) => Number(id))
          : [],
      }));
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
    '/slot/delete',
    ({ body, set }) => {
      const db = getDb();
      try {
        const result = db.prepare('DELETE FROM defense_slots WHERE id = ?').run(body.id);
        if (result.changes === 0) {
          set.status = 404;
          return { message: 'Slot not found' };
        }
        return { message: 'Slot deleted' };
      } catch (error) {
        console.error('admin.slot.delete', error);
        set.status = 500;
        return { message: 'Failed to delete slot' };
      }
    },
    {
      body: t.Object({
        id: t.Number(),
      }),
    }
  )
  .post(
    '/slot/save',
    ({ body, set }) => {
      const db = getDb();
      const status = body.status ?? 'open';
      const teacherIds = body.teacherIds ?? [];
      try {
        let slotId = body.id;
        if (slotId) {
          const result = db
            .prepare('UPDATE defense_slots SET slot_time = ?, location = ?, status = ? WHERE id = ?')
            .run(body.slotTime, body.location, status, slotId);
          if (result.changes === 0) {
            const insertResult = db
              .prepare('INSERT INTO defense_slots (id, slot_time, location, status) VALUES (?1, ?2, ?3, ?4)')
              .run(slotId, body.slotTime, body.location, status);
            slotId = Number(insertResult.lastInsertRowid ?? slotId);
          }
        } else {
          const insertResult = db
            .prepare('INSERT INTO defense_slots (slot_time, location, status) VALUES (?1, ?2, ?3)')
            .run(body.slotTime, body.location, status);
          slotId = Number(insertResult.lastInsertRowid);
        }

        db.prepare('DELETE FROM teacher_assignments WHERE slot_id = ?').run(slotId);
        const insertAssignment = db.prepare(
          'INSERT INTO teacher_assignments (teacher_id, slot_id) VALUES (?1, ?2)'
        );
        teacherIds.forEach((teacherId: number) => {
          insertAssignment.run(teacherId, slotId);
        });

        return { message: body.id ? 'Slot updated' : 'Slot created' };
      } catch (error) {
        console.error('admin.slot.save', error);
        set.status = 500;
        return { message: 'Failed to save slot' };
      }
    },
    {
      body: t.Object({
        id: t.Optional(t.Number()),
        slotTime: t.String(),
        location: t.String(),
        status: t.Optional(t.String()),
        teacherIds: t.Optional(t.Array(t.Number())),
      }),
    }
  );
