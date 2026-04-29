package testutils

import (
	"backend/internal/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	"log"
)

func SetupDBMock() (sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	if err != nil {
		log.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
	}

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	database.DB = sqlxDB

	cleanup := func() {
		db.Close()
	}

	return mock, cleanup
}
