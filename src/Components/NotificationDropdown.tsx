import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type Notification } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { CheckCheck, BellOff, ExternalLink, Bell, X } from 'lucide-react';

interface NotificationDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  onRefresh: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onRefresh,
}) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.$id);

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0) return;
    await notificationService.markAllAsRead(unreadIds);
    onRefresh();
  };

  const handleItemClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await notificationService.markAllAsRead([notification.$id]);
      onRefresh();
    }

    onNotificationClick(notification);
    onClose();

    // Smart routing based on notification type
    const type = notification.type?.toUpperCase();
    const relatedId = notification.relatedId;

    if (type === 'ANNOUNCEMENT' || type === 'ANNOUNCEMENTS') {
      navigate('/student/announcements');
    } else if (type === 'ASSIGNMENT' || type === 'ASSIGNMENTS') {
      navigate(relatedId ? `/student/assignment/${relatedId}` : '/student/assignments');
    } else if (type === 'COURSE' || type === 'MATERIAL' || type === 'MATERIALS') {
      navigate(relatedId ? `/student/courses/${relatedId}` : '/student/courses');
    }
  };

  return (
    <>
      {/* Transparent overlay covering the whole screen to catch outside clicks */}
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />

      {/* Floating overlay card positioned to the left (next to the sidebar on desktop) */}
      <div className="fixed top-20 inset-x-4 mx-auto max-w-md sm:mx-0 sm:left-60 sm:top-7 sm:inset-x-auto sm:w-[380px] z-50 rounded-[1.75rem] bg-white border border-slate-200/90 shadow-[0_25px_60px_rgba(0,0,0,0.18)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Bell size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">Notifications</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadIds.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer bg-indigo-50 px-2 py-1 rounded-lg"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-4 text-center">
              <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
                <BellOff size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">All caught up!</p>
              <p className="text-[11px] text-slate-400">No new notifications right now.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.$id}
                onClick={() => handleItemClick(notification)}
                className={`p-4 transition-all cursor-pointer hover:bg-slate-50 relative group ${
                  !notification.isRead ? 'bg-indigo-50/40' : ''
                }`}
              >
                {!notification.isRead && (
                  <span className="absolute top-4 left-3 w-2 h-2 rounded-full bg-indigo-600" />
                )}
                <div className={!notification.isRead ? 'pl-3' : 'pl-1'}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {notification.title}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                      {new Date(notification.$createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    <span>View details</span>
                    <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};