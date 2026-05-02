package controllers

import (
	"encoding/json"
	"net/http"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/services"
	"github.com/google/uuid"
)

type ReplenishRequest struct {
	ProductID   uuid.UUID `json:"product_id"`
	WarehouseID uuid.UUID `json:"warehouse_id"`
	Quantity    float64   `json:"quantity"`
	Notes       string    `json:"notes"`
}

type TransferRequest struct {
	ProductID         uuid.UUID `json:"product_id"`
	FromWarehouseID   uuid.UUID `json:"from_warehouse_id"`
	ToWarehouseID     uuid.UUID `json:"to_warehouse_id"`
	Quantity          float64   `json:"quantity"`
}

func GetInventoryStock(w http.ResponseWriter, r *http.Request) {
	var items []models.Inventory
	err := database.DB.Select(&items, "SELECT id, product_id, warehouse_id, quantity, min_quantity, location, updated_at FROM inventory")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to load inventory", Details: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func ReplenishInventory(w http.ResponseWriter, r *http.Request) {
	var req ReplenishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid request payload"})
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Database error", Details: err.Error()})
		return
	}

	invSvc := &services.InventoryService{}
	refID := uuid.New()
	err = invSvc.UpdateStock(tx, req.ProductID, req.WarehouseID, req.Quantity, "ENTRY", 0, refID, "inventory_entry", nil, &req.Notes)
	if err != nil {
		tx.Rollback()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to replenish stock", Details: err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to commit stock transaction", Details: err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Replenished successfully"})
}

func TransferInventory(w http.ResponseWriter, r *http.Request) {
	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid request payload"})
		return
	}

	// 1. Check if there is enough stock in the source warehouse
	var currentQuantity float64
	err := database.DB.Get(&currentQuantity, "SELECT COALESCE(quantity, 0) FROM inventory WHERE product_id = $1 AND warehouse_id = $2", req.ProductID, req.FromWarehouseID)
	if err != nil || currentQuantity < req.Quantity {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Not enough stock in the source warehouse to complete transfer"})
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Database error", Details: err.Error()})
		return
	}

	invSvc := &services.InventoryService{}
	refID := uuid.New()
	notesOut := "Transfer Out"
	notesIn := "Transfer In"

	// Deduct from FromWarehouseID
	err = invSvc.UpdateStock(tx, req.ProductID, req.FromWarehouseID, req.Quantity, "TRANSFER_OUT", 0, refID, "transfer", nil, &notesOut)
	if err != nil {
		tx.Rollback()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to deduct source stock during transfer", Details: err.Error()})
		return
	}

	// Increment to ToWarehouseID
	err = invSvc.UpdateStock(tx, req.ProductID, req.ToWarehouseID, req.Quantity, "TRANSFER_IN", 0, refID, "transfer", nil, &notesIn)
	if err != nil {
		tx.Rollback()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to add target stock during transfer", Details: err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to commit transfer transaction", Details: err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Transferred successfully"})
}
