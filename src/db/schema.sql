PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin'))
);

CREATE TABLE IF NOT EXISTS defense_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_time TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  defense_slot_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (defense_slot_id) REFERENCES defense_slots(id)
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES defense_slots(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, slot_id)
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  comments TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (project_id, teacher_id)
);

INSERT INTO users (id, username, password, role) VALUES
  (1, 'student1', 'stupass', 'student'),
  (2, 'teacher1', 'teapass', 'teacher'),
  (3, 'admin1', 'admpass', 'admin')
ON CONFLICT(id) DO UPDATE SET
  username = excluded.username,
  password = excluded.password,
  role = excluded.role;

INSERT OR IGNORE INTO defense_slots (id, slot_time, location, status) VALUES
  (1, '2025-10-26T09:00:00', 'BJ303', 'open'),
  (2, '2025-10-26T10:30:00', 'C503', 'open');

INSERT OR IGNORE INTO teacher_assignments (teacher_id, slot_id) VALUES
  (2, 1),
  (2, 2);
