import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface CompanySettings {
  name: string;
  logo_url?: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // This is now a public route
    axios.get(`${API_URL}/settings`)
      .then(res => setSettings(res.data))
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Credenciales inválidas");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111] relative overflow-hidden font-body">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-green/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="w-full max-w-lg relative z-10 p-6">
        {/* Dynamic Logo Section */}
        <div className="flex flex-col items-center mb-12 animate-fade-up">
           <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-6 overflow-hidden shadow-2xl">
              {settings?.logo_url ? (
                <img 
                  src={`${API_URL.replace('/api/v1', '')}${settings.logo_url}`} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-green/20 flex items-center justify-center text-brand-green">
                   <LogIn className="w-8 h-8" />
                </div>
              )}
           </div>
           <h1 className="font-display font-black text-4xl text-white tracking-tight mb-2">
             {settings?.name || 'Inicia Sesión'}
           </h1>
           <p className="text-white/40 text-sm font-medium">Ingresa a tu panel administrativo.</p>
        </div>

        {/* Login Form */}
        <div className="bg-brand-sidebar rounded-[48px] p-8 lg:p-10 border border-white/5 shadow-2xl animate-fade-up relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {error && (
              <div className="p-3 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center gap-3 text-red-400 text-sm font-bold animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-white/80 ml-1">Correo Electrónico</label>
              <div className="flex items-center gap-4 bg-white border border-white/10 rounded-[20px] px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-xl">
                <Mail className="w-5 h-5 text-brand-dark/20" />
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-white/80 ml-1">Contraseña</label>
              <div className="flex items-center gap-4 bg-white border border-white/10 rounded-[20px] px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-green/20 transition-all shadow-xl">
                <Lock className="w-5 h-5 text-brand-dark/20" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-brand-dark placeholder:text-brand-dark/20 font-extrabold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
               <button type="button" className="text-xs font-bold text-white/40 hover:text-white transition-colors">¿Olvidaste tu contraseña?</button>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                type="submit" 
                className="w-full bg-brand-green text-brand-dark py-4 rounded-[20px] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-brand-green/20 flex items-center justify-center gap-3"
              >
                Ingresar al Panel
                <LogIn className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-white/10 text-[10px] font-black uppercase tracking-[0.3em]">
          Powered by {settings?.name || 'System'} — 2026
        </p>
      </div>
    </div>
  );
}
