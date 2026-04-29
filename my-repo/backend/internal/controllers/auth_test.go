package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"backend/internal/models"
	"backend/internal/testutils"
	"backend/internal/utils"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestLogin_Success(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	password := "mypassword"
	hash, _ := utils.HashPassword(password)

	userID := uuid.New()
	roleID := uuid.New()

	reqBody := models.LoginRequest{
		Email:    "test@example.com",
		Password: password,
	}
	body, _ := json.Marshal(reqBody)

	// Mock getting user by email
	rows := sqlmock.NewRows([]string{"id", "name", "email", "password_hash", "role_id", "is_active", "refresh_token_hash", "last_login_at", "created_at", "updated_at"}).
		AddRow(userID, "Test User", reqBody.Email, hash, roleID, true, nil, nil, time.Now(), time.Now())

	mock.ExpectQuery(`SELECT (.+) FROM users WHERE email = \$1 AND deleted_at IS NULL`).
		WithArgs(reqBody.Email).
		WillReturnRows(rows)

	// Mock updating last login
	mock.ExpectExec(`UPDATE users SET last_login_at = \$1 WHERE id = \$2`).
		WithArgs(sqlmock.AnyArg(), userID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	// Act
	handler := http.HandlerFunc(Login)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusOK, rr.Code)

	var resp models.LoginResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, userID, resp.User.ID)
	assert.Equal(t, "test@example.com", resp.User.Email)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestLogin_InvalidCredentials(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	password := "wrongpassword"

	reqBody := models.LoginRequest{
		Email:    "test@example.com",
		Password: password,
	}
	body, _ := json.Marshal(reqBody)

	// Mock getting user by email (not found)
	mock.ExpectQuery(`SELECT (.+) FROM users WHERE email = \$1 AND deleted_at IS NULL`).
		WithArgs(reqBody.Email).
		WillReturnRows(sqlmock.NewRows([]string{}))

	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	// Act
	handler := http.HandlerFunc(Login)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var errResp models.ErrorResponse
	err := json.Unmarshal(rr.Body.Bytes(), &errResp)
	assert.NoError(t, err)
	assert.Equal(t, "Invalid credentials", errResp.Error)
	assert.NoError(t, mock.ExpectationsWereMet())
}
