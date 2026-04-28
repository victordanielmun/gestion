package main

import (
	"log"
	"net/http"
	"os"

	"backend/internal/controllers"
	"backend/internal/database"
	"backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	database.Connect()

	r := chi.NewRouter()

	// Global Middlewares
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.JSONMiddleware)
	r.Use(middleware.ErrorHandler)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Post("/login", controllers.Login)
		r.Post("/logout", controllers.Logout)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware)

			r.Get("/users/me", controllers.GetMe)
			r.Post("/users", controllers.CreateUser)
			r.Put("/users/{id}", controllers.UpdateUser)
			r.Delete("/users/{id}", controllers.DeleteUser)
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
