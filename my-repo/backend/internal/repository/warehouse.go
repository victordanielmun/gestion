package repository

import (
	"backend/internal/database"
	"backend/internal/models"
	"github.com/google/uuid"
	"time"
)

func GetAllWarehouses() ([]models.Warehouse, error) {
	var warehouses []models.Warehouse
	query := `SELECT id, name, address, city, description, is_active, created_at, updated_at FROM warehouses WHERE deleted_at IS NULL`
	err := database.DB.Select(&warehouses, query)
	return warehouses, err
}

func CreateWarehouse(w *models.Warehouse) error {
	query := `INSERT INTO warehouses (name, address, city, description, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	return database.DB.QueryRowx(query, w.Name, w.Address, w.City, w.Description, w.IsActive).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
}

func UpdateWarehouse(w *models.Warehouse) error {
	query := `UPDATE warehouses SET name = $1, address = $2, city = $3, description = $4, is_active = $5 WHERE id = $6 AND deleted_at IS NULL RETURNING updated_at`
	return database.DB.QueryRowx(query, w.Name, w.Address, w.City, w.Description, w.IsActive, w.ID).Scan(&w.UpdatedAt)
}

func DeleteWarehouse(id uuid.UUID) error {
	_, err := database.DB.Exec(`UPDATE warehouses SET deleted_at = $1 WHERE id = $2`, time.Now(), id)
	return err
}
