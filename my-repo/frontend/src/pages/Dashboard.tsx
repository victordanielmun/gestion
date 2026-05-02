import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users as UsersIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Briefcase,
  ChevronRight,
  Calendar,
  Filter,
  X
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface SaleData {
  id: string;
  client_id: string;
  seller_id: string;
  warehouse_id: string;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  payment_method: string;
  status: string;
  notes?: string;
}

interface ClientData {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface WarehouseData {
  id: string;
  name: string;
}

interface WarehouseStat {
  name: string;
  current: number;
  capacity: number;
  percentage: number;
}

export default function Dashboard() {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStat[]>([]);

  const [loading, setLoading] = useState(true);

  // Filters states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, clientsRes, usersRes, warehousesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/sales`),
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/warehouses`),
        axios.get(`${API_URL}/stats`).catch(() => null)
      ]);

      setSales(salesRes.data || []);
      setClients(clientsRes.data || []);
      setUsers(usersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      
      if (statsRes && statsRes.data && statsRes.data.warehouse_stats) {
        setWarehouseStats(statsRes.data.warehouse_stats);
      } else {
        setWarehouseStats([]);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper getters
  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || "Cliente General";
  };

  const getSellerName = (id: string) => {
    return users.find(u => u.id === id)?.name || "Vendedor General";
  };

  // Real-time dynamic filtering
  const filteredSales = sales.filter(s => {
    // 1. Date filter
    const saleDate = new Date(s.date);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (saleDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (saleDate > end) return false;
    }
    // 2. Seller filter
    if (sellerId && s.seller_id !== sellerId) return false;
    // 3. Client filter
    if (clientId && s.client_id !== clientId) return false;

    return true;
  });

  // Derived metrics based on filtered sales
  const totalClients = Array.from(new Set(filteredSales.map(s => s.client_id))).length;
  const activeClients = Array.from(new Set(filteredSales.filter(s => s.status === "PAID").map(s => s.client_id))).length;
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalExpenses = totalRevenue * 0.3; // Estimated expenses at 30% of revenue for demonstration purposes

  // Group by month for Sales Chart
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthlySalesMap: { [key: string]: { revenue: number; expense: number } } = {};
  
  months.forEach(m => {
    monthlySalesMap[m] = { revenue: 0, expense: 0 };
  });

  filteredSales.forEach(s => {
    const d = new Date(s.date);
    const mName = months[d.getMonth()];
    if (monthlySalesMap[mName]) {
      monthlySalesMap[mName].revenue += s.total;
      monthlySalesMap[mName].expense += s.total * 0.3;
    }
  });

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Ganancias',
        data: months.map(m => monthlySalesMap[m].revenue),
        backgroundColor: '#9EF01A',
        borderRadius: 8,
      },
      {
        label: 'Gastos (Est.)',
        data: months.map(m => monthlySalesMap[m].expense),
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111',
        titleFont: { family: 'Outfit', weight: 'bold' as const },
        padding: 12,
        cornerRadius: 10,
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f3f4f6' }, ticks: { callback: (v: any) => v >= 1000 ? `$${v/1000}k` : `$${v}` } }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center font-display font-bold text-brand-dark/20 text-xl">
      Cargando estadísticas en tiempo real...
    </div>
  );

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Premium Advanced Filters Row */}
      <div className="bg-brand-sidebar p-6 rounded-[32px] border border-white/5 flex flex-col xl:flex-row xl:items-end justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-green/10 blur-[100px] rounded-full" />
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-green" />
            <span className="text-sm font-black tracking-wider uppercase text-white">Panel de Análisis Avanzado</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Fecha Inicial</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none text-white text-xs font-bold focus:ring-2 focus:ring-brand-green/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Fecha Final</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none text-white text-xs font-bold focus:ring-2 focus:ring-brand-green/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Vendedor</label>
              <select 
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none text-white text-xs font-bold focus:ring-2 focus:ring-brand-green/30 cursor-pointer"
              >
                <option value="">Todos los vendedores</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Cliente</label>
              <select 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none text-white text-xs font-bold focus:ring-2 focus:ring-brand-green/30 cursor-pointer"
              >
                <option value="">Todos los clientes</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button 
          onClick={() => { setStartDate(""); setEndDate(""); setSellerId(""); setClientId(""); }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl self-start sm:self-end flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider h-[46px] w-full xl:w-auto px-4"
        >
          <X className="w-4 h-4" />
          Limpiar Filtros
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in">
        <StatCard 
          title="Total Clientes" 
          value={totalClients.toLocaleString()} 
          trend={15.0} 
          icon={<UsersIcon className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Clientes Activos" 
          value={activeClients.toLocaleString()} 
          trend={-5} 
          icon={<Briefcase className="w-5 h-5 text-red-600" />}
          bgColor="bg-red-50"
        />
        <StatCard 
          title="Ganancia Total" 
          value={formatCurrency(totalRevenue)} 
          trend={7.2} 
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard 
          title="Gastos Totales (Est.)" 
          value={formatCurrency(totalExpenses)} 
          trend={-2.1} 
          icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-display font-extrabold text-xl text-brand-dark tracking-tight">Resumen de Ventas</h2>
              <p className="text-black/30 text-sm font-medium">Ganancias vs Gastos Mensuales</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-green" />
                <span className="text-xs font-bold text-black/40">Ganancia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-100" />
                <span className="text-xs font-bold text-black/40">Gasto</span>
              </div>
            </div>
          </div>
          <div className="h-[320px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Schedule / Calendar Placeholder */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-extrabold text-xl text-brand-dark tracking-tight">Agenda POS</h2>
              <span className="text-brand-green bg-brand-dark px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">Hoy</span>
            </div>
            
            <div className="flex gap-2 mb-8 bg-gray-50 p-1 rounded-2xl">
               {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d, i) => (
                 <div key={d} className={cn(
                   "flex-1 flex flex-col items-center py-3 rounded-xl transition-all duration-200",
                   i === 4 ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/10" : "text-black/30 hover:text-black/60 hover:bg-black/5"
                 )}>
                   <span className="text-[10px] font-bold uppercase mb-1">{d}</span>
                   <span className="text-sm font-extrabold">{8 + i}</span>
                 </div>
               ))}
            </div>

            <div className="space-y-4">
              <ScheduleItem title="Corte de Caja Turno 1" time="02:30 PM" person="Admin" color="bg-brand-green" />
              <ScheduleItem title="Sincronizar Stock" time="05:30 PM" person="Jonas K." color="bg-gray-100" />
              <ScheduleItem title="Reporte de Ventas" time="08:00 PM" person="Gerencia" color="bg-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Table based on dynamic filtering */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-black/5 overflow-hidden">
          <div className="flex justify-between items-center mb-8 px-2">
            <h2 className="font-display font-extrabold text-xl text-brand-dark tracking-tight">Últimas Ventas Filtradas</h2>
            <div className="flex items-center gap-2">
                <div className="bg-brand-green text-brand-dark text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest">Coincidencias ({filteredSales.length})</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                  <th className="pb-4 px-4">Cliente</th>
                  <th className="pb-4 px-4">Vendedor</th>
                  <th className="pb-4 px-4">Monto</th>
                  <th className="pb-4 px-4">Estado</th>
                  <th className="pb-4 px-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredSales.slice(0, 5).map(sale => (
                  <tr key={sale.id} className="group hover:bg-gray-50 transition-all duration-200">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center font-extrabold text-xs">
                          {getClientName(sale.client_id).substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-extrabold text-brand-dark tracking-tight">{getClientName(sale.client_id)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-black/50 font-extrabold">{getSellerName(sale.seller_id)}</td>
                    <td className="py-4 px-4 text-sm font-black text-brand-dark">{formatCurrency(sale.total)}</td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        sale.status === 'PAID' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-black/40 font-bold text-right">{new Date(sale.date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-brand-dark/30 font-bold text-sm">
                      No se encontraron ventas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warehouse Capacity info */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
           <div className="flex justify-between items-center mb-8">
            <h2 className="font-display font-extrabold text-xl text-brand-dark tracking-tight">Capacidad Bodegas</h2>
            <span className="text-xs font-extrabold text-brand-green">En Vivo</span>
          </div>

          <div className="space-y-8">
            {warehouseStats.map((w, i) => (
              <div key={w.name}>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold text-brand-dark">{w.name}</span>
                  <span className="text-xs font-black text-brand-green">{Math.round(w.percentage)}%</span>
                </div>
                <div className="h-2.5 w-full bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      i === 0 ? "bg-brand-green shadow-[0_0_12px_rgba(158,240,26,0.2)]" : i === 1 ? "bg-purple-500" : "bg-amber-400"
                    )}
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-black/20 mt-2 uppercase tracking-widest">
                  {w.current.toLocaleString()} / {w.capacity.toLocaleString()} unidades
                </div>
              </div>
            ))}

            {warehouseStats.length === 0 && (
              <div className="space-y-4">
                {warehouses.map((w, i) => (
                  <div key={w.id}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-brand-dark">{w.name}</span>
                      <span className="text-xs font-black text-brand-green">0%</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/5 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green w-0 transition-all duration-1000" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon, bgColor }: { title: string, value: string, trend: number, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white rounded-[32px] p-7 shadow-sm border border-black/5 hover:border-brand-green/30 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-5">
        <span className="text-xs font-bold text-black/30 uppercase tracking-widest">{title}</span>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", bgColor)}>
          {icon}
        </div>
      </div>
      <div className="font-display font-extrabold text-3xl text-brand-dark tracking-tighter mb-3">{value}</div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex items-center gap-0.5 text-[10px] font-black px-2.5 py-1 rounded-full",
          trend > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
        <span className="text-[10px] font-bold text-black/10 uppercase tracking-widest">v. last month</span>
      </div>
    </div>
  );
}

function ScheduleItem({ title, time, person, color }: { title: string, time: string, person: string, color: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer border border-transparent hover:border-black/5">
      <div className={cn("w-1.5 h-10 rounded-full transition-all group-hover:h-12", color)} />
      <div className="flex-1">
        <div className="text-sm font-extrabold text-brand-dark group-hover:text-brand-green transition-colors">{title}</div>
        <div className="text-[10px] font-bold text-black/20 uppercase tracking-widest mt-0.5">{time} · {person}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-black/10 group-hover:text-black/40 transition-colors" />
    </div>
  );
}
