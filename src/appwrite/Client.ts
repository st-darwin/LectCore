import { Client, Account, Databases, Storage } from 'appwrite';


export const appwriteConfig = {

  endPoint : import.meta.env.VITE_APPWRITE_ENDPOINT,
  projectId : import.meta.env.VITE_APPWRITE_PROJECT_ID,
  userCollectionId : import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID,
  databaseId : import.meta.env.VITE_APPWRITE_DATABASE_ID,
  courseId : import.meta.env.VITE_APPWRTE_COURSES_COLLECTION_ID,
  courseMaterialsId : import.meta.env.VITE_APPWRITE_COURSE_MATERIALS_COLLECTION_ID,
  storageId : import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID,


}
const client = new Client()
  .setEndpoint(appwriteConfig.endPoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);