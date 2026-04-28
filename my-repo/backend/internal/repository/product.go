package repository

import (
	"backend/internal/database"
	"backend/internal/models"
	"github.com/google/uuid"
	"time"
)

func GetAllProducts() ([]models.Product, error) {
	var products []models.Product
	query := `SELECT id, name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, is_active, created_at, updated_at FROM products WHERE deleted_at IS NULL`
	err := database.DB.Select(&products, query)
	return products, err
}

func CreateProduct(p *models.Product) error {
	query := `INSERT INTO products (name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at, updated_at`
	return database.DB.QueryRowx(query, p.Name, p.Description, p.Reference, p.Barcode, p.PurchasePrice, p.SalePrice, p.IvaPct, p.ExpirationDate, p.IsActive).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func UpdateProduct(p *models.Product) error {
	query := `UPDATE products SET name = $1, description = $2, reference = $3, barcode = $4, purchase_price = $5, sale_price = $6, iva_pct = $7, expiration_date = $8, is_active = $9 WHERE id = $10 AND deleted_at IS NULL RETURNING updated_at`
	return database.DB.QueryRowx(query, p.Name, p.Description, p.Reference, p.Barcode, p.PurchasePrice, p.SalePrice, p.IvaPct, p.ExpirationDate, p.IsActive, p.ID).Scan(&p.UpdatedAt)
}

func DeleteProduct(id uuid.UUID) error {
	_, err := database.DB.Exec(`UPDATE products SET deleted_at = $1 WHERE id = $2`, time.Now(), id)
	return err
}
