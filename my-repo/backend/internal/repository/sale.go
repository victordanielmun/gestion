package repository

import (
	"backend/internal/database"
	"backend/internal/models"
)

func CreateSale(s *models.Sale, items []models.SaleItem) error {
	tx, err := database.DB.Beginx()
	if err != nil {
		return err
	}

	query := `INSERT INTO sales (client_id, seller_id, warehouse_id, quote_id, date, subtotal, discount, tax, total, amount_paid, payment_method, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, created_at, updated_at`
	err = tx.QueryRowx(query, s.ClientID, s.SellerID, s.WarehouseID, s.QuoteID, s.Date, s.Subtotal, s.Discount, s.Tax, s.Total, s.AmountPaid, s.PaymentMethod, s.Status, s.Notes).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		tx.Rollback()
		return err
	}

	for i := range items {
		item := &items[i]
		itemQuery := `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, iva_pct, discount_pct, discount, iva, total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`
		err = tx.QueryRowx(itemQuery, s.ID, item.ProductID, item.Quantity, item.UnitPrice, item.IvaPct, item.DiscountPct, item.Discount, item.Iva, item.Total).Scan(&item.ID)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func GetAllSales() ([]models.Sale, error) {
	var sales []models.Sale
	query := `SELECT id, client_id, seller_id, warehouse_id, quote_id, date, subtotal, discount, tax, total, amount_paid, payment_method, status, notes, created_at, updated_at FROM sales WHERE deleted_at IS NULL`
	err := database.DB.Select(&sales, query)
	return sales, err
}
