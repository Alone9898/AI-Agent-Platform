BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(128) NOT NULL UNIQUE,
    display_name varchar(64) NOT NULL,
    avatar_url text NOT NULL DEFAULT '',
    role varchar(24) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
    status varchar(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (email = lower(email))
);

CREATE TABLE user_auth_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider varchar(32) NOT NULL,
    provider_identifier varchar(255) NOT NULL,
    secret_hash text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_identifier)
);
CREATE INDEX idx_user_auth_identities_user_id ON user_auth_identities(user_id);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id uuid,
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    replaced_by_id uuid REFERENCES refresh_tokens(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE wallet_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
    frozen_balance bigint NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type varchar(32) NOT NULL CHECK (type IN ('recharge', 'consume', 'refund', 'reward', 'freeze', 'unfreeze', 'adjustment')),
    amount bigint NOT NULL CHECK (amount <> 0),
    balance_after bigint NOT NULL CHECK (balance_after >= 0),
    frozen_balance_after bigint NOT NULL DEFAULT 0 CHECK (frozen_balance_after >= 0),
    source_type varchar(32),
    source_id uuid,
    idempotency_key varchar(128) NOT NULL UNIQUE,
    remark text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_source ON wallet_transactions(source_type, source_id);

CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_no varchar(64) NOT NULL UNIQUE,
    product_type varchar(32) NOT NULL CHECK (product_type IN ('points', 'skill', 'subscription')),
    product_id uuid,
    product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    amount_cents bigint NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
    points_amount bigint NOT NULL DEFAULT 0 CHECK (points_amount >= 0),
    currency char(3) NOT NULL DEFAULT 'CNY',
    status varchar(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunding', 'refunded', 'closed')),
    idempotency_key varchar(128) NOT NULL,
    expires_at timestamptz,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

CREATE TABLE payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    channel varchar(32) NOT NULL,
    channel_transaction_id varchar(128),
    type varchar(24) NOT NULL CHECK (type IN ('pay', 'refund')),
    amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
    status varchar(24) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'closed')),
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (channel, channel_transaction_id, type)
);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id, created_at DESC);

CREATE TABLE skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
    name varchar(120) NOT NULL,
    slug varchar(160) NOT NULL UNIQUE,
    summary varchar(280) NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    type varchar(32) NOT NULL CHECK (type IN ('prompt', 'tool', 'runtime', 'mixed')),
    risk_level varchar(24) NOT NULL DEFAULT 'safe' CHECK (risk_level IN ('safe', 'network', 'filesystem', 'process', 'restricted')),
    status varchar(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'published', 'suspended', 'archived')),
    price_points bigint NOT NULL DEFAULT 0 CHECK (price_points >= 0),
    latest_version_id uuid,
    download_count bigint NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_skills_owner_created ON skills(owner_id, created_at DESC);
CREATE INDEX idx_skills_marketplace ON skills(status, type, updated_at DESC);

CREATE TABLE skill_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version varchar(32) NOT NULL,
    manifest jsonb NOT NULL,
    package_object_key text NOT NULL,
    package_sha256 char(64) NOT NULL,
    package_size bigint NOT NULL CHECK (package_size >= 0),
    changelog text NOT NULL DEFAULT '',
    status varchar(32) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'withdrawn')),
    review_note text NOT NULL DEFAULT '',
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (skill_id, version)
);
CREATE INDEX idx_skill_versions_skill_created ON skill_versions(skill_id, created_at DESC);
ALTER TABLE skills ADD CONSTRAINT fk_skills_latest_version
    FOREIGN KEY (latest_version_id) REFERENCES skill_versions(id) ON DELETE SET NULL;

CREATE TABLE skill_entitlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source_type varchar(24) NOT NULL CHECK (source_type IN ('free', 'order', 'admin', 'subscription')),
    source_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    status varchar(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, skill_id)
);
CREATE INDEX idx_skill_entitlements_user_status ON skill_entitlements(user_id, status);

CREATE TABLE skill_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_version_id uuid NOT NULL REFERENCES skill_versions(id) ON DELETE CASCADE,
    permission varchar(64) NOT NULL,
    reason text NOT NULL DEFAULT '',
    required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (skill_version_id, permission)
);

CREATE TABLE skill_downloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    skill_version_id uuid NOT NULL REFERENCES skill_versions(id) ON DELETE RESTRICT,
    device_id uuid,
    ip_hash varchar(64),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_skill_downloads_skill_created ON skill_downloads(skill_id, created_at DESC);
CREATE INDEX idx_skill_downloads_user_created ON skill_downloads(user_id, created_at DESC);

CREATE TABLE skill_installs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id uuid NOT NULL,
    skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    skill_version_id uuid NOT NULL REFERENCES skill_versions(id) ON DELETE RESTRICT,
    enabled boolean NOT NULL DEFAULT false,
    installed_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_id, skill_id)
);

CREATE TABLE devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint_hash varchar(64) NOT NULL,
    name varchar(120) NOT NULL,
    platform varchar(32) NOT NULL,
    app_version varchar(32) NOT NULL DEFAULT '',
    status varchar(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_fingerprint_hash)
);
CREATE INDEX idx_devices_user_status ON devices(user_id, status);

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE skill_downloads ADD CONSTRAINT fk_skill_downloads_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE skill_installs ADD CONSTRAINT fk_skill_installs_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;

CREATE TABLE app_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform varchar(32) NOT NULL,
    arch varchar(32) NOT NULL,
    version varchar(32) NOT NULL,
    channel varchar(24) NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta', 'nightly')),
    object_key text NOT NULL,
    sha256 char(64) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    release_notes text NOT NULL DEFAULT '',
    mandatory boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, arch, version, channel)
);
CREATE INDEX idx_app_releases_latest ON app_releases(platform, arch, channel, published_at DESC);

CREATE TABLE idempotency_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope varchar(64) NOT NULL,
    idempotency_key varchar(128) NOT NULL,
    request_hash varchar(64) NOT NULL,
    response_status integer,
    response_body jsonb,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (scope, idempotency_key)
);
CREATE INDEX idx_idempotency_records_expires ON idempotency_records(expires_at);

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action varchar(120) NOT NULL,
    resource_type varchar(64) NOT NULL,
    resource_id uuid,
    request_id varchar(128),
    ip_hash varchar(64),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type varchar(64) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type varchar(120) NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error text NOT NULL DEFAULT ''
);
CREATE INDEX idx_outbox_events_pending ON outbox_events(occurred_at) WHERE published_at IS NULL;

COMMIT;
