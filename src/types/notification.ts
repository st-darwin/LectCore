export interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: 
    | 'MATERIAL' 
    | 'MATERIAL_UPLOAD' 
    | 'DISCUSSION' 
    | 'ANNOUNCEMENT' 
    | 'ASSIGNMENT' 
    | 'GRADE' 
    | 'CHAT' 
    | string;
  relatedId?: string;
  isRead: boolean;
  $createdAt: string;
}