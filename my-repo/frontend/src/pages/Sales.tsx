import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  ShoppingBag, 
  Trash2, 
  Search,
  MapPin,
  FileText,
  CreditCard,
  User,
  Calendar,
  Download,
  Barcode,
  ArrowRight,
  X,
  AlertCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface SaleItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  iva_pct: number;
  discount_pct: number;
  discount: number;
  iva: number;
  total: number;
}

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

interface WarehouseData {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  sale_price: number;
  iva_pct: number;
  barcode?: string;
  reference?: string;
  product_type?: string;
}

interface InventoryData {
  product_id: string;
  warehouse_id: string;
  quantity: number;
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [sales, setSales] = useState<SaleData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Form states
  const [clientId, setClientId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [isPOSSale, setIsPOSSale] = useState(false);
  
  // Cart states
  const [cart, setCart] = useState<SaleItem[]>([]);
  
  // Barcode / autocomplete states
  const [quickSearchTerm, setQuickSearchTerm] = useState("");
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Modal / popup states for transferring inventory
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedAltProduct, setSelectedAltProduct] = useState<ProductData | null>(null);
  const [altWarehouseItem, setAltWarehouseItem] = useState<InventoryData | null>(null);

  useEffect(() => {
    fetchSales();
    fetchClients();
    fetchWarehouses();
    fetchProducts();
    fetchInventory();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await axios.get(`${API_URL}/sales`);
      setSales(res.data || []);
    } catch (err) {
      console.error("Error fetching sales:", err);
      setSales([]);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/clients`);
      setClients(res.data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${API_URL}/warehouses`);
      setWarehouses(res.data || []);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
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

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory/stock`);
      setInventory(res.data || []);
    } catch (err) {
      console.error("Error fetching inventory stock:", err);
    }
  };

  const handlePOSSaleChange = (checked: boolean) => {
    setIsPOSSale(checked);
    if (checked) {
      const generic = clients.find(c => c.name.toLowerCase().includes("genérico") || c.name.toLowerCase().includes("consumidor"));
      if (generic) {
        setClientId(generic.id);
      } else if (clients.length > 0) {
        setClientId(clients[0].id);
      }
    } else {
      setClientId("");
    }
  };

  const addProductToCart = (prod: ProductData) => {
    if (!prod) return;
    if (!warehouseId) {
       alert("Por favor, selecciona primero un Almacén (Bodega).");
       return;
    }

    // Checking inventory availability if it is a physical product
    if (prod.product_type === "product" || !prod.product_type) {
       const invItem = inventory.find(i => i.product_id === prod.id && i.warehouse_id === warehouseId);
       const qtyAvailable = invItem ? invItem.quantity : 0;
       const qtyInCart = cart.find(item => item.product_id === prod.id)?.quantity || 0;

       if (qtyInCart + 1 > qtyAvailable) {
          // No sufficient stock, check alternate warehouses
          const alternate = inventory.find(i => i.product_id === prod.id && i.warehouse_id !== warehouseId && i.quantity >= 1);
          if (alternate) {
             setSelectedAltProduct(prod);
             setAltWarehouseItem(alternate);
             setTransferModalOpen(true);
             return;
          } else {
             alert(`No hay suficiente stock en el almacén seleccionado para el producto ${prod.name}, y no hay unidades disponibles en otras bodegas.`);
             return;
          }
       }
    }

    const existingIndex = cart.findIndex(item => item.product_id === prod.id);
    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].total = updatedCart[existingIndex].quantity * updatedCart[existingIndex].unit_price;
      updatedCart[existingIndex].iva = updatedCart[existingIndex].total * (updatedCart[existingIndex].iva_pct / 100);
      setCart(updatedCart);
    } else {
      const newItem: SaleItem = {
        product_id: prod.id,
        quantity: 1,
        unit_price: prod.sale_price || 0,
        iva_pct: prod.iva_pct || 0,
        discount_pct: 0,
        discount: 0,
        iva: (prod.sale_price * 1) * ((prod.iva_pct || 0) / 100),
        total: prod.sale_price * 1
      };
      setCart([...cart, newItem]);
    }
    setQuickSearchTerm("");
    quickInputRef.current?.focus();
  };

  const handleExecuteTransfer = async () => {
    if (!selectedAltProduct || !altWarehouseItem || !warehouseId) return;
    try {
      await axios.post(`${API_URL}/inventory/transfer`, {
         product_id: selectedAltProduct.id,
         from_warehouse_id: altWarehouseItem.warehouse_id,
         to_warehouse_id: warehouseId,
         quantity: 1
      });
      alert(`¡1 unidad de ${selectedAltProduct.name} fue transferida exitosamente a tu bodega actual!`);
      // Reload stock to correctly acknowledge changes
      await fetchInventory();

      // Clear Modal states and add to cart directly!
      setTransferModalOpen(false);
      
      const newItem: SaleItem = {
        product_id: selectedAltProduct.id,
        quantity: 1,
        unit_price: selectedAltProduct.sale_price || 0,
        iva_pct: selectedAltProduct.iva_pct || 0,
        discount_pct: 0,
        discount: 0,
        iva: (selectedAltProduct.sale_price * 1) * ((selectedAltProduct.iva_pct || 0) / 100),
        total: selectedAltProduct.sale_price * 1
      };
      setCart([...cart, newItem]);
      setSelectedAltProduct(null);
      setAltWarehouseItem(null);
      setQuickSearchTerm("");
      quickInputRef.current?.focus();
    } catch (err: any) {
      console.error("Error executing auto-transfer:", err);
      alert(err.response?.data?.error || "Error al transferir.");
    }
  };

  const handleQuickSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!quickSearchTerm) return;

      const exactMatch = products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === quickSearchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase() === quickSearchTerm.toLowerCase())
      );

      if (exactMatch) {
        addProductToCart(exactMatch);
      } else {
        const softMatch = products.find(p => p.name.toLowerCase().includes(quickSearchTerm.toLowerCase()));
        if (softMatch) {
          addProductToCart(softMatch);
        }
      }
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setClientId("");
    setWarehouseId("");
    setPaymentMethod("CASH");
    setNotes("");
    setCart([]);
    setIsPOSSale(false);
    setQuickSearchTerm("");
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !warehouseId || cart.length === 0) {
      alert("Por favor, selecciona un cliente, almacén y agrega productos.");
      return;
    }

    try {
      const saleRequest = {
        client_id: clientId,
        warehouse_id: warehouseId,
        payment_method: paymentMethod,
        notes,
        items: cart
      };

      await axios.post(`${API_URL}/sales`, saleRequest);
      resetForm();
      fetchSales();
      fetchInventory();
      setActiveTab("list");
    } catch (err: any) {
      console.error("Error creating sale:", err);
      alert(err.response?.data?.error || "Error al procesar la venta.");
    }
  };

  const handleDownloadPDF = (id: string) => {
    window.open(`${API_URL}/sales/${id}/pdf`, "_blank");
  };

  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || "Cliente General";
  };

  const getProductName = (id: string) => {
    return products.find(p => p.id === id)?.name || "Producto General";
  };

  const getWarehouseName = (id: string) => {
    return warehouses.find(w => w.id === id)?.name || "Almacén General";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const tax = cart.reduce((acc, item) => acc + item.iva, 0);
  const total = subtotal + tax;

  const filteredSales = sales.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(s.client_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productSuggestions = quickSearchTerm.length > 1 
    ? products.filter(p => 
        p.name.toLowerCase().includes(quickSearchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(quickSearchTerm.toLowerCase())) ||
        (p.reference && p.reference.toLowerCase().includes(quickSearchTerm.toLowerCase()))
      ).slice(0, 5) 
    : [];

  return (
    <div className="space-y-8 animate-fade-in select-none">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Ventas</h1>
            <p className="text-white/80 text-sm font-bold">Genera y consulta las órdenes de venta registradas.</p>
          </div>
        </div>

        <div className="flex bg-white/5 border border-white/5 p-1.5 rounded-2xl self-start xl:self-center">
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === "list" ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20" : "text-white/50 hover:text-white"
            )}
          >
            Lista de Ventas
          </button>
          <button
            onClick={() => { resetForm(); setActiveTab("create"); }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === "create" ? "bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20" : "text-white/50 hover:text-white"
            )}
          >
            Registrar Venta
          </button>
        </div>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-4 py-2.5 w-full max-w-md focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID de venta..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/40 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Main Table Content */}
          <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[14px] font-bold uppercase tracking-wide text-brand-dark">
                    <th className="px-10 py-5 text-left">Cliente</th>
                    <th className="px-10 py-5 text-left">Fecha y Hora</th>
                    <th className="px-10 py-5 text-left">Pago / Estado</th>
                    <th className="px-10 py-5 text-left">Total</th>
                    <th className="px-10 py-5 text-right">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s) => (
                    <tr 
                      key={s.id} 
                      className="group transition-all duration-300 ease-out cursor-pointer"
                    >
                      <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-10 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-white border border-black/10 flex items-center justify-center font-display font-black text-brand-dark group-hover:from-white/10 group-hover:to-white/5 group-hover:border-white/10 group-hover:text-white transition-all text-sm">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors">
                              {getClientName(s.client_id)}
                            </div>
                            <div className="text-brand-dark/40 text-xs font-bold mt-0.5 group-hover:text-white/40 truncate w-48">
                               ID: {s.id.substring(0, 8).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2 text-sm font-bold text-brand-dark/70 group-hover:text-white/60 tracking-tight transition-colors">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(s.date).toLocaleDateString()}
                           </div>
                           <div className="text-[11px] text-brand-dark/30 group-hover:text-white/30 font-medium ml-5 mt-0.5">
                              {new Date(s.date).toLocaleTimeString()}
                           </div>
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-brand-dark/70 group-hover:text-white/70 transition-colors">
                            <CreditCard className="w-3.5 h-3.5 text-brand-green" />
                            {s.payment_method === "CASH" ? "Efectivo" : s.payment_method === "CARD" ? "Tarjeta" : "Transferencia"}
                          </div>
                          <div className={cn(
                            "inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all mt-1",
                            s.status === "PAID" 
                              ? "bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-brand-dark" 
                              : "bg-red-400/10 text-red-400 group-hover:bg-red-400 group-hover:text-white"
                          )}>
                            {s.status === "PAID" ? 'Pagada' : s.status}
                          </div>
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="text-sm font-black text-brand-dark group-hover:text-white transition-colors">
                          {formatCurrency(s.total)}
                        </div>
                      </td>
                      <td className="bg-white group-hover:bg-brand-card rounded-r-[32px] px-10 py-5 transition-colors text-right border-y border-r border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(s.id); }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-white hover:text-brand-dark transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                           <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-2">
                              <ShoppingBag className="w-8 h-8 text-gray-300" />
                           </div>
                           <p className="text-brand-dark/40 font-bold tracking-tight">No se encontraron ventas que coincidan con tu búsqueda.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateSale} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Form details section */}
          <div className="xl:col-span-2 space-y-6 bg-brand-sidebar p-6 lg:p-10 rounded-[32px] border border-white/5 relative overflow-hidden h-fit">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="font-display font-black text-xl text-white tracking-tight">Información General</h2>
              <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-4 py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition-all select-none">
                <input 
                  type="checkbox"
                  className="w-4 h-4 accent-brand-green rounded outline-none border-none cursor-pointer"
                  checked={isPOSSale}
                  onChange={(e) => handlePOSSaleChange(e.target.checked)}
                />
                <span className="text-xs font-black uppercase text-white/80 tracking-wider">Cliente Genérico (Venta POS)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Cliente</label>
                <div className={cn(
                  "flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl",
                  isPOSSale && "opacity-60 pointer-events-none"
                )}>
                  <User className="w-4 h-4 text-brand-dark/30" />
                  <select
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required={!isPOSSale}
                    disabled={isPOSSale}
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Almacén (Bodega)</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <MapPin className="w-4 h-4 text-brand-dark/30" />
                  <select
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una bodega</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Método de Pago</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <CreditCard className="w-4 h-4 text-brand-dark/30" />
                  <select
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta de Crédito / Débito</option>
                    <option value="TRANSFER">Transferencia bancaria</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Notas</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FileText className="w-4 h-4 text-brand-dark/30" />
                  <input
                    placeholder="Notas adicionales..."
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <hr className="my-6 border-white/5" />

            {/* Smart Cart products addition section (POS scanning / predictions) */}
            <div className="space-y-4">
              <h3 className="font-display font-black text-lg text-white tracking-tight">Agregar Productos</h3>
              
              <div className="relative">
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl group">
                  <Barcode className="w-5 h-5 text-brand-dark/30" />
                  <input
                    ref={quickInputRef}
                    placeholder="Escanear código de barras, referencia o nombre y presionar Enter..."
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/30 font-extrabold"
                    value={quickSearchTerm}
                    onChange={(e) => setQuickSearchTerm(e.target.value)}
                    onKeyDown={handleQuickSearchKeyDown}
                  />
                </div>

                {/* Suggestions dropdown below input */}
                {productSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-black/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in p-2 select-none">
                    {productSuggestions.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => addProductToCart(p)}
                        className="flex items-center justify-between p-3.5 hover:bg-brand-sidebar hover:text-white rounded-xl transition-all cursor-pointer text-brand-dark font-extrabold text-xs"
                      >
                        <div>
                          <div className="text-sm font-black tracking-tight">{p.name}</div>
                          <div className="text-[11px] opacity-60 font-bold mt-0.5">Ref: {p.reference || "Sin ref."} | Barra: {p.barcode || "Sin barra"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-brand-green">{formatCurrency(p.sale_price)}</span>
                          <ArrowRight className="w-4 h-4 opacity-50" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Cart List */}
            <div className="mt-6 border border-white/5 rounded-2xl bg-white/5 p-4 lg:p-6 overflow-hidden">
              <h4 className="font-display font-black text-sm text-white tracking-tight mb-4 uppercase">Carrito de Compra</h4>
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4 transition-all">
                    <div className="flex-1">
                      <div className="text-white font-extrabold text-sm tracking-tight">
                        {getProductName(item.product_id)}
                      </div>
                      <div className="text-white/40 text-xs font-bold mt-0.5">
                        {item.quantity} und. x {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-black text-sm">
                          {formatCurrency(item.total)}
                        </div>
                        <div className="text-white/30 text-[10px] font-medium uppercase tracking-wider">
                          IVA ({item.iva_pct}%)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(index)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-white/30 text-xs font-bold">Aún no hay productos en el carrito.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout sidebar */}
          <div className="space-y-6 h-fit bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
            <h2 className="font-display font-black text-xl text-white tracking-tight mb-2 uppercase">Resumen de Venta</h2>
            <div className="p-5 bg-white/5 border border-white/5 rounded-[24px] space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50 font-bold">Subtotal:</span>
                <span className="text-white font-extrabold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50 font-bold">Impuestos (IVA):</span>
                <span className="text-white font-extrabold">{formatCurrency(tax)}</span>
              </div>
              <hr className="border-white/5" />
              <div className="flex justify-between items-center text-lg">
                <span className="text-brand-green font-black tracking-tight">Total:</span>
                <span className="text-brand-green font-black">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 bg-brand-green text-brand-dark rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(163,230,53,0.2)] tracking-wide uppercase mt-4"
            >
              Registrar Orden de Venta
            </button>
          </div>
        </form>
      )}

      {/* AUTO-TRANSFER INVENTORY MODAL */}
      {transferModalOpen && selectedAltProduct && altWarehouseItem && createPortal(
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[65] flex items-center justify-center p-4">
          <div className="bg-brand-sidebar border border-white/5 w-full max-w-lg rounded-[32px] p-6 lg:p-10 shadow-2xl relative overflow-hidden animate-fade-in select-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-white tracking-tight">
                     Transferencia de Stock
                  </h3>
                  <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider">
                     Existencias multi-bodega
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTransferModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 relative text-white">
              <p className="text-sm font-bold text-white/80 leading-relaxed">
                No hay stock suficiente en <strong className="text-brand-green">{getWarehouseName(warehouseId)}</strong> para el producto <strong>{selectedAltProduct.name}</strong>, pero hay <strong className="text-brand-green">{altWarehouseItem.quantity}</strong> unidades disponibles en <strong className="text-brand-green">{getWarehouseName(altWarehouseItem.warehouse_id)}</strong>.
              </p>
              <p className="text-xs font-bold text-white/60">
                 ¿Deseas transferir automáticamente 1 unidad de la bodega alterna y agregarla al carrito de compra?
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  className="flex-1 px-5 py-3 bg-brand-green text-brand-dark rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20 tracking-wider uppercase"
                >
                  Sí, transferir y agregar
                </button>
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="flex-1 px-5 py-3 bg-white/5 border border-white/5 text-white hover:bg-white/10 rounded-xl font-black text-xs tracking-wider uppercase transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
