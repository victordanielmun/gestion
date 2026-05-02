import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  LayoutGrid, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search,
  FolderTree,
  FileText,
  AlertCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string | "">("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories([]);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setParentId("");
    setEditingCategory(null);
  };

  const handleEdit = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setDescription(c.description || "");
    setParentId(c.parent_id || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name,
        description,
        parent_id: parentId === "" ? null : parentId
      };

      if (editingCategory) {
        await axios.put(`${API_URL}/categories/${editingCategory.id}`, data);
      } else {
        await axios.post(`${API_URL}/categories`, data);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error("Error saving category:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/categories/${id}`);
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const getParentName = (pid: string | null) => {
    if (!pid) return null;
    const parent = categories.find(c => c.id === pid);
    return parent ? parent.name : null;
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-brand-sidebar p-6 lg:p-8 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">Categorías</h1>
            <p className="text-white/80 text-sm font-bold">Organiza tus productos y servicios por grupos.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-green/20 transition-all group">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Buscar categorías..." 
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
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-gradient-to-b from-gray-100/90 to-gray-50/50 rounded-[40px] p-2 lg:p-6 border border-black/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[14px] font-bold uppercase tracking-wide text-brand-dark">
                <th className="px-10 py-5 text-left">Categoría</th>
                <th className="px-10 py-5 text-left">Jerarquía</th>
                <th className="px-10 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((c) => (
                <tr 
                  key={c.id} 
                  className="group transition-all duration-300 ease-out cursor-pointer"
                >
                  <td className="bg-white group-hover:bg-brand-card rounded-l-[32px] px-10 py-5 transition-colors border-y border-l border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-white border border-black/10 flex items-center justify-center font-display font-black text-brand-dark group-hover:from-white/10 group-hover:to-white/5 group-hover:border-white/10 group-hover:text-white transition-all text-sm">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-brand-dark text-sm tracking-tight group-hover:text-white transition-colors">{c.name}</div>
                        <div className="text-brand-dark/40 text-xs font-bold mt-0.5 group-hover:text-white/40 truncate w-64">
                           {c.description || "Sin descripción"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="bg-white group-hover:bg-brand-card px-10 py-5 transition-colors border-y border-black/[0.05] group-hover:border-transparent shadow-sm group-hover:shadow-xl group-hover:shadow-brand-dark/20">
                    <div className="flex items-center gap-2.5">
                       {c.parent_id ? (
                         <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-bold text-brand-dark/70 group-hover:text-white/60 tracking-tight transition-colors">
                               <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                               {getParentName(c.parent_id)}
                            </div>
                            <div className="text-[10px] text-brand-dark/30 group-hover:text-white/30 font-black uppercase tracking-widest ml-5">Subcategoría</div>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 text-sm font-black text-brand-green/60 uppercase tracking-widest transition-colors">
                            <LayoutGrid className="w-4 h-4" />
                            Principal
                         </div>
                       )}
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
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-2">
                          <LayoutGrid className="w-8 h-8 text-gray-300" />
                       </div>
                       <p className="text-brand-dark/40 font-bold tracking-tight">No se encontraron categorías que coincidan con tu búsqueda.</p>
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
          <div className="relative bg-brand-sidebar w-full max-w-lg rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 lg:p-10 animate-fade-up overflow-hidden my-auto">
            {/* Modal Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20 shadow-inner">
                    {editingCategory ? <Edit2 className="w-7 h-7 text-brand-green" /> : <Plus className="w-7 h-7 text-brand-green" />}
                 </div>
                 <div>
                   <h2 className="font-display font-black text-2xl text-white tracking-tight">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                   <p className="text-white/40 text-xs font-medium mt-0.5">Organiza tu inventario y servicios.</p>
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
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Nombre de la Categoría</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <LayoutGrid className="w-4 h-4 text-brand-dark/30" />
                  <input
                    placeholder="Ej. Repuestos, Servicios Técnicos..."
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Categoría Padre (Opcional)</label>
                <div className="flex items-center gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FolderTree className="w-4 h-4 text-brand-dark/30" />
                  <select
                    className="bg-transparent border-none outline-none text-sm w-full text-brand-dark appearance-none cursor-pointer font-extrabold"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="" className="text-brand-dark">Ninguna (Principal)</option>
                    {categories.filter(c => !editingCategory || c.id !== editingCategory.id).map(c => (
                      <option key={c.id} value={c.id} className="text-brand-dark">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/80 ml-2">Descripción</label>
                <div className="flex items-start gap-3 bg-white border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-2xl">
                  <FileText className="w-4 h-4 text-brand-dark/30 mt-1" />
                  <textarea
                    placeholder="Describe de qué trata esta categoría..."
                    rows={3}
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
                  className="flex-1 px-4 py-4 bg-brand-green text-brand-dark rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(163,230,53,0.2)] uppercase tracking-wide"
                >
                  {editingCategory ? 'Actualizar' : 'Crear Categoría'}
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
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">¿Eliminar Categoría?</h3>
            <p className="text-white/40 text-sm font-medium mb-8">Esta acción eliminará la organización jerárquica. Los productos asociados podrían quedar sin categoría.</p>
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
