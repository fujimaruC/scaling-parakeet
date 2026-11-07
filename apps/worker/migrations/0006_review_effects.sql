-- Structured owner-review compensation. No raw text, evidence bodies or message hashes.
CREATE TABLE review_effects(
 action_id TEXT PRIMARY KEY,candidate_id TEXT NOT NULL,source_id TEXT NOT NULL,
 generation INTEGER NOT NULL,candidate_version INTEGER NOT NULL,prior_status TEXT NOT NULL,
 task_id TEXT,task_version INTEGER,created_task INTEGER NOT NULL,
 before_task_json TEXT,before_evidence_json TEXT,undone_by TEXT,undo_blocked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX review_effects_source ON review_effects(source_id);
CREATE INDEX review_effects_task ON review_effects(task_id);
CREATE INDEX candidates_review_cursor ON candidates(review_status,id);
CREATE INDEX tasks_local_date ON tasks(json_extract(due_json,'$.local_date')) WHERE deleted_at IS NULL;
