package application

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/domain"
)

type Repository interface {
	CreateLocalUser(ctx context.Context, user domain.User, passwordHash string) (domain.User, error)
	FindLocalCredential(ctx context.Context, normalizedEmail string) (domain.LocalCredential, error)
	FindByID(ctx context.Context, userID uuid.UUID) (domain.User, error)
}

type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) error
}

type AccessTokenIssuer interface {
	IssueAccessToken(userID uuid.UUID, role string) (string, time.Time, error)
}
