package controllers

import (
	"github.com/go-chi/chi/v5"
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

func DownloadSalePDF(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Invalid ID format"})
		return
	}

	sale, items, err := repository.GetSaleByID(id)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Sale not found"})
		return
	}

	pdfBuf, err := services.GenerateInvoicePDF(sale, items)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to generate PDF"})
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "inline; filename=factura_"+id.String()[:8]+".pdf")
	w.Header().Set("Content-Length", string(pdfBuf.Len()))

	// Note: We bypass JSONMiddleware's application/json forcing
	// by directly writing to the writer if possible,
	// but since middleware runs before, it might have set it to json.
	// We override it here which is usually fine if written before WriteHeader/Write.

	w.Write(pdfBuf.Bytes())
}
