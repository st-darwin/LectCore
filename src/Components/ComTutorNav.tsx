import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { auth } from '../appwrite/Auth';
import { account } from '../appwrite/Client';
import logo from '../assets/icons/logo.png';
import { ComTutorNavItems } from '../Utils/constants';
import { useNotifications } from '../hooks/useNotifications';
import {NotificationBell} from './NotificationBell';
import {NotificationDropdown} from './NotificationDropdown';
import { notificationService } from '../services/notificationService';
import type { Notification } from '../types/notification';

const ComTutorNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { notifications, unreadCount, setNotifications } = useNotifications(userId);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await auth.logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.$id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.$id === notification.$id
              ? { ...item, isRead: true }
              : item
          )
        );
      }

      setIsNotificationOpen(false);
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-3 right-3 top-3 z-40 flex h-[68px] items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 px-4 shadow-sm shadow-slate-200/30 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="LectCore"
            className="h-9 w-9 rounded-xl object-contain"
          />

          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-800">
              LectCore
            </h1>
            <p className="text-[10px] font-medium text-slate-400">
              Community Tutor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell
            unreadCount={unreadCount}
            isOpen={isNotificationOpen}
            onClick={() => setIsNotificationOpen((prev) => !prev)}
          />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 transition hover:bg-slate-50"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[285px] flex-col border-r border-slate-200/70 bg-white px-5 pb-5 pt-6 shadow-xl shadow-slate-900/5 transition-transform duration-300 ease-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="LectCore"
              className="h-10 w-10 rounded-xl object-contain"
            />

            <div>
              <h1 className="text-sm font-semibold text-slate-800">
                LectCore
              </h1>
              <p className="text-[10px] font-medium text-slate-400">
                Community Tutor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-slate-400">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {ComTutorNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'border border-violet-100 bg-violet-50 text-violet-700'
                    : 'border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={
                    active
                      ? 'text-violet-600'
                      : 'text-slate-400 transition group-hover:text-slate-600'
                  }
                />

                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Sign out</span>
          </button>

          <p className="mt-4 px-3 text-[10px] text-slate-400">
            © {new Date().getFullYear()} LectCore
          </p>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-72 flex-col rounded-2xl border border-slate-200/70 bg-white px-5 py-6 shadow-sm shadow-slate-200/30 lg:flex">
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="LectCore"
              className="h-10 w-10 rounded-xl object-contain"
            />

            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-800">
                LectCore
              </h1>
              <p className="text-[11px] font-medium text-slate-400">
                Community Tutor
              </p>
            </div>
          </div>

          <NotificationBell
            unreadCount={unreadCount}
            isOpen={isNotificationOpen}
            onClick={() => setIsNotificationOpen((prev) => !prev)}
          />
        </div>

        <div className="mb-4 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-slate-400">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {ComTutorNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'border border-violet-100 bg-violet-50 text-violet-700'
                    : 'border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={
                    active
                      ? 'text-violet-600'
                      : 'text-slate-400 transition group-hover:text-slate-600'
                  }
                />

                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Sign out</span>
          </button>

          <p className="mt-4 px-3 text-[10px] text-slate-400">
            © {new Date().getFullYear()} LectCore
          </p>
        </div>
      </aside>

      {/* Notification Dropdown */}
      <NotificationDropdown
        notifications={notifications}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNotificationClick={handleNotificationClick}
        onRefresh={() => {}}
      />
    </>
  );
};

export default ComTutorNav;