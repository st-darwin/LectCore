import { databases, appwriteConfig } from '../appwrite/Client'; // Adjust path to your client.ts if needed
import { Query, ID } from 'appwrite';
import { type Notification } from '../types/notification';

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]
      );
      return response.documents as unknown as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsId,
        notificationId,
        { isRead: true }
      );
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  async markAllAsRead(notificationIds: string[]): Promise<void> {
    try {
      await Promise.all(
        notificationIds.map((id) => this.markAsRead(id))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  // Helper method if you need to create notifications from client-side actions
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
  }): Promise<Notification | null> {
    try {
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsId,
        ID.unique(),
        {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId || '',
          isRead: false,
        }
      );
      return response as unknown as Notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },
};