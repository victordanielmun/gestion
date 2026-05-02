package repository

import (
	"database/sql"
	"errors"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"github.com/google/uuid"
)

var ErrUserNotFound = errors.New("user not found")

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	query := `SELECT id, name, email, password_hash, role_id, is_active, refresh_token_hash, last_login_at, created_at, updated_at FROM users WHERE email = $1 AND deleted_at IS NULL`
	err := database.DB.Get(&user, query, email)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return &user, err
}

func GetUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	query := `SELECT id, name, email, password_hash, role_id, is_active, refresh_token_hash, last_login_at, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL`
	err := database.DB.Get(&user, query, id)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return &user, err
}

func UpdateLastLogin(id uuid.UUID) error {
	_, err := database.DB.Exec(`UPDATE users SET last_login_at = $1 WHERE id = $2`, time.Now(), id)
	return err
}

func CreateUser(user *models.User) error {
	query := `INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	return database.DB.QueryRowx(query, user.Name, user.Email, user.PasswordHash, user.RoleID, user.IsActive).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func UpdateUser(user *models.User) error {
	query := `UPDATE users SET name = $1, email = $2, password_hash = $3, role_id = $4, is_active = $5 WHERE id = $6 AND deleted_at IS NULL RETURNING updated_at`
	return database.DB.QueryRowx(query, user.Name, user.Email, user.PasswordHash, user.RoleID, user.IsActive, user.ID).Scan(&user.UpdatedAt)
}

func DeleteUser(id uuid.UUID) error {
    _, err := database.DB.Exec(`UPDATE users SET deleted_at = $1 WHERE id = $2`, time.Now(), id)
    return err
}

func GetAllUsers() ([]models.User, error) {
	var users []models.User
	query := `
		SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.last_login_at, u.created_at, u.updated_at,
		       r.id AS "role.id", r.name AS "role.name", r.permissions AS "role.permissions"
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.deleted_at IS NULL
		ORDER BY u.created_at DESC`
	err := database.DB.Select(&users, query)
	return users, err
}

func GetRoles() ([]models.Role, error) {
	var roles []models.Role
	query := `SELECT id, name, permissions, created_at, updated_at FROM roles WHERE deleted_at IS NULL ORDER BY name ASC`
	err := database.DB.Select(&roles, query)
	return roles, err
}
