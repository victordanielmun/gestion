package services

import (
	"backend/internal/database"
	"backend/internal/models"
	"fmt"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type InventoryService struct{}

func (s *InventoryService) UpdateStock(tx *sqlx.Tx, productID, warehouseID uuid.UUID, quantity float64, movementType string, unitCost float64, referenceID uuid.UUID, referenceType string, userID *uuid.UUID, notes *string) error {
	// 1. Check current inventory or create it
	var inventory models.Inventory
	err := tx.Get(&inventory, `SELECT id, quantity FROM inventory WHERE product_id = $1 AND warehouse_id = $2`, productID, warehouseID)

	if err != nil {
		// Does not exist, create
		_, err = tx.Exec(`INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)`, productID, warehouseID, 0)
		if err != nil {
			return fmt.Errorf("failed to initialize inventory: %w", err)
		}
	}

	// 2. Adjust quantity based on movement type
	modifier := 1.0
	if movementType == "SALE" || movementType == "TRANSFER_OUT" || movementType == "RETURN" {
		modifier = -1.0
	}

	newQuantity := quantity * modifier

	_, err = tx.Exec(`UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3`, newQuantity, productID, warehouseID)
	if err != nil {
		return fmt.Errorf("failed to update inventory quantity: %w", err)
	}

	// 3. Log movement for auditing (Accounting/Audit logs)
	_, err = tx.Exec(`INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, unit_cost, reference_id, reference_type, user_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		productID, warehouseID, movementType, quantity, unitCost, referenceID, referenceType, userID, notes)
	if err != nil {
		return fmt.Errorf("failed to log inventory movement: %w", err)
	}

	return nil
}

func ProcessSaleInventory(sale *models.Sale, items []models.SaleItem) error {
	tx, err := database.DB.Beginx()
	if err != nil {
		return err
	}

	inventorySvc := &InventoryService{}

	for _, item := range items {
		// Auditing: Create an inventory movement with movement_type 'SALE'
		notes := "Sale generated"
		err := inventorySvc.UpdateStock(tx, item.ProductID, sale.WarehouseID, item.Quantity, "SALE", item.UnitPrice, sale.ID, "sale", &sale.SellerID, &notes)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}
