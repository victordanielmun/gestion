package services

import (
	"bytes"
	"fmt"

	"backend/internal/models"
	"backend/internal/repository"
	"github.com/jung-kurt/gofpdf"
)

func GenerateInvoicePDF(sale *models.Sale, items []models.SaleItem) (*bytes.Buffer, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 10, "Factura de Venta / Invoice", "0", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Fetch Client Info
	clientInfo := "Cliente: Desconocido"
	client, err := repository.GetClientByID(sale.ClientID)
	if err == nil {
		clientInfo = fmt.Sprintf("Cliente: %s (ID: %s %s)", client.Name, client.IdType, client.IdNumber)
	}

	pdf.SetFont("Arial", "", 12)
	pdf.CellFormat(100, 8, clientInfo, "", 0, "L", false, 0, "")
	pdf.CellFormat(90, 8, fmt.Sprintf("Fecha: %s", sale.Date.Format("2006-01-02")), "", 1, "R", false, 0, "")

	pdf.CellFormat(100, 8, fmt.Sprintf("Venta ID: %s", sale.ID.String()[:8]), "", 0, "L", false, 0, "")
	pdf.CellFormat(90, 8, fmt.Sprintf("Estado: %s", sale.Status), "", 1, "R", false, 0, "")
	pdf.Ln(10)

	// Table Header
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(200, 200, 200)
	pdf.CellFormat(80, 8, "Producto", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, "Cant.", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "Precio Unit", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, "IVA", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "Total", "1", 1, "C", true, 0, "")

	// Table Body
	pdf.SetFont("Arial", "", 10)
	for _, item := range items {
		prodName := "Unknown Product"
		product, err := repository.GetProductByID(item.ProductID)
		if err == nil {
			prodName = product.Name
		}

		if len(prodName) > 35 {
			prodName = prodName[:32] + "..."
		}

		pdf.CellFormat(80, 8, prodName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 8, fmt.Sprintf("%.2f", item.Quantity), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("$%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(25, 8, fmt.Sprintf("$%.2f", item.Iva), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("$%.2f", item.Total), "1", 1, "R", false, 0, "")
	}
	pdf.Ln(5)

	// Totals
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(135, 8, "Subtotal", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 8, fmt.Sprintf("$%.2f", sale.Subtotal), "1", 1, "R", false, 0, "")

	pdf.CellFormat(135, 8, "Descuento", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 8, fmt.Sprintf("$%.2f", sale.Discount), "1", 1, "R", false, 0, "")

	pdf.CellFormat(135, 8, "Impuestos (IVA)", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 8, fmt.Sprintf("$%.2f", sale.Tax), "1", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(135, 10, "TOTAL", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 10, fmt.Sprintf("$%.2f", sale.Total), "1", 1, "R", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}

	return &buf, nil
}
