package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"backend/internal/models"
	"backend/internal/testutils"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestGetProducts(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "name", "description", "reference", "barcode", "purchase_price", "sale_price", "iva_pct", "expiration_date", "is_active", "created_at", "updated_at"}).
		AddRow(uuid.New(), "Producto A", "Desc A", "REF1", "12345", 10.0, 15.0, 19.0, nil, true, time.Now(), time.Now())

	mock.ExpectQuery(`SELECT id, name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, is_active, created_at, updated_at FROM products WHERE deleted_at IS NULL`).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/products", nil)
	rr := httptest.NewRecorder()

	// Act
	handler := http.HandlerFunc(GetProducts)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusOK, rr.Code)

	var products []models.Product
	err := json.Unmarshal(rr.Body.Bytes(), &products)
	assert.NoError(t, err)
	assert.Len(t, products, 1)
	assert.Equal(t, "Producto A", products[0].Name)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateProduct(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	pInput := models.Product{
		Name:          "Nuevo Producto",
		PurchasePrice: 50.0,
		SalePrice:     80.0,
		IvaPct:        19.0,
		IsActive:      true,
	}

	body, _ := json.Marshal(pInput)
	req, _ := http.NewRequest("POST", "/products", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	id := uuid.New()
	mock.ExpectQuery(`INSERT INTO products`).
		WithArgs(pInput.Name, pInput.Description, pInput.Reference, pInput.Barcode, pInput.PurchasePrice, pInput.SalePrice, pInput.IvaPct, pInput.ExpirationDate, pInput.IsActive).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).AddRow(id, time.Now(), time.Now()))

	// Act
	handler := http.HandlerFunc(CreateProduct)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusCreated, rr.Code)

	var created models.Product
	err := json.Unmarshal(rr.Body.Bytes(), &created)
	assert.NoError(t, err)
	assert.Equal(t, id, created.ID)
	assert.Equal(t, "Nuevo Producto", created.Name)
	assert.NoError(t, mock.ExpectationsWereMet())
}
