package application

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/domain"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
)

type Service struct {
	repository Repository
	hasher     PasswordHasher
	tokens     AccessTokenIssuer
}

type RegisterCommand struct {
	Email       string
	Password    string
	DisplayName string
}

type LoginCommand struct {
	Email    string
	Password string
}

type AuthResult struct {
	User        domain.User
	AccessToken string
	ExpiresAt   time.Time
}

func NewService(repository Repository, hasher PasswordHasher, tokens AccessTokenIssuer) *Service {
	return &Service{repository: repository, hasher: hasher, tokens: tokens}
}

func (s *Service) Register(ctx context.Context, command RegisterCommand) (AuthResult, error) {
	email := normalizeEmail(command.Email)
	displayName := strings.TrimSpace(command.DisplayName)
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	passwordHash, err := s.hasher.Hash(command.Password)
	if err != nil {
		return AuthResult{}, fmt.Errorf("hash password: %w", err)
	}

	now := time.Now().UTC()
	user, err := s.repository.CreateLocalUser(ctx, domain.User{
		ID:          uuid.New(),
		Email:       email,
		DisplayName: displayName,
		Role:        domain.UserRoleUser,
		Status:      domain.UserStatusActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, passwordHash)
	if err != nil {
		return AuthResult{}, err
	}

	return s.authResult(user)
}

func (s *Service) Login(ctx context.Context, command LoginCommand) (AuthResult, error) {
	credential, err := s.repository.FindLocalCredential(ctx, normalizeEmail(command.Email))
	if err != nil {
		if errors.Is(err, fault.ErrNotFound) {
			return AuthResult{}, fault.ErrInvalidCredential
		}
		return AuthResult{}, err
	}
	if credential.User.Status != domain.UserStatusActive {
		return AuthResult{}, fault.ErrInvalidCredential
	}
	if err := s.hasher.Compare(credential.PasswordHash, command.Password); err != nil {
		return AuthResult{}, fault.ErrInvalidCredential
	}

	return s.authResult(credential.User)
}

func (s *Service) Me(ctx context.Context, userID uuid.UUID) (domain.User, error) {
	return s.repository.FindByID(ctx, userID)
}

func (s *Service) authResult(user domain.User) (AuthResult, error) {
	token, expiresAt, err := s.tokens.IssueAccessToken(user.ID, user.Role)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, AccessToken: token, ExpiresAt: expiresAt}, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
