package http

import (
	"github.com/gin-gonic/gin"
	"github.com/xingyao-agent/platform-cloud/internal/platform/security"
)

const identityContextKey = "identity"

func SetCurrentIdentity(c *gin.Context, identity security.Identity) {
	c.Set(identityContextKey, identity)
}

func CurrentIdentity(c *gin.Context) (security.Identity, bool) {
	value, exists := c.Get(identityContextKey)
	if !exists {
		return security.Identity{}, false
	}
	identity, ok := value.(security.Identity)
	return identity, ok
}
