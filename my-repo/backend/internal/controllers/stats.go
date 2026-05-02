package controllers

import (
	"encoding/json"
	"net/http"
	"log"
	"backend/internal/repository"
	"backend/internal/models"
)

func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	stats, err := repository.GetDashboardStats()
	if err != nil {
		log.Println("Error fetching dashboard stats:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to fetch dashboard stats", Details: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
