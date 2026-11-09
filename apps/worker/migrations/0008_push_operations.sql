CREATE TABLE push_subscriptions(id TEXT PRIMARY KEY,endpoint TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,revoked_at TEXT,vapid_key TEXT NOT NULL);
CREATE TABLE push_attempts(inbox_id TEXT NOT NULL,subscription_id TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('unknown','provider_accepted','failed','expired','revoked')),attempted_at TEXT NOT NULL,PRIMARY KEY(inbox_id,subscription_id));
CREATE INDEX push_attempts_subscription ON push_attempts(subscription_id);
CREATE TABLE operational_usage(bucket TEXT NOT NULL,class TEXT NOT NULL,requests INTEGER NOT NULL,PRIMARY KEY(bucket,class));
CREATE TABLE operational_reports(component TEXT PRIMARY KEY,started_at TEXT,reported_at TEXT,state TEXT NOT NULL);
