package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/xingyao-agent/platform-cloud/internal/shared/fault"
)

type envelope struct {
	Data      any    `json:"data,omitempty"`
	Error     *issue `json:"error,omitempty"`
	RequestID string `json:"requestId,omitempty"`
}

type issue struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func OK(c *gin.Context, status int, data any) {
	c.JSON(status, envelope{Data: data, RequestID: requestID(c)})
}

func Error(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	code := "INTERNAL_ERROR"
	message := "服务暂时不可用"

	switch {
	case errors.Is(err, fault.ErrConflict):
		status, code, message = http.StatusConflict, "RESOURCE_CONFLICT", "资源已存在"
	case errors.Is(err, fault.ErrInvalidCredential):
		status, code, message = http.StatusUnauthorized, "INVALID_CREDENTIALS", "账号或密码错误"
	case errors.Is(err, fault.ErrNotFound):
		status, code, message = http.StatusNotFound, "NOT_FOUND", "资源不存在"
	case errors.Is(err, fault.ErrUnauthorized):
		status, code, message = http.StatusUnauthorized, "UNAUTHORIZED", "请先登录"
	}
	if status == http.StatusInternalServerError && err != nil {
		_ = c.Error(err)
	}

	c.AbortWithStatusJSON(status, envelope{
		Error:     &issue{Code: code, Message: message},
		RequestID: requestID(c),
	})
}

func ValidationError(c *gin.Context, message string) {
	c.AbortWithStatusJSON(http.StatusBadRequest, envelope{
		Error:     &issue{Code: "VALIDATION_ERROR", Message: message},
		RequestID: requestID(c),
	})
}

func requestID(c *gin.Context) string {
	value, _ := c.Get("request_id")
	requestID, _ := value.(string)
	return requestID
}
