package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	UserStatusActive = "active"
	UserRoleUser     = "user"
)

type User struct {
	ID          uuid.UUID
	Email       string
	DisplayName string
	AvatarURL   string
	Role        string
	Status      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type LocalCredential struct {
	User         User
	PasswordHash string
}
