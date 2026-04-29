package repository

import (
	"backend/internal/database"
	"backend/internal/models"
	"time"
)

func GetCompanySettings() (*models.CompanySettings, error) {
	var settings models.CompanySettings
	query := `SELECT id, name, rut, address, phone, email, website, logo_url, updated_at FROM company_settings LIMIT 1`
	err := database.DB.Get(&settings, query)

	if err != nil && err.Error() == "sql: no rows in result set" {
		queryInsert := `INSERT INTO company_settings (name) VALUES ('Mi Empresa') RETURNING id, name, updated_at`
		err = database.DB.QueryRowx(queryInsert).Scan(&settings.ID, &settings.Name, &settings.UpdatedAt)
	}

	return &settings, err
}

func UpdateCompanySettings(s *models.CompanySettings) error {
	query := `UPDATE company_settings SET name = $1, rut = $2, address = $3, phone = $4, email = $5, website = $6, updated_at = $7 WHERE id = $8 RETURNING logo_url`
	return database.DB.QueryRowx(query, s.Name, s.RUT, s.Address, s.Phone, s.Email, s.Website, time.Now(), s.ID).Scan(&s.LogoUrl)
}

func UpdateCompanyLogo(id string, logoURL string) error {
	_, err := database.DB.Exec(`UPDATE company_settings SET logo_url = $1, updated_at = $2 WHERE id = $3`, logoURL, time.Now(), id)
	return err
}
