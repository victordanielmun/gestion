import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Search, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-brand-sidebar overflow-x-hidden relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen lg:pl-64 transition-all duration-300 w-full overflow-hidden">
        {/* White Content Panel */}
        <div className="flex-1 bg-white rounded-t-[40px] lg:rounded-l-[40px] lg:rounded-tr-none shadow-2xl flex flex-col overflow-hidden border border-white/10 mt-16 lg:mt-0 lg:border-l-0">
          {/* Content Scrollable Area */}
          <div className="flex-1 p-6 lg:p-10 animate-fade-up overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
