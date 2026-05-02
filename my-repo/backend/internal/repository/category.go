package repository

import (
	"backend/internal/database"
	"backend/internal/models"
	"github.com/google/uuid"
	"time"
)

func GetAllCategories() ([]models.Category, error) {
	var categories []models.Category
	query := `SELECT id, name, description, parent_id, created_at, updated_at FROM categories WHERE deleted_at IS NULL ORDER BY name ASC`
	err := database.DB.Select(&categories, query)
	return categories, err
}

func CreateCategory(c *models.Category) error {
	query := `INSERT INTO categories (name, description, parent_id) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`
	return database.DB.QueryRowx(query, c.Name, c.Description, c.ParentID).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func UpdateCategory(c *models.Category) error {
	query := `UPDATE categories SET name = $1, description = $2, parent_id = $3, updated_at = $4 WHERE id = $5 AND deleted_at IS NULL RETURNING updated_at`
	return database.DB.QueryRowx(query, c.Name, c.Description, c.ParentID, time.Now(), c.ID).Scan(&c.UpdatedAt)
}

func DeleteCategory(id uuid.UUID) error {
	_, err := database.DB.Exec(`UPDATE categories SET deleted_at = $1 WHERE id = $2`, time.Now(), id)
	return err
}
