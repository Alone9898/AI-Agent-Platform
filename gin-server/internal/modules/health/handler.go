package health

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/xingyao-agent/platform-cloud/internal/shared/response"
)

type Handler struct {
	database *sql.DB
	cache    *redis.Client
}

func NewHandler(database *sql.DB, cache *redis.Client) *Handler {
	return &Handler{database: database, cache: cache}
}

func (h *Handler) Live(c *gin.Context) {
	response.OK(c, http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	checks := gin.H{"postgres": "ok", "redis": "ok"}
	ready := true
	if err := h.database.PingContext(ctx); err != nil {
		checks["postgres"] = "unavailable"
		ready = false
	}
	if err := h.cache.Ping(ctx).Err(); err != nil {
		checks["redis"] = "unavailable"
		ready = false
	}

	status := http.StatusOK
	state := "ok"
	if !ready {
		status = http.StatusServiceUnavailable
		state = "degraded"
	}
	response.OK(c, status, gin.H{"status": state, "checks": checks})
}
