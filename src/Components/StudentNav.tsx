import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { auth } from '../appwrite/Auth';
import { StudentNavItems } from '../Utils/constants';

export default function StudentNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Ultra-Clean Floating Navbar */}
      <div className="md:hidden sticky top-3 inset-x-3 z-50 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] mx-3 mt-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xs border border-indigo-100/60">
            ST
          </div>
          <div>
            <span className="font-semibold text-slate-800 tracking-tight block text-xs">LectCore</span>
            <span className="text-[10px] text-indigo-600 font-medium tracking-wide">Student Portal</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-600 transition-all cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Sliding Glass Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed mt-3 inset-x-3 top-18 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-3 shadow-[0_12px_35px_rgba(0,0,0,0.06)] space-y-1">
            <nav className="space-y-1">
              {StudentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/60 font-semibold shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-rose-500 hover:bg-rose-50/60 transition-all duration-200 cursor-pointer"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Minimal Soft Floating Sidebar */}
      <aside className="hidden md:flex w-72 m-4 mr-0 bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-3xl flex-col justify-between p-6 text-slate-600 shadow-[0_4px_30px_rgba(0,0,0,0.02)] shrink-0 z-20">
        <div>
          <div className="flex items-center gap-3.5 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-sm border border-indigo-100/60 shadow-2xs">
              ST
            </div>
            <div>
              <span className="font-semibold text-slate-800 tracking-tight block text-sm">LectCore</span>
              <span className="text-[10px] text-indigo-600 font-medium tracking-wide">Student Portal</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {StudentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/60 font-semibold shadow-2xs'
                      : 'hover:bg-slate-50/80 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100 px-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-rose-500 hover:bg-rose-50/60 transition-all duration-200 cursor-pointer group"
          >
            <LogOut size={18} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}