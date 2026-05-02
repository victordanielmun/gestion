package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	Name             string     `db:"name" json:"name"`
	Email            string     `db:"email" json:"email"`
	PasswordHash     string     `db:"password_hash" json:"-"`
	RoleID           uuid.UUID  `db:"role_id" json:"role_id"`
	Role             *Role      `db:"role" json:"role,omitempty"`
	IsActive         bool       `db:"is_active" json:"is_active"`
	RefreshTokenHash *string    `db:"refresh_token_hash" json:"-"`
	LastLoginAt      *time.Time `db:"last_login_at" json:"last_login_at"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt        *time.Time `db:"deleted_at" json:"-"`
}

type Role struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Name        string     `db:"name" json:"name"`
	Permissions string     `db:"permissions" json:"permissions"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateUserRequest struct {
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Password string    `json:"password"`
	RoleID   uuid.UUID `json:"role_id"`
}

type UpdateUserRequest struct {
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Password string    `json:"password,omitempty"`
	RoleID   uuid.UUID `json:"role_id"`
	IsActive *bool     `json:"is_active,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}
