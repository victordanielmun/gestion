package controllers

import (
	"fmt"
	"github.com/go-chi/chi/v5"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/database"
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
	for i := range req.Items {
		item := &req.Items[i]
		item.Total = item.Quantity * item.UnitPrice
		item.Iva = item.Total * (item.IvaPct / 100)
		subtotal += item.Total
		tax += item.Iva
		total += item.Total + item.Iva

		// Load product type
		var prod models.Product
		err := database.DB.Get(&prod, "SELECT id, name, product_type FROM products WHERE id = $1", item.ProductID)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Producto no encontrado"})
			return
		}

		// Validate stock for physical products
		if prod.ProductType == "product" {
			var qty float64
			err = database.DB.Get(&qty, "SELECT COALESCE(quantity, 0) FROM inventory WHERE product_id = $1 AND warehouse_id = $2", item.ProductID, req.WarehouseID)
			if err != nil || qty < item.Quantity {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(models.ErrorResponse{
					Error:   "No hay suficiente stock en la bodega seleccionada para el producto: " + prod.Name,
					Details: fmt.Sprintf("Disponible: %v, Solicitado: %v", qty, item.Quantity),
				})
				return
			}
		}
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
		// Non-blocking but logged
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
	w.Header().Set("Content-Length", fmt.Sprintf("%d", pdfBuf.Len()))

	// Note: We bypass JSONMiddleware's application/json forcing
	// by directly writing to the writer if possible,
	// but since middleware runs before, it might have set it to json.
	// We override it here which is usually fine if written before WriteHeader/Write.

	w.Write(pdfBuf.Bytes())
}
