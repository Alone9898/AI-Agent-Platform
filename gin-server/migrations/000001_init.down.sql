BEGIN;

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS idempotency_records;
DROP TABLE IF EXISTS app_releases;
ALTER TABLE IF EXISTS skill_installs DROP CONSTRAINT IF EXISTS fk_skill_installs_device;
ALTER TABLE IF EXISTS skill_downloads DROP CONSTRAINT IF EXISTS fk_skill_downloads_device;
ALTER TABLE IF EXISTS refresh_tokens DROP CONSTRAINT IF EXISTS fk_refresh_tokens_device;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS skill_installs;
DROP TABLE IF EXISTS skill_downloads;
DROP TABLE IF EXISTS skill_permissions;
DROP TABLE IF EXISTS skill_entitlements;
ALTER TABLE IF EXISTS skills DROP CONSTRAINT IF EXISTS fk_skills_latest_version;
DROP TABLE IF EXISTS skill_versions;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallet_accounts;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_auth_identities;
DROP TABLE IF EXISTS users;

COMMIT;
