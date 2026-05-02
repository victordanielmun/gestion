import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search,
  Tag,
  Barcode,
  DollarSign,
  Layers,
  Wrench,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Settings2,
  Eye,
  EyeOff,
  Columns
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface Product {
  id: string;
  name: string;
  description: string;
  reference: string;
  barcode: string;
  purchase_price: number;
  sale_price: number;
  iva_pct: number;
  product_type: string;
  is_active: boolean;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ColumnConfig {
  id: keyof Product | 'actions' | 'info' | 'hierarchy';
  label: string;
  visible: boolean;
  alwaysVisible?: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Dynamic Column Configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'info', label: 'Producto / Info', visible: true, alwaysVisible: true },
    { id: 'reference', label: 'Referencia / EAN', visible: true },
    { id: 'sale_price', label: 'Precios', visible: true },
    { id: 'purchase_price', label: 'Costo Compra', visible: false },
    { id: 'iva_pct', label: 'IVA (%)', visible: false },
    { id: 'expiration_date', label: 'Vencimiento', visible: true },
    { id: 'is_active', label: 'Estado / Registro', visible: true },
    { id: 'actions', label: 'Acciones', visible: true, alwaysVisible: true },
  ]);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [barcode, setBarcode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [ivaPct, setIvaPct] = useState<string>("19");
  const [productType, setProductType] = useState("product");
  const [isActive, setIsActive] = useState(true);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    }
  };

  const toggleColumn = (colId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === colId && !col.alwaysVisible 
        ? { ...col, visible: !col.visible } 
        : col
    ));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setReference("");
    setBarcode("");
    setPurchasePrice(0);
    setSalePrice(0);
    setIvaPct("19");
    setProductType("product");
    setIsActive(true);
    setHasExpiration(false);
    setExpirationDate("");
    setEditingProduct(null);
    setErrorMsg(null);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setReference(p.reference || "");
    setBarcode(p.barcode || "");
    setPurchasePrice(p.purchase_price);
    setSalePrice(p.sale_price);
    setIvaPct(p.iva_pct.toString());
    setProductType(p.product_type || "product");
    setIsActive(p.is_active);
    setHasExpiration(p.expiration_date !== null);
    setExpirationDate(p.expiration_date ? p.expiration_date.split('T')[0] : "");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const data = {
        name,
        description: description === "" ? null : description,
        reference: reference === "" ? null : reference,
        barcode: barcode === "" ? null : barcode,
        purchase_price: Number(purchasePrice),
        sale_price: Number(salePrice),
        iva_pct: Number(ivaPct),
        product_type: productType,
        is_active: isActive,
        expiration_date: (hasExpiration && expirationDate !== "") ? new Date(expirationDate).toISOString() : null
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, data);
      } else {
        await axios.post(`${API_URL}/products`, data);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      console.error("Error saving product:", err);
      setErrorMsg(err.response?.data?.message || "Error al guardar el producto. Verifica los campos.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/products/${id}`);
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isVisible = (colId: string) => columns.find(c => c.id === colId)?.visible;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Catálogo Inteligente</h1>
            <p className="text-white/80 text-sm font-bold">Personaliza tu vista y gestiona tu inventario.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/40 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-sm transition-all border",
              isConfigOpen ? "bg-white text-brand-dark border-white shadow-xl" : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            )}
          >
            <Settings2 className="w-5 h-5" />
            Vistas
          </button>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-brand-green text-brand-dark px-6 py-2.5 rounded-2xl font-extrabold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20 flex-1 sm:flex-none"
          >
            <Plus className="w-5 h-5" />
            Nuevo Ítem
          </button>
        </div>
      </div>

      {/* Dynamic Column Config Panel */}
      {isConfigOpen && (
        <div className="bg-brand-sidebar/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 animate-fade-down">
          <div className="flex items-center gap-3 mb-4">
            <Columns className="w-5 h-5 text-brand-green" />
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">Configurar Columnas de la Tabla</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {columns.map(col => (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                disabled={col.alwaysVisible}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border",
                  col.visible 
                    ? "bg-brand-green/20 text-brand-green border-brand-green/30" 
                    : "bg-white/5 text-white/30 border-white/5 grayscale"
                )}
              >
                {col.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[12px] font-bold uppercase tracking-wide text-brand-dark/60">
                {columns.filter(c => c.visible).map(col => (
                  <th key={col.id} className={cn("px-6 py-4", col.id === 'actions' ? "text-right" : "text-left")}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr 
                  key={p.id} 
                  className="group transition-all duration-300 ease-out cursor-pointer"
                >
                  {isVisible('info') && (
                    <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-6 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shrink-0",
                          p.product_type === 'service' 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                            : "bg-brand-green/10 border-brand-green/20 text-brand-green"
                        )}>
                          {p.product_type === 'service' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors truncate w-40">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                              p.product_type === 'service' ? "border-blue-500/20 text-blue-500" : "border-brand-green/20 text-brand-green"
                            )}>
                              {p.product_type === 'service' ? 'Srv' : 'Prd'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible('reference') && (
                    <td className="bg-white group-hover:bg-brand-card px-6 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs font-black text-brand-dark/80 group-hover:text-white/90">
                           <Layers className="w-3 h-3 opacity-30" />
                           {p.reference || "---"}
                        </div>
                        <div className="text-[10px] text-brand-dark/40 group-hover:text-white/40 font-bold mt-1">
                           {p.barcode || "Sin barcode"}
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible('sale_price') && (
                    <td className="bg-white group-hover:bg-brand-card px-6 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex flex-col">
                        <div className="text-sm font-black text-brand-dark group-hover:text-brand-green">
                           ${p.sale_price.toLocaleString('es-CO')}
                        </div>
                        {isVisible('iva_pct') && (
                          <div className="text-[9px] font-black text-brand-green/60 uppercase tracking-widest mt-0.5">
                             IVA {p.iva_pct}%
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {isVisible('purchase_price') && (
                    <td className="bg-white group-hover:bg-brand-card px-6 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="text-xs font-bold text-brand-dark/50 group-hover:text-white/50">
                        ${p.purchase_price.toLocaleString('es-CO')}
                      </div>
                    </td>
                  )}

                  {isVisible('expiration_date') && (
                    <td className="bg-white group-hover:bg-brand-card px-6 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex items-center gap-2.5">
                        <Calendar className={cn("w-4 h-4", p.expiration_date ? "text-amber-500" : "text-gray-200 group-hover:text-white/10")} />
                        <span className="text-xs font-bold text-brand-dark/70 group-hover:text-white/70">
                          {formatDate(p.expiration_date)}
                        </span>
                      </div>
                    </td>
                  )}

                  {isVisible('is_active') && (
                    <td className="bg-white group-hover:bg-brand-card px-6 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", p.is_active ? "bg-brand-green" : "bg-red-500")} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", p.is_active ? "text-brand-green" : "text-red-500")}>
                            {p.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-brand-dark/30 group-hover:text-white/30">
                          ID: {p.id.substring(0, 8)}
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible('actions') && (
                    <td className="bg-white group-hover:bg-brand-card rounded-r-[32px] px-6 py-5 transition-colors text-right border-y border-r border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                      <div className="flex items-center justify-end gap-2 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-white hover:text-brand-dark transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-all group-hover:bg-red-400/20 group-hover:border-red-400/20 group-hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern CRUD Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-brand-sidebar w-full max-w-2xl rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 lg:p-10 animate-fade-up overflow-hidden my-auto">
            {/* Modal Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20 shadow-inner">
                    {editingProduct ? <Edit2 className="w-7 h-7 text-brand-green" /> : <Plus className="w-7 h-7 text-brand-green" />}
                 </div>
                 <div>
                   <h2 className="font-display font-black text-2xl text-white tracking-tight">{editingProduct ? 'Editar Ítem' : 'Nuevo Ítem'}</h2>
                   <p className="text-white/40 text-xs font-medium mt-0.5">Gestión integral del catálogo maestro.</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-500 text-xs font-black uppercase tracking-widest">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              {/* Type & Status Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/5 rounded-3xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setProductType("product")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all",
                      productType === 'product' ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20" : "text-white/30 hover:text-white"
                    )}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Producto
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType("service")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all",
                      productType === 'service' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-white/30 hover:text-white"
                    )}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Servicio
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/5 rounded-3xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all",
                      isActive ? "bg-brand-green/20 text-brand-green border border-brand-green/30" : "text-white/30 hover:text-white"
                    )}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all",
                      !isActive ? "bg-red-500/20 text-red-500 border border-red-500/30" : "text-white/30 hover:text-white"
                    )}
                  >
                    Inactivo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Nombre Comercial</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Tag className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="Nombre del producto o servicio"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Referencia / SKU</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Layers className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="Referencia interna"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Precio Compra</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <DollarSign className="w-4 h-4 text-brand-dark/30" />
                    <input
                      type="number"
                      placeholder="0"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      disabled={productType === 'service'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Precio Venta</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <DollarSign className="w-4 h-4 text-brand-dark/30" />
                    <input
                      type="number"
                      placeholder="0"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">IVA (%)</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <input
                      type="number"
                      placeholder="19"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={ivaPct}
                      onChange={(e) => setIvaPct(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Código de Barras</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Barcode className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="EAN-13 / UPC"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      disabled={productType === 'service'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-white/80">Vencimiento</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <span className="text-[9px] font-black uppercase text-white/30 group-hover:text-white transition-colors">¿Vence?</span>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={hasExpiration} 
                        onChange={(e) => setHasExpiration(e.target.checked)}
                        disabled={productType === 'service'}
                      />
                      <div className={cn(
                        "w-8 h-4 rounded-full transition-all relative border border-white/10",
                        hasExpiration ? "bg-brand-green" : "bg-white/5"
                      )}>
                        <div className={cn(
                          "absolute top-1 left-1 w-2 h-2 rounded-full transition-all",
                          hasExpiration ? "translate-x-4 bg-brand-dark" : "bg-white/20"
                        )} />
                      </div>
                    </label>
                  </div>
                  <div className={cn(
                    "flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl overflow-hidden",
                    (!hasExpiration || productType === 'service') ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
                  )}>
                    <Calendar className="w-4 h-4 text-brand-dark/30" />
                    <input
                      type="date"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Descripción Detallada</label>
                <div className="flex items-start gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FileText className="w-4 h-4 text-brand-dark/30 mt-1" />
                  <textarea
                    placeholder="Notas adicionales..."
                    rows={2}
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-4 rounded-[20px] font-black text-xs text-white/40 hover:bg-white/5 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={cn(
                    "flex-1 px-4 py-4 text-brand-dark rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg uppercase tracking-wide",
                    productType === 'service' ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-brand-green shadow-brand-green/20"
                  )}
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Ítem'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md animate-fade-in" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-brand-sidebar w-full max-sm:max-w-xs max-w-sm rounded-[40px] border border-white/10 p-10 text-center animate-fade-up shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">¿Eliminar Ítem?</h3>
            <p className="text-white/40 text-sm font-medium mb-8">Esta acción eliminará el registro del catálogo y sus referencias asociadas.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-4 text-white/40 font-black text-sm hover:text-white transition-colors uppercase tracking-widest"
              >
                Volver
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 uppercase tracking-widest"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}
    </div>
  );
}
