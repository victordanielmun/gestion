package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"backend/internal/models"
	"backend/internal/utils"
)

type contextKey string

const UserIDKey contextKey = "userID"

type responseWriterInterceptor struct {
	http.ResponseWriter
	wroteHeader bool
}

func (rw *responseWriterInterceptor) WriteHeader(code int) {
	if !rw.wroteHeader {
		if rw.Header().Get("Content-Type") == "" {
			rw.Header().Set("Content-Type", "application/json")
		}
		rw.wroteHeader = true
	}
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriterInterceptor) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		if rw.Header().Get("Content-Type") == "" {
			rw.Header().Set("Content-Type", "application/json")
		}
		rw.wroteHeader = true
	}
	return rw.ResponseWriter.Write(b)
}

func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(models.ErrorResponse{
					Error:   "Internal Server Error",
					Details: "An unexpected error occurred",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// JSONMiddleware defaults content type to JSON if not set by handler
func JSONMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		interceptor := &responseWriterInterceptor{ResponseWriter: w}
		next.ServeHTTP(interceptor, r)
	})
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Missing Authorization header"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid Authorization header format"})
			return
		}

		tokenStr := parts[1]
		claims, err := utils.ValidateJWT(tokenStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid or expired token"})
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
