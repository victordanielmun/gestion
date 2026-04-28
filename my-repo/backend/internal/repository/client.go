package repository

import (
	"github.com/google/uuid"
	"backend/internal/database"
	"backend/internal/models"
)

func GetAllClients() ([]models.Client, error) {
	var clients []models.Client
	query := `SELECT id, name, id_type, id_number, email, phone, mobile, address, city, client_type, notes, created_at, updated_at FROM clients WHERE deleted_at IS NULL`
	err := database.DB.Select(&clients, query)
	return clients, err
}

func CreateClient(c *models.Client) error {
	query := `INSERT INTO clients (name, id_type, id_number, email, phone, mobile, address, city, client_type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at, updated_at`
	return database.DB.QueryRowx(query, c.Name, c.IdType, c.IdNumber, c.Email, c.Phone, c.Mobile, c.Address, c.City, c.ClientType, c.Notes).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func GetClientByID(id uuid.UUID) (*models.Client, error) {
	var c models.Client
	query := `SELECT id, name, id_type, id_number, email, phone, mobile, address, city, client_type, notes, created_at, updated_at FROM clients WHERE id = $1 AND deleted_at IS NULL`
	err := database.DB.Get(&c, query, id)
	return &c, err
}
