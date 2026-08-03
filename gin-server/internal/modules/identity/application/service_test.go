package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/domain"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
)

type fakeRepository struct {
	created    domain.User
	credential domain.LocalCredential
	createErr  error
	findErr    error
}

func (r *fakeRepository) CreateLocalUser(_ context.Context, user domain.User, _ string) (domain.User, error) {
	r.created = user
	return user, r.createErr
}

func (r *fakeRepository) FindLocalCredential(_ context.Context, _ string) (domain.LocalCredential, error) {
	return r.credential, r.findErr
}

func (r *fakeRepository) FindByID(_ context.Context, userID uuid.UUID) (domain.User, error) {
	if r.credential.User.ID != userID {
		return domain.User{}, fault.ErrNotFound
	}
	return r.credential.User, nil
}

type fakeHasher struct{}

func (fakeHasher) Hash(password string) (string, error) { return "hash:" + password, nil }

func (fakeHasher) Compare(hash, password string) error {
	if hash != "hash:"+password {
		return errors.New("password mismatch")
	}
	return nil
}

type fakeTokens struct{}

func (fakeTokens) IssueAccessToken(uuid.UUID, string) (string, time.Time, error) {
	return "access-token", time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC), nil
}

func TestRegisterNormalizesEmailAndCreatesActiveUser(t *testing.T) {
	repository := &fakeRepository{}
	service := NewService(repository, fakeHasher{}, fakeTokens{})

	result, err := service.Register(context.Background(), RegisterCommand{
		Email: "  USER@Example.COM ", Password: "password123",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if result.User.Email != "user@example.com" {
		t.Fatalf("email = %q, want normalized email", result.User.Email)
	}
	if result.User.DisplayName != "user" {
		t.Fatalf("display name = %q, want email prefix", result.User.DisplayName)
	}
	if result.User.Status != domain.UserStatusActive || result.User.Role != domain.UserRoleUser {
		t.Fatalf("unexpected user state: status=%q role=%q", result.User.Status, result.User.Role)
	}
	if result.AccessToken != "access-token" {
		t.Fatalf("access token = %q", result.AccessToken)
	}
}

func TestLoginHidesUnknownAccountAsInvalidCredentials(t *testing.T) {
	service := NewService(&fakeRepository{findErr: fault.ErrNotFound}, fakeHasher{}, fakeTokens{})

	_, err := service.Login(context.Background(), LoginCommand{
		Email: "missing@example.com", Password: "password123",
	})
	if !errors.Is(err, fault.ErrInvalidCredential) {
		t.Fatalf("Login() error = %v, want ErrInvalidCredential", err)
	}
}

func TestLoginRejectsWrongPassword(t *testing.T) {
	service := NewService(&fakeRepository{credential: domain.LocalCredential{
		User:         domain.User{ID: uuid.New(), Role: domain.UserRoleUser, Status: domain.UserStatusActive},
		PasswordHash: "hash:correct-password",
	}}, fakeHasher{}, fakeTokens{})

	_, err := service.Login(context.Background(), LoginCommand{
		Email: "user@example.com", Password: "wrong-password",
	})
	if !errors.Is(err, fault.ErrInvalidCredential) {
		t.Fatalf("Login() error = %v, want ErrInvalidCredential", err)
	}
}
