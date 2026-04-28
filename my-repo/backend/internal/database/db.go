package database

import (
	"fmt"
	"log"
	"os"

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

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalln("Failed to connect to database:", err)
	}

	DB = db
	log.Println("Successfully connected to the database")
}
