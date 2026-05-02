import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  LayoutDashboard, 
  Warehouse, 
  Package, 
  Users as UsersIcon, 
  UserCircle,
  LogOut,
  ShoppingCart,
  Menu,
  X,
  Bell,
  Search,
  LayoutGrid
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface CompanySettings {
  name: string;
  logo_url?: string;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/settings`)
      .then(res => setSettings(res.data))
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Almacenes", icon: Warehouse, path: "/warehouses" },
    { name: "Productos", icon: Package, path: "/products" },
    { name: "Clientes", icon: UserCircle, path: "/clients" },
    { name: "Ventas", icon: ShoppingCart, path: "/sales" },
    { name: "Categorías", icon: LayoutGrid, path: "/categories" },
    { name: "Usuarios", icon: UsersIcon, path: "/users" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-5 right-5 z-[60] w-10 h-10 bg-brand-green text-brand-dark rounded-xl flex items-center justify-center shadow-lg"
      >
        {isMobileOpen ? <X /> : <Menu />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "w-64 min-h-screen bg-brand-sidebar border-r border-white/5 flex flex-col p-6 fixed top-0 bottom-0 z-[56] transition-transform duration-300 lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          {settings?.logo_url ? (
            <img 
              src={`${API_URL.replace('/api/v1', '')}${settings.logo_url}`} 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center text-brand-dark font-display font-extrabold text-lg">
              {settings?.name?.[0] || 'D'}
            </div>
          )}
          <span className="font-display font-extrabold text-xl text-white tracking-tight truncate">
            {settings?.name || 'Cargando...'}
          </span>
        </div>

        {/* Main Menu */}
        <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/30 mb-4 px-2">
          Menú principal
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-brand-green text-brand-dark font-bold shadow-lg shadow-brand-green/20" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px]", "group-hover:scale-110 transition-transform")} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Notifications Section */}
        <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-green to-emerald-400 flex items-center justify-center font-bold text-sm text-brand-dark shadow-lg shadow-brand-green/10 border border-white/10">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight leading-tight truncate w-24">
                  {user?.name?.split(' ')[0] || 'Admin'}
                </span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  En línea
                </span>
              </div>
            </div>
            <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
              <Bell className="w-5 h-5 text-white/40 group-hover:text-brand-green transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-green rounded-full border-2 border-brand-sidebar animate-pulse" />
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-all duration-200 group"
          >
            <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
