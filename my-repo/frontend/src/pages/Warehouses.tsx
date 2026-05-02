import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  Warehouse, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  Package,
  Clipboard
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  city: string;
  description: string;
  is_active: boolean;
}

interface ProductData {
  id: string;
  name: string;
  reference?: string;
  barcode?: string;
}

export default function Warehouses() {
  const [activeTab, setActiveTab] = useState<"list" | "replenish">("list");
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Warehouse Create/Edit Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Replenish Form states
  const [replenishWarehouseId, setReplenishWarehouseId] = useState("");
  const [replenishProductId, setReplenishProductId] = useState("");
  const [replenishQuantity, setReplenishQuantity] = useState(0);
  const [replenishNotes, setReplenishNotes] = useState("");

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${API_URL}/warehouses`);
      setWarehouses(res.data || []);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
      setWarehouses([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setCity("");
    setDescription("");
    setIsActive(true);
    setEditingWarehouse(null);
  };

  const handleEdit = (w: WarehouseData) => {
    setEditingWarehouse(w);
    setName(w.name);
    setAddress(w.address || "");
    setCity(w.city || "");
    setDescription(w.description || "");
    setIsActive(w.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name,
        address,
        city,
        description,
        is_active: isActive
      };

      if (editingWarehouse) {
        await axios.put(`${API_URL}/warehouses/${editingWarehouse.id}`, data);
      } else {
        await axios.post(`${API_URL}/warehouses`, data);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (err) {
      console.error("Error saving warehouse:", err);
    }
  };

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishWarehouseId || !replenishProductId || replenishQuantity <= 0) {
       alert("Por favor, selecciona un almacén, un producto y una cantidad válida.");
       return;
    }
    try {
      await axios.post(`${API_URL}/inventory/replenish`, {
        product_id: replenishProductId,
        warehouse_id: replenishWarehouseId,
        quantity: replenishQuantity,
        notes: replenishNotes
      });
      alert("¡Existencias de inventario registradas correctamente!");
      setReplenishWarehouseId("");
      setReplenishProductId("");
      setReplenishQuantity(0);
      setReplenishNotes("");
      setActiveTab("list");
    } catch (err) {
      console.error("Error replenishing inventory:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/warehouses/${id}`);
      setDeleteConfirmId(null);
      fetchWarehouses();
    } catch (err) {
      console.error("Error deleting warehouse:", err);
    }
  };

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.city && w.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Almacenes</h1>
            <p className="text-white/80 text-sm font-bold">Controla la ubicación, estado y existencias de tus bodegas.</p>
          </div>
        </div>

        <div className="flex bg-white/5 border border-white/5 p-1.5 rounded-2xl self-start xl:self-center select-none">
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === "list" ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20" : "text-white/50 hover:text-white"
            )}
          >
            Lista de Almacenes
          </button>
          <button
            onClick={() => setActiveTab("replenish")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === "replenish" ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20" : "text-white/50 hover:text-white"
            )}
          >
            Ingreso de Inventario
          </button>
        </div>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
              <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o ciudad..." 
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/40 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-brand-green text-brand-dark px-6 py-2.5 rounded-2xl font-extrabold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20 flex-1 sm:flex-none"
            >
              <Plus className="w-5 h-5" />
              Nuevo Almacén
            </button>
          </div>

          {/* Main Table Content */}
          <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[14px] font-bold uppercase tracking-wide text-brand-dark">
                    <th className="px-10 py-5 text-left">Almacén</th>
                    <th className="px-10 py-5 text-left">Ubicación</th>
                    <th className="px-10 py-5 text-left">Estado</th>
                    <th className="px-10 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map((w) => (
                    <tr 
                      key={w.id} 
                      className="group transition-all duration-300 ease-out cursor-pointer"
                    >
                      <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-10 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-white border border-black/10 flex items-center justify-center font-display font-black text-brand-dark group-hover:from-white/10 group-hover:to-white/5 group-hover:border-white/10 group-hover:text-white transition-all text-sm">
                            {w.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors">{w.name}</div>
                            <div className="text-brand-dark/40 text-xs font-bold mt-0.5 group-hover:text-white/40 truncate w-48">
                               {w.description || "Sin descripción"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2 text-sm font-bold text-brand-dark/70 group-hover:text-white/60 tracking-tight transition-colors">
                              <MapPin className="w-3.5 h-3.5" />
                              {w.city || "N/A"}
                           </div>
                           <div className="text-[11px] text-brand-dark/30 group-hover:text-white/30 font-medium ml-5 mt-0.5">
                              {w.address || "Dirección no especificada"}
                           </div>
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          w.is_active 
                            ? "bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-brand-dark" 
                            : "bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {w.is_active ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card rounded-r-[32px] px-10 py-5 transition-colors text-right border-y border-r border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(w); }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-white hover:text-brand-dark transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {deleteConfirmId === w.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                                className="px-3 h-10 flex items-center justify-center bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                              >
                                Sí, eliminar
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                className="w-10 h-10 flex items-center justify-center bg-gray-200 text-brand-dark/60 rounded-xl hover:bg-gray-300 transition-all font-bold text-xs"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(w.id); }}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stock Replenishment Form */
        <div className="bg-brand-sidebar p-6 lg:p-10 rounded-[32px] border border-white/5 relative overflow-hidden h-fit">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
          <h2 className="font-display font-black text-xl text-white tracking-tight mb-6">Suministrar e Ingresar Stock</h2>

          <form onSubmit={handleReplenish} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Almacén (Bodega)</label>
              <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                <Building2 className="w-4 h-4 text-brand-dark/30" />
                <select
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                  value={replenishWarehouseId}
                  onChange={(e) => setReplenishWarehouseId(e.target.value)}
                  required
                >
                  <option value="">Selecciona un almacén</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Producto</label>
              <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                <Package className="w-4 h-4 text-brand-dark/30" />
                <select
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                  value={replenishProductId}
                  onChange={(e) => setReplenishProductId(e.target.value)}
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Cantidad a Ingresar</label>
              <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                <Clipboard className="w-4 h-4 text-brand-dark/30" />
                <input
                  type="number"
                  placeholder="Ej. 100"
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold"
                  value={replenishQuantity || ""}
                  onChange={(e) => setReplenishQuantity(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Notas</label>
              <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                <FileText className="w-4 h-4 text-brand-dark/30" />
                <input
                  type="text"
                  placeholder="Observaciones del ingreso..."
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/30 font-extrabold"
                  value={replenishNotes}
                  onChange={(e) => setReplenishNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-brand-green text-brand-dark rounded-xl font-black text-sm hover:scale-105 transition-all shadow-lg shadow-brand-green/20"
              >
                Ingresar Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-brand-sidebar border border-white/5 w-full max-w-xl rounded-[32px] p-6 lg:p-10 shadow-2xl relative overflow-hidden animate-fade-in select-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-white tracking-tight">
                    {editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén'}
                  </h3>
                  <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider">
                    Completa la información de la bodega.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70 ml-2">
                  Nombre del Almacén
                </label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <Building2 className="w-4 h-4 text-brand-dark/30" />
                  <input 
                    type="text" 
                    placeholder="Ej. Bodega Principal" 
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70 ml-2">
                    Dirección
                  </label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <MapPin className="w-4 h-4 text-brand-dark/30" />
                    <input 
                      type="text" 
                      placeholder="Calle 10 # 2-33" 
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70 ml-2">
                    Ciudad
                  </label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <MapPin className="w-4 h-4 text-brand-dark/30" />
                    <input 
                      type="text" 
                      placeholder="Ej. Medellín" 
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70 ml-2">
                  Descripción / Notas
                </label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FileText className="w-4 h-4 text-brand-dark/30" />
                  <input 
                    type="text" 
                    placeholder="Información adicional sobre la bodega" 
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl select-none">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", isActive ? "bg-brand-green" : "bg-red-500")} />
                  <div>
                    <div className="text-xs font-black text-white tracking-wide">Estado del Almacén</div>
                    <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                      {isActive ? 'Activo para operaciones' : 'Inactivo para operaciones'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green" />
                </label>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-brand-green text-brand-dark px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-green/20 mt-2"
              >
                <Check className="w-5 h-5" />
                {editingWarehouse ? 'Guardar Cambios' : 'Crear Almacén'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
