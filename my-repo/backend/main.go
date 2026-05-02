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
	"github.com/go-chi/cors"
)

func main() {
	database.Connect()

	r := chi.NewRouter()

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3001", "http://127.0.0.1:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

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
		r.Get("/uploads/*", func(w http.ResponseWriter, r *http.Request) {
			fs := http.StripPrefix("/api/v1/uploads/", http.FileServer(http.Dir("./uploads")))
			fs.ServeHTTP(w, r)
		})

		// Public routes
		r.Post("/login", controllers.Login)
		r.Post("/logout", controllers.Logout)
		r.Get("/settings", controllers.GetCompanySettings)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware)

			// Stats
			r.Get("/stats", controllers.GetDashboardStats)

			// Users
			r.Get("/users", controllers.GetUsers)
			r.Get("/roles", controllers.GetRoles)
			r.Get("/users/me", controllers.GetMe)
			r.Post("/users", controllers.CreateUser)
			r.Put("/users/{id}", controllers.UpdateUser)
			r.Delete("/users/{id}", controllers.DeleteUser)

			// Warehouses
			r.Get("/warehouses", controllers.GetWarehouses)
			r.Post("/warehouses", controllers.CreateWarehouse)
			r.Put("/warehouses/{id}", controllers.UpdateWarehouse)
			r.Delete("/warehouses/{id}", controllers.DeleteWarehouse)

			// Products
			r.Get("/products", controllers.GetProducts)
			r.Post("/products", controllers.CreateProduct)
			r.Put("/products/{id}", controllers.UpdateProduct)
			r.Delete("/products/{id}", controllers.DeleteProduct)

			// Categories
			r.Get("/categories", controllers.GetCategories)
			r.Post("/categories", controllers.CreateCategory)
			r.Put("/categories/{id}", controllers.UpdateCategory)
			r.Delete("/categories/{id}", controllers.DeleteCategory)

			// Clients
			r.Get("/clients", controllers.GetClients)
			r.Post("/clients", controllers.CreateClient)
			r.Put("/clients/{id}", controllers.UpdateClient)
			r.Delete("/clients/{id}", controllers.DeleteClient)

			// Settings
			r.Put("/settings", controllers.UpdateCompanySettings)
			r.Post("/settings/logo", controllers.UploadLogo)

			// Inventory
			r.Get("/inventory/stock", controllers.GetInventoryStock)
			r.Post("/inventory/replenish", controllers.ReplenishInventory)
			r.Post("/inventory/transfer", controllers.TransferInventory)

			// Sales
			r.Get("/sales", controllers.GetSales)
			r.Post("/sales", controllers.CreateSale)
			r.Get("/sales/{id}/pdf", controllers.DownloadSalePDF)
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
