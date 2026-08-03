package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/application"
	"github.com/xingyao-agent/platform-cloud/internal/modules/identity/domain"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
	"github.com/xingyao-agent/platform-cloud/internal/shared/response"
)

type Handler struct {
	service *application.Service
}

type registerRequest struct {
	Email       string `json:"email" binding:"required,email,max=128"`
	Password    string `json:"password" binding:"required,min=8,max=72"`
	DisplayName string `json:"displayName" binding:"max=64"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email,max=128"`
	Password string `json:"password" binding:"required,max=72"`
}

type authResponse struct {
	User        userResponse `json:"user"`
	AccessToken string       `json:"accessToken"`
	TokenType   string       `json:"tokenType"`
	ExpiresAt   time.Time    `json:"expiresAt"`
}

type userResponse struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	Role        string    `json:"role"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}

func NewHandler(service *application.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(c *gin.Context) {
	var request registerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		response.ValidationError(c, "请输入有效邮箱，密码长度需为 8 到 72 个字符")
		return
	}

	result, err := h.service.Register(c.Request.Context(), application.RegisterCommand{
		Email:       request.Email,
		Password:    request.Password,
		DisplayName: request.DisplayName,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, http.StatusCreated, toAuthResponse(result))
}

func (h *Handler) Login(c *gin.Context) {
	var request loginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		response.ValidationError(c, "请输入有效的邮箱和密码")
		return
	}

	result, err := h.service.Login(c.Request.Context(), application.LoginCommand{
		Email: request.Email, Password: request.Password,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, http.StatusOK, toAuthResponse(result))
}

func (h *Handler) Me(c *gin.Context) {
	identity, ok := CurrentIdentity(c)
	if !ok {
		response.Error(c, fault.ErrUnauthorized)
		return
	}

	user, err := h.service.Me(c.Request.Context(), identity.UserID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, http.StatusOK, toUserResponse(user))
}

func toAuthResponse(result application.AuthResult) authResponse {
	return authResponse{
		User:        toUserResponse(result.User),
		AccessToken: result.AccessToken,
		TokenType:   "Bearer",
		ExpiresAt:   result.ExpiresAt,
	}
}

func toUserResponse(user domain.User) userResponse {
	return userResponse{
		ID:          user.ID.String(),
		Email:       user.Email,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		Role:        user.Role,
		Status:      user.Status,
		CreatedAt:   user.CreatedAt,
	}
}
