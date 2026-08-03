package http

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xingyao-agent/platform-cloud/internal/platform/security"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
	"github.com/xingyao-agent/platform-cloud/internal/shared/response"
)

type AccessTokenParser interface {
	ParseAccessToken(raw string) (security.Identity, error)
}

func Authenticate(tokens AccessTokenParser) gin.HandlerFunc {
	return func(c *gin.Context) {
		scheme, token, found := strings.Cut(c.GetHeader("Authorization"), " ")
		if !found || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(token) == "" {
			response.Error(c, fault.ErrUnauthorized)
			return
		}

		identity, err := tokens.ParseAccessToken(strings.TrimSpace(token))
		if err != nil {
			response.Error(c, fault.ErrUnauthorized)
			return
		}
		SetCurrentIdentity(c, identity)
		c.Next()
	}
}
