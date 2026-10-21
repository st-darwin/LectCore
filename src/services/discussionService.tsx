import { databases, appwriteConfig } from '../appwrite/Client';
import { ID, Query } from 'appwrite';

export interface DiscussionPost {
  $id?: string;
  courseId: string;
  userId: string;
  authorName: string;
  role: 'student' | 'lecturer';
  title: string;
  content: string;
  $createdAt?: string;
}

// Fetch all discussion posts/threads for a specific course (newest first)
export const getCourseDiscussions = async (courseId: string) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.courseDiscussionsId,
      [Query.equal('courseId', courseId), Query.orderDesc('$createdAt')]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching course discussions:', error);
    throw error;
  }
};

// Create a new discussion thread or question
export const createDiscussionPost = async (post: DiscussionPost) => {
  try {
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.courseDiscussionsId,
      ID.unique(),
      post
    );
    return response;
  } catch (error) {
    console.error('Error creating discussion post:', error);
    throw error;
  }
};

// Delete a discussion post by ID
export const deleteDiscussionPost = async (postId: string) => {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.courseDiscussionsId,
      postId
    );
    return true;
  } catch (error) {
    console.error('Error deleting discussion post:', error);
    throw error;
  }
};