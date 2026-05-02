import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search,
  MapPin,
  FileText,
  Briefcase,
  Phone,
  Mail,
  UserCheck
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface ClientData {
  id: string;
  name: string;
  id_type: string;
  id_number: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  client_type: string;
  notes: string;
}

export default function Clients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [name, setName] = useState("");
  const [idType, setIdType] = useState("CC");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [clientType, setClientType] = useState("PERSONA_NATURAL");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/clients`);
      setClients(res.data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClients([]);
    }
  };

  const resetForm = () => {
    setName("");
    setIdType("CC");
    setIdNumber("");
    setEmail("");
    setPhone("");
    setMobile("");
    setAddress("");
    setCity("");
    setClientType("PERSONA_NATURAL");
    setNotes("");
    setEditingClient(null);
  };

  const handleEdit = (c: ClientData) => {
    setEditingClient(c);
    setName(c.name || "");
    setIdType(c.id_type || "CC");
    setIdNumber(c.id_number || "");
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setMobile(c.mobile || "");
    setAddress(c.address || "");
    setCity(c.city || "");
    setClientType(c.client_type || "PERSONA_NATURAL");
    setNotes(c.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name,
        id_type: idType,
        id_number: idNumber,
        email,
        phone,
        mobile,
        address,
        city,
        client_type: clientType,
        notes
      };

      if (editingClient) {
        await axios.put(`${API_URL}/clients/${editingClient.id}`, data);
      } else {
        await axios.post(`${API_URL}/clients`, data);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchClients();
    } catch (err) {
      console.error("Error saving client:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/clients/${id}`);
      setDeleteConfirmId(null);
      fetchClients();
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Clientes</h1>
            <p className="text-white/80 text-sm font-bold">Gestiona y consulta los clientes registrados en tu sistema.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, documento o email..." 
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
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[14px] font-bold uppercase tracking-wide text-brand-dark">
                <th className="px-10 py-5 text-left">Cliente</th>
                <th className="px-10 py-5 text-left">Identificación</th>
                <th className="px-10 py-5 text-left">Contacto</th>
                <th className="px-10 py-5 text-left">Tipo</th>
                <th className="px-10 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => (
                <tr 
                  key={c.id} 
                  className="group transition-all duration-300 ease-out cursor-pointer"
                >
                  <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-10 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-white border border-black/10 flex items-center justify-center font-display font-black text-brand-dark group-hover:from-white/10 group-hover:to-white/5 group-hover:border-white/10 group-hover:text-white transition-all text-sm">
                        {c.name ? c.name.substring(0, 2).toUpperCase() : "??"}
                      </div>
                      <div>
                        <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors">{c.name || "Sin nombre"}</div>
                        <div className="text-brand-dark/40 text-xs font-bold mt-0.5 group-hover:text-white/40 truncate w-48">
                           {c.city || "Sin ciudad especificada"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex flex-col">
                       <div className="flex items-center gap-2 text-sm font-bold text-brand-dark/70 group-hover:text-white/60 tracking-tight transition-colors">
                          {c.id_type || "CC"}
                       </div>
                       <div className="text-[11px] text-brand-dark/30 group-hover:text-white/30 font-medium mt-0.5">
                          {c.id_number || "No registrado"}
                       </div>
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex flex-col gap-1">
                      {c.email && (
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-dark/70 group-hover:text-white/70 transition-colors">
                          <Mail className="w-3.5 h-3.5 text-brand-green" />
                          {c.email}
                        </div>
                      )}
                      {c.mobile && (
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-dark/70 group-hover:text-white/70 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          {c.mobile}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      c.client_type === "PERSONA_JURIDICA" 
                        ? "bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-brand-dark" 
                        : "bg-blue-400/10 text-blue-400 group-hover:bg-blue-400 group-hover:text-white"
                    )}>
                      {c.client_type === "PERSONA_JURIDICA" ? 'Jurídica' : 'Natural'}
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card rounded-r-[32px] px-10 py-5 transition-colors text-right border-y border-r border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center justify-end gap-2 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-white hover:text-brand-dark transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-all group-hover:bg-red-400/20 group-hover:border-red-400/20 group-hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-2">
                          <Users className="w-8 h-8 text-gray-300" />
                       </div>
                       <p className="text-brand-dark/40 font-bold tracking-tight">No se encontraron clientes que coincidan con tu búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
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
                    {editingClient ? <Edit2 className="w-7 h-7 text-brand-green" /> : <Plus className="w-7 h-7 text-brand-green" />}
                 </div>
                 <div>
                   <h2 className="font-display font-black text-2xl text-white tracking-tight">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                   <p className="text-white/40 text-xs font-medium mt-0.5">Ingresa la información personal y fiscal del cliente.</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Nombre completo</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Briefcase className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="Ej. Juan Pérez"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Tipo de Cliente</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <UserCheck className="w-4 h-4 text-brand-dark/30" />
                    <select
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                    >
                      <option value="PERSONA_NATURAL">Persona Natural</option>
                      <option value="PERSONA_JURIDICA">Persona Jurídica</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Tipo de ID</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <select
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark font-extrabold cursor-pointer"
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                    >
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PP">Pasaporte</option>
                      <option value="DIE">DIE</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-1">Número de ID</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <input
                      placeholder="Ej. 1234567890"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Correo electrónico</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Mail className="w-4 h-4 text-brand-dark/30" />
                    <input
                      type="email"
                      placeholder="Ej. cliente@dominio.com"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Celular</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Phone className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="Ej. 3001234567"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Ciudad</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <MapPin className="w-4 h-4 text-brand-dark/30" />
                    <input
                      placeholder="Ej. Bogotá"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-1">Dirección</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <input
                      placeholder="Ej. Calle 12 # 45-67"
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Notas</label>
                <div className="flex items-start gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FileText className="w-4 h-4 text-brand-dark/30 mt-1" />
                  <textarea
                    placeholder="Escribe notas adicionales sobre este cliente..."
                    rows={2}
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3.5 rounded-[20px] font-black text-xs text-white/40 hover:bg-white/5 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3.5 bg-brand-green text-brand-dark rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(163,230,53,0.2)] uppercase tracking-wide"
                >
                  {editingClient ? 'Actualizar' : 'Crear Cliente'}
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
          <div className="relative bg-brand-sidebar w-full max-w-sm rounded-[40px] border border-white/10 p-10 text-center animate-fade-up shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">¿Eliminar Cliente?</h3>
            <p className="text-white/40 text-sm font-medium mb-8">Esta acción es irreversible y podría afectar las ventas asociadas.</p>
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
