package controllers

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/utils"
)

func Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid request payload"})
		return
	}

	user, err := repository.GetUserByEmail(req.Email)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid credentials"})
		return
	}

	if !user.IsActive {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Account is inactive"})
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid credentials"})
		return
	}

	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to generate token"})
		return
	}

	repository.UpdateLastLogin(user.ID)

	json.NewEncoder(w).Encode(models.LoginResponse{
		Token: token,
		User:  *user,
	})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// Simple client-side logout just means dropping the token on client.
	// A robust solution might involve revoking tokens or clearing refresh tokens.
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}
