package repository

import (
	"backend/internal/database"
	"backend/internal/models"
	"github.com/google/uuid"
	"time"
)

func GetAllProducts(categoryID uuid.UUID) ([]models.Product, error) {
	var products []models.Product
	var err error

	query := `SELECT id, name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, product_type, is_active, created_at, updated_at FROM products WHERE deleted_at IS NULL`

	if categoryID != uuid.Nil {
		query = `SELECT p.id, p.name, p.description, p.reference, p.barcode, p.purchase_price, p.sale_price, p.iva_pct, p.expiration_date, p.product_type, p.is_active, p.created_at, p.updated_at 
		FROM products p
		JOIN product_categories pc ON p.id = pc.product_id
		WHERE pc.category_id = $1 AND p.deleted_at IS NULL`
		err = database.DB.Select(&products, query, categoryID)
	} else {
		err = database.DB.Select(&products, query)
	}
	if err != nil {
		return nil, err
	}

	for i := range products {
		var catIDs []uuid.UUID
		err = database.DB.Select(&catIDs, `SELECT category_id FROM product_categories WHERE product_id = $1`, products[i].ID)
		if err == nil {
			products[i].CategoryIDs = catIDs
		}

		var cats []models.Category
		err = database.DB.Select(&cats, `SELECT c.id, c.name, c.description, c.parent_id, c.created_at, c.updated_at FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = $1 AND c.deleted_at IS NULL`, products[i].ID)
		if err == nil {
			products[i].Categories = cats
		}
	}

	return products, nil
}

func CreateProduct(p *models.Product) error {
	tx, err := database.DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `INSERT INTO products (name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, product_type, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at, updated_at`
	err = tx.QueryRowx(query, p.Name, p.Description, p.Reference, p.Barcode, p.PurchasePrice, p.SalePrice, p.IvaPct, p.ExpirationDate, p.ProductType, p.IsActive).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return err
	}

	for _, catID := range p.CategoryIDs {
		_, err = tx.Exec(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, p.ID, catID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func UpdateProduct(p *models.Product) error {
	tx, err := database.DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE products SET name = $1, description = $2, reference = $3, barcode = $4, purchase_price = $5, sale_price = $6, iva_pct = $7, expiration_date = $8, product_type = $9, is_active = $10 WHERE id = $11 AND deleted_at IS NULL RETURNING updated_at`
	err = tx.QueryRowx(query, p.Name, p.Description, p.Reference, p.Barcode, p.PurchasePrice, p.SalePrice, p.IvaPct, p.ExpirationDate, p.ProductType, p.IsActive, p.ID).Scan(&p.UpdatedAt)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM product_categories WHERE product_id = $1`, p.ID)
	if err != nil {
		return err
	}

	for _, catID := range p.CategoryIDs {
		_, err = tx.Exec(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, p.ID, catID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func DeleteProduct(id uuid.UUID) error {
	_, err := database.DB.Exec(`UPDATE products SET deleted_at = $1 WHERE id = $2`, time.Now(), id)
	return err
}

func GetProductByID(id uuid.UUID) (*models.Product, error) {
	var p models.Product
	query := `SELECT id, name, description, reference, barcode, purchase_price, sale_price, iva_pct, expiration_date, product_type, is_active, created_at, updated_at FROM products WHERE id = $1 AND deleted_at IS NULL`
	err := database.DB.Get(&p, query, id)
	if err != nil {
		return nil, err
	}

	var catIDs []uuid.UUID
	err = database.DB.Select(&catIDs, `SELECT category_id FROM product_categories WHERE product_id = $1`, p.ID)
	if err == nil {
		p.CategoryIDs = catIDs
	}

	var cats []models.Category
	err = database.DB.Select(&cats, `SELECT c.id, c.name, c.description, c.parent_id, c.created_at, c.updated_at FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = $1 AND c.deleted_at IS NULL`, p.ID)
	if err == nil {
		p.Categories = cats
	}

	return &p, nil
}
