import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Query } from 'appwrite';
import { databases, account, appwriteConfig } from '../../appwrite/Client';
import { type Notification } from '../../types/notification';
import { notificationService } from '../../services/notificationService';
import AdminHeader  from '../../Components/AdminHeader';
import { CheckCheck, ExternalLink, BellOff, Filter, Loader2 } from 'lucide-react';

const NotificationView: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsId,
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]
      );

      setNotifications(response.documents as unknown as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.$id);

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0) return;
    await notificationService.markAllAsRead(unreadIds);
    fetchNotifications();
  };

  const handleItemClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await notificationService.markAllAsRead([notification.$id]);
      fetchNotifications();
    }

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

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Reusable Admin/Portal Header */}
     

      <div className="max-w-4xl mx-auto px-6 mt-6 space-y-6">
         <AdminHeader 
        title="Notifications Center" 
        description="Stay updated with your latest notifications and alerts."
        badgeText="View Updates"
        icon={<BellOff size={20} className="text-indigo-600" />}
      />
        {/* Action Controls & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1.5 text-slate-400 mr-1">
              <Filter size={14} />
              <span className="text-xs font-medium">Filter:</span>
            </div>
            {(['all', 'unread', 'read'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl capitalize transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredNotifications.length} items
            </span>

            {unreadIds.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 transition-colors rounded-xl cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/60 rounded-3xl border border-slate-100 shadow-2xs">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
            <p className="text-xs text-slate-400 font-medium">Loading your notifications...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/60 rounded-3xl border border-slate-100 text-slate-400 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 text-indigo-400 flex items-center justify-center mb-3">
                  <BellOff size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 mb-0.5">All caught up!</p>
                <p className="text-[11px] text-slate-400">You don't have any notifications matching this filter.</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.$id}
                  onClick={() => handleItemClick(notification)}
                  className={`p-5 bg-white rounded-2xl border transition-all duration-200 cursor-pointer hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 relative group ${
                    !notification.isRead 
                      ? 'border-indigo-100 bg-indigo-50/30' 
                      : 'border-slate-100/80 shadow-2xs'
                  }`}
                >
                  {!notification.isRead && (
                    <span className="absolute top-5 left-3 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />
                  )}
                  <div className={!notification.isRead ? 'pl-3' : 'pl-1'}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {notification.title}
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100/80 text-slate-500 rounded-lg uppercase tracking-wider">
                          {notification.type || 'Alert'}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                        {new Date(notification.$createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700">
                      <span>View details</span>
                      <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationView;