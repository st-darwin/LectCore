import { useEffect, useState } from 'react';

import { appwriteConfig , client } from '../appwrite/Client'
import { notificationService } from '../services/notificationService';
import {type Notification } from '../types/notification';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch initial notifications
    notificationService.getNotifications(userId).then((data) => {
      setNotifications(data);
      setLoading(false);
    });

    // Subscribe to Appwrite Realtime for the notifications collection
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsId}.documents`;

    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload as unknown as Notification;

      // Security/Privacy filtering: ensure notification belongs to this user
      if (payload.userId === userId) {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          setNotifications((prev) => [payload, ...prev]);
        } else if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          setNotifications((prev) =>
            prev.map((n) => (n.$id === payload.$id ? payload : n))
          );
        } else if (response.events.includes('databases.*.collections.*.documents.*.delete')) {
          setNotifications((prev) => prev.filter((n) => n.$id !== payload.$id));
        }
      }
    });

    // Proper cleanup on unmount to avoid duplicate listeners
    return () => {
      unsubscribe();
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount, setNotifications, loading };
}