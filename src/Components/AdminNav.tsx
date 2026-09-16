import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminNavItems } from "../Utils/constants";
import { Menu, X, LogOut, ShieldCheck } from 'lucide-react';
import { auth } from "../appwrite/Auth";

const AdminNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Floating Header Bar */}
      <div className="md:hidden fixed top-3 left-4 right-4 h-16 bg-white/90 backdrop-blur-xl border border-slate-200/80 z-40 px-4 flex items-center justify-between rounded-4xl shadow-xl shadow-slate-950/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 tracking-tight block text-sm leading-tight">LectCore</span>
            <span className="text-[11px] text-indigo-600 font-medium">Admin Portal</span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-all duration-200"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-5 h-5 animate-in fade-in zoom-in-90 duration-200" /> : <Menu className="w-5 h-5 animate-in fade-in zoom-in-90 duration-200" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile dropdown */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/15 backdrop-blur-xs z-35 transition-opacity"
        />
      )}

      {/* Cool Soft Mobile Dropdown Panel */}
      <div
        className={`md:hidden fixed top-22 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-2xl shadow-slate-950/10 z-40 transition-all duration-300 ease-in-out p-3 space-y-1.5 rounded-3xl ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        <div className="space-y-1 py-1">
          {AdminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Desktop Floating Sidebar with Slate Borders */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 z-50 w-72 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-950/5 flex-col m-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden">
        {/* Brand / Logo Area */}
        <div className="h-20 px-6 flex items-center gap-3.5 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base tracking-tight leading-tight">LectCore</h1>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Admin Control</p>
          </div>
        </div>

        {/* Navigation Items Link List */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-none">
          {AdminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 group relative ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="tracking-tight">{item.label}</span>
              
              </Link>
            );
          })}
        </div>

        {/* Footer / Logout Action */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-sm text-rose-600 hover:bg-rose-50 transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="tracking-tight">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminNav;