package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/services"
	"github.com/google/uuid"
)

type CreateSaleRequest struct {
	ClientID      uuid.UUID         `json:"client_id"`
	WarehouseID   uuid.UUID         `json:"warehouse_id"`
	PaymentMethod string            `json:"payment_method"`
	Items         []models.SaleItem `json:"items"`
}

func CreateSale(w http.ResponseWriter, r *http.Request) {
	var req CreateSaleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	sellerID, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var subtotal, tax, total float64
	for _, item := range req.Items {
		item.Total = item.Quantity * item.UnitPrice
		item.Iva = item.Total * (item.IvaPct / 100)
		subtotal += item.Total
		tax += item.Iva
		total += item.Total + item.Iva
	}

	sale := models.Sale{
		ClientID:      req.ClientID,
		SellerID:      sellerID,
		WarehouseID:   req.WarehouseID,
		Date:          time.Now(),
		Subtotal:      subtotal,
		Tax:           tax,
		Total:         total,
		AmountPaid:    total,
		PaymentMethod: req.PaymentMethod,
		Status:        "PAID",
	}

	if err := repository.CreateSale(&sale, req.Items); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to create sale", Details: err.Error()})
		return
	}

	// Auditing / Inventory
	if err := services.ProcessSaleInventory(&sale, req.Items); err != nil {
		// Non-blocking but should be logged realistically
		// Could send a warning response
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sale)
}

func GetSales(w http.ResponseWriter, r *http.Request) {
	sales, err := repository.GetAllSales()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(sales)
}
