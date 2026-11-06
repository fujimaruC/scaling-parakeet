CREATE TABLE reminder_rebuilds(task_id TEXT PRIMARY KEY REFERENCES tasks(id),due_revision INTEGER NOT NULL);
