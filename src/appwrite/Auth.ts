import { ID, Query } from 'appwrite';
import { account, databases , appwriteConfig } from './Client';

export const auth = {
  async loginWithCampusId(campusId: string, pass: string) {
    try {
      try {
        await account.deleteSession('current');
      } catch {
        // Ignore error if no active session exists
      }

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('campusId', campusId)]
      );

      if (response.documents.length === 0) {
        throw new Error('Campus ID not found.');
      }

      const userDoc = response.documents[0];
      return await account.createEmailPasswordSession(userDoc.email, pass);
    } catch (error: any) {
      throw new Error(error.message || 'Invalid Campus ID or password');
    }
  },

  async register(data: { name: string; email: string; pass: string; phone: string; campusId:  string; role: 'student' | 'lecturer'; university: string }) {
    const userId = ID.unique();
    
    try {
      await account.deleteSession('current');
    } catch {
      // Ignore
    }

    await account.create(userId, data.email, data.pass, data.name);
    await account.createEmailPasswordSession(data.email, data.pass);

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        userId: userId,
        name: data.name,
        role: data.role,
        campusId: data.campusId,
        email: data.email,
        phone: data.phone,
        university: data.university, 

      }
    );
  },

  async logoutUser() {
    try {
      await account.deleteSession("current");
      window.location.hash = "";
      return true;
    } catch (error) {
      console.error("Logout failed", error);
      return false;
    }
  },

  async getCurrentUser() {
    try {
      return await account.get();
    } catch {
      return null;
    }
  },

  // Fetches the active auth user combined with their database profile document
  async getExistingUser() {
    try {
      const sessionUser = await account.get();
      if (!sessionUser) return null;

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('userId', sessionUser.$id)]
      );

      const profileDoc = response.documents.length > 0 ? response.documents[0] : null;

      return {
        ...sessionUser,
        profile: profileDoc,
        
        
        // Contains role, campusId, phone, etc.
      };
    } catch {
      return null;
    }
  }
};