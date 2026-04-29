package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"backend/internal/models"
	"backend/internal/repository"
)

func GetCompanySettings(w http.ResponseWriter, r *http.Request) {
	settings, err := repository.GetCompanySettings()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Failed to fetch settings"})
		return
	}
	json.NewEncoder(w).Encode(settings)
}

func UpdateCompanySettings(w http.ResponseWriter, r *http.Request) {
	var settings models.CompanySettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := repository.UpdateCompanySettings(&settings); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(settings)
}

func UploadLogo(w http.ResponseWriter, r *http.Request) {
	// 1. Check DB for settings id to update
	settings, err := repository.GetCompanySettings()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// 2. Parse Multipart form
	r.ParseMultipartForm(10 << 20) // 10 MB
	file, handler, err := r.FormFile("logo")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Error Retrieving the File"})
		return
	}
	defer file.Close()

	// 3. Create uploads directory if it doesn't exist
	uploadDir := "./uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.Mkdir(uploadDir, os.ModePerm)
	}

	// 4. Generate unique filename
	ext := filepath.Ext(handler.Filename)
	filename := fmt.Sprintf("logo_%d%s", time.Now().Unix(), ext)
	filepath := filepath.Join(uploadDir, filename)

	// 5. Save the file
	dst, err := os.Create(filepath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// 6. Update DB with URL path
	logoURL := fmt.Sprintf("/uploads/%s", filename)
	if err := repository.UpdateCompanyLogo(settings.ID.String(), logoURL); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	settings.LogoUrl = &logoURL
	json.NewEncoder(w).Encode(settings)
}
