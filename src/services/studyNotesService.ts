import { databases, appwriteConfig } from '../appwrite/Client';
import { ID, Query } from 'appwrite';

export interface StudyNote {
  $id?: string;
  userId: string;
  courseId: string;
  title: string;
  content: string;
  $createdAt?: string;
}

export const getStudentNotes = async (userId: string, courseId: string) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.studyNotesId,
      [Query.equal('userId', userId), Query.equal('courseId', courseId)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching study notes:', error);
    throw error;
  }
};

export const createStudyNote = async (note: StudyNote) => {
  try {
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.studyNotesId,
      ID.unique(),
      note
    );
    return response;
  } catch (error) {
    console.error('Error saving study note:', error);
    throw error;
  }
};

export const deleteStudyNote = async (noteId: string) => {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.studyNotesId,
      noteId
    );
    return true;
  } catch (error) {
    console.error('Error deleting study note:', error);
    throw error;
  }
};