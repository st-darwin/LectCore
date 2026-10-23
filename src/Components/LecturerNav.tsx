// LecturerNav.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { auth } from '../appwrite/Auth';
import { account } from '../appwrite/Client';
import logo from "../assets/icons/logo.png";
import { LecturerNavItems } from '../Utils/constants';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationBell } from '../Components/NotificationBell';
import { NotificationDropdown } from '../Components/NotificationDropdown';
import { notificationService } from '../services/notificationService';
import { type Notification } from '../types/notification';

export default function LecturerNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State for user ID and notification dropdown visibility
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Retrieve current lecturer user on mount using account.get()
  useEffect(() => {
    account.get()
      .then((user) => {
        setUserId(user.$id);
      })
      .catch((err) => {
        console.error('Failed to get current user session:', err);
      });
  }, []);

  // Use real-time notifications hook
  const { notifications, unreadCount, setNotifications } = useNotifications(userId);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.$id);
      setNotifications((prev) =>
        prev.map((n) => (n.$id === notification.$id ? { ...n, isRead: true } : n))
      );
    }
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Mobile & Tablet Top Header (Visible on screens smaller than lg) */}
      <header className="lg:hidden fixed top-3 inset-x-3 sm:inset-x-6 z-50 bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-2xl px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-indigo-600 flex items-center justify-center font-semibold text-xs shrink-0">
            <img src={logo} className="rounded-xl" alt="" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 tracking-tight block text-xs sm:text-sm truncate">LectCore</span>
            <span className="text-[10px] sm:text-xs text-indigo-600 font-medium tracking-wide block truncate">Lecturer Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Notification Bell */}
          <NotificationBell
            unreadCount={unreadCount}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-600 transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Full-Screen/Drawer Sliding Glass Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs flex flex-col pt-20 sm:pt-24 px-3 sm:px-6 pb-6 animate-in fade-in duration-200 items-center">
          <div className="w-full max-w-xl bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] flex flex-col max-h-[calc(100vh-7rem)] overflow-y-auto">
            <nav className="space-y-1.5 flex-1">
              {LecturerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/60 font-semibold shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <Icon size={20} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium text-rose-500 hover:bg-rose-50/60 transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <LogOut size={20} className="shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Fixed Minimal Soft Sidebar (Only visible on lg+ screens) */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-72 bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-3xl flex-col justify-between p-6 text-slate-600 shadow-[0_4px_30px_rgba(0,0,0,0.02)] z-20 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl text-indigo-600 flex items-center justify-center font-semibold text-sm shadow-2xs">
                <img src={logo} className="rounded-xl" alt="" />
              </div>
              <div>
                <span className="font-semibold text-slate-800 tracking-tight block text-sm">LectCore</span>
                <span className="text-[10px] text-indigo-600 font-medium tracking-wide">Lecturer Portal</span>
              </div>
            </div>

            {/* Desktop Notification Bell */}
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
          </div>

          <nav className="space-y-1.5">
            {LecturerNavItems.map((item) => {
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
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
            <LogOut size={18} className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Global Root-Level Notification Dropdown */}
      <NotificationDropdown
        notifications={notifications}
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        onNotificationClick={handleNotificationClick}
        onRefresh={() => {}}
      />
    </>
  );
}