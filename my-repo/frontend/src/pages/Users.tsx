import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  Users as UsersIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search,
  Shield,
  Mail,
  User as UserIcon,
  AlertCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role_id: string;
  is_active: boolean;
  role?: Role;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/roles`);
      setRoles(res.data);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRoleId("");
    setIsActive(true);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRoleId(user.role_id);
    setIsActive(user.is_active);
    setPassword("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        name,
        email,
        role_id: roleId,
        is_active: isActive,
        ...(password && { password })
      };

      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.id}`, userData);
      } else {
        await axios.post(`${API_URL}/users`, userData);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("Error saving user:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/users/${id}`);
      setDeleteConfirmId(null);
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Usuarios</h1>
            <p className="text-white/80 text-sm font-bold">Gestiona los accesos y roles de tu equipo.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Buscar usuarios..." 
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
            Nuevo
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[14px] font-bold uppercase tracking-wide text-brand-dark">
                <th className="px-10 py-5 text-left">Usuario</th>
                <th className="px-10 py-5 text-left">Rol & Permisos</th>
                <th className="px-10 py-5 text-left">Estado</th>
                <th className="px-10 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => 
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((u) => (
                <tr 
                  key={u.id} 
                  className="group transition-all duration-300 ease-out cursor-pointer"
                >
                  <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-10 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-white border border-black/10 flex items-center justify-center font-display font-black text-brand-dark group-hover:from-white/10 group-hover:to-white/5 group-hover:border-white/10 group-hover:text-white transition-all">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors">{u.name}</div>
                        <div className="text-brand-dark/50 text-xs font-bold flex items-center gap-1 mt-0.5 group-hover:text-white/40">
                           <Mail className="w-3 h-3" /> {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center gap-2.5">
                       <div className="w-8 h-8 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                          <Shield className="w-4 h-4 text-purple-700 group-hover:text-purple-400" />
                       </div>
                       <span className="text-sm font-bold text-brand-dark/70 group-hover:text-white/60 tracking-tight transition-colors">
                         {u.role?.name || "Sin Rol"}
                       </span>
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      u.is_active 
                        ? "bg-brand-green/10 text-brand-green group-hover:bg-brand-green group-hover:text-brand-dark" 
                        : "bg-red-400/10 text-red-400 group-hover:bg-red-400 group-hover:text-white"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-brand-green group-hover:bg-brand-dark" : "bg-red-400 group-hover:bg-white")} />
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card rounded-r-[32px] px-10 py-5 transition-colors text-right border-y border-r border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center justify-end gap-2 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(u); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 border border-black/10 text-brand-dark/60 hover:bg-white hover:text-brand-dark transition-all group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(u.id); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-all group-hover:bg-red-400/20 group-hover:border-red-400/20 group-hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
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
          <div className="relative bg-brand-sidebar w-full max-w-lg rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 lg:p-10 animate-fade-up overflow-hidden my-auto">
            {/* Modal Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20 shadow-inner">
                    {editingUser ? <Edit2 className="w-7 h-7 text-brand-green" /> : <Plus className="w-7 h-7 text-brand-green" />}
                 </div>
                 <div>
                   <h2 className="font-display font-black text-2xl text-white tracking-tight">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                   <p className="text-white/40 text-xs font-medium mt-0.5">Ingresa los datos del colaborador.</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Nombre Completo</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <UserIcon className="w-4 h-4 text-brand-dark/30" />
                  <input
                    placeholder="Ej. Juan Perez"
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Correo Electrónico</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <Mail className="w-4 h-4 text-brand-dark/30" />
                  <input
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Rol</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <Shield className="w-4 h-4 text-brand-dark/30" />
                    <select
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark appearance-none cursor-pointer font-extrabold"
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      required
                    >
                      <option value="" className="text-brand-dark">Seleccionar</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id} className="text-brand-dark">{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-1">Contraseña</label>
                  <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                    <input
                      type="password"
                      placeholder={editingUser ? "Dejar en blanco" : "••••••••"}
                      className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingUser}
                    />
                  </div>
                </div>
              </div>

              {editingUser && (
                <div 
                   onClick={() => setIsActive(!isActive)}
                   className={cn(
                    "flex items-center justify-between p-4 rounded-[24px] border cursor-pointer transition-all",
                    isActive ? "bg-brand-green/10 border-brand-green/20 shadow-[0_0_20px_rgba(163,230,53,0.1)]" : "bg-white/5 border-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", isActive ? "bg-brand-green/20 text-brand-green" : "bg-white/10 text-white/20")}>
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={cn("text-sm font-black tracking-tight", isActive ? "text-white" : "text-white/40")}>Estado del Usuario</div>
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{isActive ? 'Actualmente Activo' : 'Usuario Inactivo'}</div>
                    </div>
                  </div>
                  <div className={cn("w-10 h-6 rounded-full relative transition-colors duration-300", isActive ? "bg-brand-green" : "bg-white/10")}>
                     <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-brand-dark shadow-sm transition-all duration-300", isActive ? "left-5" : "left-1")} />
                  </div>
                </div>
              )}

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
                  className="flex-1 px-4 py-4 bg-brand-green text-brand-dark rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(163,230,53,0.2)] uppercase tracking-wide"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
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
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">¿Estás seguro?</h3>
            <p className="text-white/40 text-sm font-medium mb-8">Esta acción no se puede deshacer y el usuario perderá todo acceso.</p>
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
