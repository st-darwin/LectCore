import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-slate-500 hover:text-slate-900 transition-all duration-200 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95 cursor-pointer"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />

      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shadow-xs ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};