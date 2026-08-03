package fault

import "errors"

var (
	ErrConflict          = errors.New("resource conflict")
	ErrInvalidCredential = errors.New("invalid credentials")
	ErrNotFound          = errors.New("resource not found")
	ErrUnauthorized      = errors.New("unauthorized")
)
