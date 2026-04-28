package models

import (
	"time"
	"github.com/google/uuid"
)

type Warehouse struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Name        string     `db:"name" json:"name"`
	Address     *string    `db:"address" json:"address"`
	City        *string    `db:"city" json:"city"`
	Description *string    `db:"description" json:"description"`
	IsActive    bool       `db:"is_active" json:"is_active"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

type Category struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Name        string     `db:"name" json:"name"`
	Description *string    `db:"description" json:"description"`
	ParentID    *uuid.UUID `db:"parent_id" json:"parent_id"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

type Product struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	Name           string     `db:"name" json:"name"`
	Description    *string    `db:"description" json:"description"`
	Reference      *string    `db:"reference" json:"reference"`
	Barcode        *string    `db:"barcode" json:"barcode"`
	PurchasePrice  float64    `db:"purchase_price" json:"purchase_price"`
	SalePrice      float64    `db:"sale_price" json:"sale_price"`
	IvaPct         float64    `db:"iva_pct" json:"iva_pct"`
	ExpirationDate *time.Time `db:"expiration_date" json:"expiration_date"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time `db:"deleted_at" json:"-"`
}

type Inventory struct {
	ID          uuid.UUID `db:"id" json:"id"`
	ProductID   uuid.UUID `db:"product_id" json:"product_id"`
	WarehouseID uuid.UUID `db:"warehouse_id" json:"warehouse_id"`
	Quantity    float64   `db:"quantity" json:"quantity"`
	MinQuantity float64   `db:"min_quantity" json:"min_quantity"`
	Location    *string   `db:"location" json:"location"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type InventoryMovement struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	ProductID     uuid.UUID  `db:"product_id" json:"product_id"`
	WarehouseID   uuid.UUID  `db:"warehouse_id" json:"warehouse_id"`
	MovementType  string     `db:"movement_type" json:"movement_type"`
	Quantity      float64    `db:"quantity" json:"quantity"`
	UnitCost      float64    `db:"unit_cost" json:"unit_cost"`
	ReferenceID   uuid.UUID  `db:"reference_id" json:"reference_id"`
	ReferenceType string     `db:"reference_type" json:"reference_type"`
	UserID        *uuid.UUID `db:"user_id" json:"user_id"`
	Notes         *string    `db:"notes" json:"notes"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
}

type Client struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	Name       string     `db:"name" json:"name"`
	IdType     string     `db:"id_type" json:"id_type"`
	IdNumber   string     `db:"id_number" json:"id_number"`
	Email      *string    `db:"email" json:"email"`
	Phone      *string    `db:"phone" json:"phone"`
	Mobile     *string    `db:"mobile" json:"mobile"`
	Address    *string    `db:"address" json:"address"`
	City       *string    `db:"city" json:"city"`
	ClientType string     `db:"client_type" json:"client_type"`
	Notes      *string    `db:"notes" json:"notes"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt  *time.Time `db:"deleted_at" json:"-"`
}

type Sale struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	ClientID      uuid.UUID  `db:"client_id" json:"client_id"`
	SellerID      uuid.UUID  `db:"seller_id" json:"seller_id"`
	WarehouseID   uuid.UUID  `db:"warehouse_id" json:"warehouse_id"`
	QuoteID       *uuid.UUID `db:"quote_id" json:"quote_id"`
	Date          time.Time  `db:"date" json:"date"`
	Subtotal      float64    `db:"subtotal" json:"subtotal"`
	Discount      float64    `db:"discount" json:"discount"`
	Tax           float64    `db:"tax" json:"tax"`
	Total         float64    `db:"total" json:"total"`
	AmountPaid    float64    `db:"amount_paid" json:"amount_paid"`
	PaymentMethod string     `db:"payment_method" json:"payment_method"`
	Status        string     `db:"status" json:"status"`
	Notes         *string    `db:"notes" json:"notes"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time `db:"deleted_at" json:"-"`
}

type SaleItem struct {
	ID          uuid.UUID `db:"id" json:"id"`
	SaleID      uuid.UUID `db:"sale_id" json:"sale_id"`
	ProductID   uuid.UUID `db:"product_id" json:"product_id"`
	Quantity    float64   `db:"quantity" json:"quantity"`
	UnitPrice   float64   `db:"unit_price" json:"unit_price"`
	IvaPct      float64   `db:"iva_pct" json:"iva_pct"`
	DiscountPct float64   `db:"discount_pct" json:"discount_pct"`
	Discount    float64   `db:"discount" json:"discount"`
	Iva         float64   `db:"iva" json:"iva"`
	Total       float64   `db:"total" json:"total"`
}
