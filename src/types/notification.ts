export interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: 'MATERIAL_UPLOAD' | 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'GRADE' | 'CHAT' | string;
  relatedId?: string;
  isRead: boolean;
  $createdAt: string;
}