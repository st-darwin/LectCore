// src/services/notificationTrigger.ts
import { databases } from '../appwrite/Client';
import { appwriteConfig } from '../appwrite/Client';
import { notificationService } from './notificationService';
import { Query } from 'appwrite';

interface TriggerNotificationParams {
  courseId: string;
  title: string;
  message: string;
  type?: 'ANNOUNCEMENT' | 'MATERIAL' | 'GRADE' | 'ASSIGNMENT';
  relatedId?: string;
}

export const sendCourseNotificationToStudents = async ({
  courseId,
  title,
  message,
  type = 'ANNOUNCEMENT',
  relatedId,
}: TriggerNotificationParams) => {
  try {
    // 1. Fetch all students enrolled in this course using your enrollments collection ID
    const enrollments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.enrollmentsId,
      [Query.equal('courseId', courseId)]
    );

    if (enrollments.documents.length === 0) {
      console.log('No students enrolled in this course to notify.');
      return;
    }

    // 2. Loop through each student and create their individual notification document
    const notificationPromises = enrollments.documents.map((enrollment) => {
      const studentId = enrollment.studentId; // Ensure this matches your enrollment attribute field

      return notificationService.createNotification({
        userId: studentId,
        title,
        message,
        type,
        relatedId,
      });
    });

    await Promise.all(notificationPromises);
    console.log(`Successfully notified ${enrollments.documents.length} students.`);
  } catch (error) {
    console.error('Failed to trigger student notifications:', error);
  }
};