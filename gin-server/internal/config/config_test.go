package config

import (
	"strings"
	"testing"
	"time"
)

func TestProductionRejectsDefaultJWTSecret(t *testing.T) {
	cfg := validConfig()
	cfg.AppEnv = "production"

	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("Validate() error = %v, want JWT_SECRET error", err)
	}
}

func TestJWTSecretMustBeAtLeast32Characters(t *testing.T) {
	cfg := validConfig()
	cfg.JWT.Secret = "too-short"

	if err := cfg.Validate(); err == nil {
		t.Fatal("Validate() error = nil, want short secret error")
	}
}

func validConfig() Config {
	return Config{
		AppEnv: "development",
		HTTP: HTTPConfig{
			ReadHeaderTimeout: time.Second, ReadTimeout: time.Second, WriteTimeout: time.Second,
			IdleTimeout: time.Second, ShutdownTimeout: time.Second,
		},
		Postgres: PostgresConfig{
			DSN: "postgres://example", MaxOpenConns: 5, MaxIdleConns: 1,
		},
		Redis: RedisConfig{Addr: "localhost:6379"},
		JWT: JWTConfig{
			Secret:    "replace-this-with-at-least-32-random-characters",
			AccessTTL: time.Minute,
		},
	}
}
