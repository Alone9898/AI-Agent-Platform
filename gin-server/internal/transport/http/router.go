package http

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/xingyao-agent/platform-cloud/internal/config"
	"github.com/xingyao-agent/platform-cloud/internal/modules/health"
	identityhttp "github.com/xingyao-agent/platform-cloud/internal/modules/identity/delivery/http"
	"github.com/xingyao-agent/platform-cloud/internal/platform/security"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
	"github.com/xingyao-agent/platform-cloud/internal/shared/response"
)

type Dependencies struct {
	Config          config.Config
	Logger          *slog.Logger
	HealthHandler   *health.Handler
	IdentityHandler *identityhttp.Handler
	Tokens          *security.TokenManager
}

func NewRouter(deps Dependencies) *gin.Engine {
	if deps.Config.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	_ = router.SetTrustedProxies(nil)
	router.Use(
		RequestID(),
		Recovery(deps.Logger),
		AccessLog(deps.Logger),
		SecurityHeaders(),
		LimitRequestBody(1<<20),
		CORS(deps.Config.CORS.AllowedOrigins),
	)

	router.GET("/health/live", deps.HealthHandler.Live)
	router.GET("/health/ready", deps.HealthHandler.Ready)

	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		auth.POST("/register", deps.IdentityHandler.Register)
		auth.POST("/login", deps.IdentityHandler.Login)

		users := v1.Group("/users")
		users.Use(identityhttp.Authenticate(deps.Tokens))
		users.GET("/me", deps.IdentityHandler.Me)
	}

	router.NoRoute(func(c *gin.Context) {
		response.Error(c, fault.ErrNotFound)
	})
	router.NoMethod(func(c *gin.Context) {
		c.AbortWithStatus(http.StatusMethodNotAllowed)
	})
	return router
}
