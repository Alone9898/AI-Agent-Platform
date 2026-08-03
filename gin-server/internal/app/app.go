package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/xingyao-agent/platform-cloud/internal/config"
	"github.com/xingyao-agent/platform-cloud/internal/modules/health"
	identityapp "github.com/xingyao-agent/platform-cloud/internal/modules/identity/application"
	identityhttp "github.com/xingyao-agent/platform-cloud/internal/modules/identity/delivery/http"
	identityinfra "github.com/xingyao-agent/platform-cloud/internal/modules/identity/infrastructure"
	"github.com/xingyao-agent/platform-cloud/internal/platform/cache"
	"github.com/xingyao-agent/platform-cloud/internal/platform/database"
	"github.com/xingyao-agent/platform-cloud/internal/platform/security"
	transporthttp "github.com/xingyao-agent/platform-cloud/internal/transport/http"
)

func Run(cfg config.Config, logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(ctx, cfg.Postgres, cfg.AppEnv == "development")
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("get postgres pool: %w", err)
	}
	defer sqlDB.Close()

	redisClient, err := cache.Open(ctx, cfg.Redis)
	if err != nil {
		return err
	}
	defer redisClient.Close()

	tokens := security.NewTokenManager(cfg.JWT)
	identityRepository := identityinfra.NewPostgresRepository(db)
	identityService := identityapp.NewService(identityRepository, security.NewPasswordHasher(), tokens)

	router := transporthttp.NewRouter(transporthttp.Dependencies{
		Config:          cfg,
		Logger:          logger,
		HealthHandler:   health.NewHandler(sqlDB, redisClient),
		IdentityHandler: identityhttp.NewHandler(identityService),
		Tokens:          tokens,
	})
	server := &http.Server{
		Addr:              cfg.HTTP.Addr,
		Handler:           router,
		ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
		ReadTimeout:       cfg.HTTP.ReadTimeout,
		WriteTimeout:      cfg.HTTP.WriteTimeout,
		IdleTimeout:       cfg.HTTP.IdleTimeout,
		MaxHeaderBytes:    1 << 20,
	}

	serverError := make(chan error, 1)
	go func() {
		logger.Info("cloud api started", "addr", cfg.HTTP.Addr, "environment", cfg.AppEnv)
		serverError <- server.ListenAndServe()
	}()

	select {
	case err := <-serverError:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve http: %w", err)
		}
		return nil
	case <-ctx.Done():
		logger.Info("shutting down cloud api")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown http server: %w", err)
	}
	return nil
}
