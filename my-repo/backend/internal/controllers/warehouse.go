package controllers

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"backend/internal/repository"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func GetWarehouses(w http.ResponseWriter, r *http.Request) {
	warehouses, err := repository.GetAllWarehouses()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to fetch warehouses"})
		return
	}
	json.NewEncoder(w).Encode(warehouses)
}

func CreateWarehouse(w http.ResponseWriter, r *http.Request) {
	var warehouse models.Warehouse
	if err := json.NewDecoder(r.Body).Decode(&warehouse); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := repository.CreateWarehouse(&warehouse); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(warehouse)
}

func UpdateWarehouse(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var warehouse models.Warehouse
	if err := json.NewDecoder(r.Body).Decode(&warehouse); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	warehouse.ID = id

	if err := repository.UpdateWarehouse(&warehouse); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(warehouse)
}

func DeleteWarehouse(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := repository.DeleteWarehouse(id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
