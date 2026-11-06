ALTER TABLE tasks ADD COLUMN manual_owned INTEGER NOT NULL DEFAULT 1 CHECK(manual_owned IN (0,1));
CREATE TABLE purge_acknowledgments(source_id TEXT NOT NULL,generation INTEGER NOT NULL,actor TEXT NOT NULL,acknowledged_at TEXT NOT NULL,PRIMARY KEY(source_id,generation,actor));
