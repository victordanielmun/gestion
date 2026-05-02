package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"backend/internal/utils"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func Connect() {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost" // for local non-docker testing if needed
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "admin"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "adminpassword"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "inventory_db"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	var db *sqlx.DB
	var err error
	for i := 1; i <= 10; i++ {
		db, err = sqlx.Connect("postgres", dsn)
		if err == nil {
			break
		}
		log.Printf("Attempt %d/10: Failed to connect to database (%s), retrying in 2 seconds...", i, err.Error())
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalln("Failed to connect to database after retries:", err)
	}

	DB = db
	log.Println("Successfully connected to the database")

	_, _ = DB.Exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'product'`)

	Seed()
}

func Seed() {
	// 1. Ensure admin role exists and get its ID
	var roleID string
	err := DB.Get(&roleID, "SELECT id FROM roles WHERE name = 'admin'")
	if err != nil {
		log.Println("Admin role not found, seeding roles...")
		// The roles are seeded in init.sql, but if for some reason they aren't:
		_, err = DB.Exec(`INSERT INTO roles (name, permissions) VALUES 
			('admin', '{"users":true,"roles":true,"warehouses":true,"products":true,"inventory":true,"sales":true,"invoices":true,"reports":true}'),
			('operario', '{"users":false,"roles":false,"warehouses":true,"products":true,"inventory":true,"sales":false,"invoices":false,"reports":false}')
			ON CONFLICT (name) DO NOTHING`)
		if err != nil {
			log.Println("Error seeding admin role:", err)
			return
		}
		DB.Get(&roleID, "SELECT id FROM roles WHERE name = 'admin'")
	}

	// 2. Check if admin user exists
	var exists bool
	err = DB.Get(&exists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@empresa.com')")
	if err != nil {
		log.Println("Error checking for admin user:", err)
		return
	}

	passwordHash, err := utils.HashPassword("admin123")
	if err != nil {
		log.Println("Error hashing password during seed:", err)
		return
	}

	if !exists {
		log.Println("Admin user not found, seeding...")
		_, err = DB.Exec(`INSERT INTO users (name, email, password_hash, role_id, is_active) 
			VALUES ($1, $2, $3, $4, $5)`, 
			"Administrador", "admin@empresa.com", passwordHash, roleID, true)
		
		if err != nil {
			log.Println("Error seeding admin user:", err)
		} else {
			log.Println("Admin user seeded successfully (Email: admin@empresa.com, Pass: admin123)")
		}
	} else {
		log.Println("Admin user found, ensuring valid password hash...")
		_, err = DB.Exec(`UPDATE users SET password_hash = $1, is_active = true WHERE email = 'admin@empresa.com'`, passwordHash)
		if err != nil {
			log.Println("Error updating admin password hash:", err)
		} else {
			log.Println("Admin user password hash updated successfully")
		}
	}

	// 3. Seed generic client
	var clientExists bool
	err = DB.Get(&clientExists, "SELECT EXISTS(SELECT 1 FROM clients WHERE name = 'Cliente Genérico')")
	if err == nil && !clientExists {
		_, err = DB.Exec(`INSERT INTO clients (name, id_type, id_number, email, phone, mobile, address, city, client_type, notes) 
			VALUES ('Cliente Genérico', 'CC', '222222222222', '', '', '', '', '', 'PERSONA_NATURAL', 'Seeded POS Client')`)
		if err != nil {
			log.Println("Error seeding generic client:", err)
		} else {
			log.Println("Generic client seeded successfully")
		}
	}
}
