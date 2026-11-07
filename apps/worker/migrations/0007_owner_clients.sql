-- Per-install owner authority, separate from source-scoped collectors/capture devices.
-- Only random-secret hashes; never bearer secrets, grants, source text or credentials in exports.
CREATE TABLE owner_client_grants(
 id TEXT PRIMARY KEY,owner_subject TEXT NOT NULL,grant_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,expires_at TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,
 consumed_by TEXT,consumed_hash TEXT
);
CREATE TABLE owner_client_credentials(
 id TEXT PRIMARY KEY,owner_subject TEXT NOT NULL,token_hash TEXT NOT NULL,
 scope_version INTEGER NOT NULL DEFAULT 1 CHECK(scope_version=1),
 status TEXT NOT NULL CHECK(status IN ('pending','active','revoked')),
 grant_id TEXT NOT NULL REFERENCES owner_client_grants(id),
 created_at TEXT NOT NULL,expires_at TEXT NOT NULL,activated_at TEXT,revoked_at TEXT
);
CREATE INDEX owner_clients_owner ON owner_client_credentials(owner_subject,status);
CREATE TABLE owner_enrollment_limits(bucket INTEGER PRIMARY KEY,attempts INTEGER NOT NULL);
