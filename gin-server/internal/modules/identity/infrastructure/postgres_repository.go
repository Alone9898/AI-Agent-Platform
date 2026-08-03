package infrastructure

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/domain"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db *gorm.DB
}

type userRecord struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	Email       string
	DisplayName string
	AvatarURL   string
	Role        string
	Status      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (userRecord) TableName() string { return "users" }

type authIdentityRecord struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID             uuid.UUID `gorm:"type:uuid"`
	Provider           string
	ProviderIdentifier string
	SecretHash         string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (authIdentityRecord) TableName() string { return "user_auth_identities" }

type walletAccountRecord struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID        uuid.UUID `gorm:"type:uuid"`
	Balance       int64
	FrozenBalance int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (walletAccountRecord) TableName() string { return "wallet_accounts" }

func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) CreateLocalUser(ctx context.Context, user domain.User, passwordHash string) (domain.User, error) {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&userRecord{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Role:        user.Role,
			Status:      user.Status,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}).Error; err != nil {
			return err
		}

		if err := tx.Create(&authIdentityRecord{
			ID:                 uuid.New(),
			UserID:             user.ID,
			Provider:           "local",
			ProviderIdentifier: user.Email,
			SecretHash:         passwordHash,
			CreatedAt:          user.CreatedAt,
			UpdatedAt:          user.UpdatedAt,
		}).Error; err != nil {
			return err
		}

		return tx.Create(&walletAccountRecord{
			ID:        uuid.New(),
			UserID:    user.ID,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		}).Error
	})
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return domain.User{}, fault.ErrConflict
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("create local user: %w", err)
	}
	return user, nil
}

func (r *PostgresRepository) FindLocalCredential(ctx context.Context, normalizedEmail string) (domain.LocalCredential, error) {
	var identity authIdentityRecord
	err := r.db.WithContext(ctx).
		Where("provider = ? AND provider_identifier = ?", "local", normalizedEmail).
		First(&identity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.LocalCredential{}, fault.ErrNotFound
	}
	if err != nil {
		return domain.LocalCredential{}, fmt.Errorf("find local identity: %w", err)
	}

	user, err := r.findUser(ctx, identity.UserID)
	if err != nil {
		return domain.LocalCredential{}, err
	}
	return domain.LocalCredential{User: user, PasswordHash: identity.SecretHash}, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, userID uuid.UUID) (domain.User, error) {
	return r.findUser(ctx, userID)
}

func (r *PostgresRepository) findUser(ctx context.Context, userID uuid.UUID) (domain.User, error) {
	var record userRecord
	err := r.db.WithContext(ctx).First(&record, "id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.User{}, fault.ErrNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("find user: %w", err)
	}
	return domain.User{
		ID:          record.ID,
		Email:       record.Email,
		DisplayName: record.DisplayName,
		AvatarURL:   record.AvatarURL,
		Role:        record.Role,
		Status:      record.Status,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
	}, nil
}
