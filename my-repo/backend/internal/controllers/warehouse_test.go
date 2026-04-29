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

func TestGetWarehouses(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "name", "address", "city", "description", "is_active", "created_at", "updated_at"}).
		AddRow(uuid.New(), "Principal", "Calle 123", "Bogota", "Bodega central", true, time.Now(), time.Now())

	mock.ExpectQuery(`SELECT id, name, address, city, description, is_active, created_at, updated_at FROM warehouses WHERE deleted_at IS NULL`).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/warehouses", nil)
	rr := httptest.NewRecorder()

	// Act
	handler := http.HandlerFunc(GetWarehouses)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusOK, rr.Code)

	var warehouses []models.Warehouse
	err := json.Unmarshal(rr.Body.Bytes(), &warehouses)
	assert.NoError(t, err)
	assert.Len(t, warehouses, 1)
	assert.Equal(t, "Principal", warehouses[0].Name)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateWarehouse(t *testing.T) {
	// Arrange
	mock, cleanup := testutils.SetupDBMock()
	defer cleanup()

	addr := "Av 456"
	city := "Medellin"
	desc := "Bodega secundaria"
	wInput := models.Warehouse{
		Name:        "Secundaria",
		Address:     &addr,
		City:        &city,
		Description: &desc,
		IsActive:    true,
	}

	body, _ := json.Marshal(wInput)
	req, _ := http.NewRequest("POST", "/warehouses", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	id := uuid.New()
	mock.ExpectQuery(`INSERT INTO warehouses`).
		WithArgs(wInput.Name, wInput.Address, wInput.City, wInput.Description, wInput.IsActive).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).AddRow(id, time.Now(), time.Now()))

	// Act
	handler := http.HandlerFunc(CreateWarehouse)
	handler.ServeHTTP(rr, req)

	// Assert
	assert.Equal(t, http.StatusCreated, rr.Code)

	var created models.Warehouse
	err := json.Unmarshal(rr.Body.Bytes(), &created)
	assert.NoError(t, err)
	assert.Equal(t, id, created.ID)
	assert.Equal(t, "Secundaria", created.Name)
	assert.NoError(t, mock.ExpectationsWereMet())
}
