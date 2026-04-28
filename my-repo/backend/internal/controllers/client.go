package controllers

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"backend/internal/repository"
)

func GetClients(w http.ResponseWriter, r *http.Request) {
	clients, err := repository.GetAllClients()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(clients)
}

func CreateClient(w http.ResponseWriter, r *http.Request) {
	var client models.Client
	if err := json.NewDecoder(r.Body).Decode(&client); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := repository.CreateClient(&client); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(client)
}
