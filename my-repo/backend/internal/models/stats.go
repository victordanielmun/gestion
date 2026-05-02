package models

type DashboardStats struct {
	TotalClients     int               `json:"total_clients"`
	ActiveClients    int               `json:"active_clients"`
	TotalRevenue     float64           `json:"total_revenue"`
	TotalExpenses    float64           `json:"total_expenses"`
	RevenueTrend     float64           `json:"revenue_trend"`
	ExpensesTrend    float64           `json:"expenses_trend"`
	ClientsTrend     float64           `json:"clients_trend"`
	MonthlySales     []MonthlyStat     `json:"monthly_sales"`
	RecentSales      []RecentSale      `json:"recent_sales"`
	WarehouseStats   []WarehouseStat   `json:"warehouse_stats"`
}

type MonthlyStat struct {
	Month   string  `db:"month" json:"month"`
	Revenue float64 `db:"revenue" json:"revenue"`
	Expense float64 `db:"expense" json:"expense"`
}

type RecentSale struct {
	ID           string  `db:"id" json:"id"`
	ClientName   string  `db:"client_name" json:"client_name"`
	ProductName  string  `db:"product_name" json:"product_name"`
	Amount       float64 `db:"amount" json:"amount"`
	Status       string  `db:"status" json:"status"`
	Date         string  `db:"date" json:"date"`
}

type WarehouseStat struct {
	Name        string  `db:"name" json:"name"`
	Current     float64 `db:"current" json:"current"`
	Capacity    float64 `db:"capacity" json:"capacity"`
	Percentage  float64 `db:"percentage" json:"percentage"`
	Color       string  `db:"-" json:"color"`
}
