import { Account, Avatars, Client, OAuthProvider, Databases, ID, Query } from 'react-native-appwrite';

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!);

export const account = new Account(client);
const databases = new Databases(client);
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const STUDENTS_COLLECTION_ID = process.env.EXPO_PUBLIC_STUDENT_COLLECTION_ID!;    // 67c74c510001bc241039
const FACULTY_COLLECTION_ID = process.env.EXPO_PUBLIC_FACULTY_COLLECTION_ID!;     // 67c74cbc0024c78264c0

export const appwriteConfig = {
  client: client,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
};

// Google OAuth functions (commented out but preserved)
/*
export async function login(){
    try {
        const redirectUri = Linking.createURL('/');
        const response = await account.createOAuth2Token(OAuthProvider.Google,redirectUri)
        if(!response) throw new Error('Failed to Login');
        const browserResult = await openAuthSessionAsync(
            response.toString(),
            redirectUri
        )
        // ...rest of Google OAuth logic...
    } catch(error){
        console.error('OAuth error:', error);
        return false;
    }
}
*/

// Email authentication functions
export const emailSignup = async (email: string, password: string, name: string, userType: 'student' | 'faculty') => {
  try {
    const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : FACULTY_COLLECTION_ID;
    
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      throw new Error('Please enter a valid email address');
    }

    // First check if user already exists
    const existing = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.equal('email', email)]
    );

    if (existing.documents.length > 0) {
      throw new Error('User already exists with this email');
    }

    // Create new user document with only the fields that exist in the schema
    const user = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      ID.unique(),
      {
        email: email.toLowerCase(), // Store email in lowercase
        password,
        name
      }
    );
    
    console.log('New user created:', user);
    return { user };
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 401) {
      throw new Error('Permission denied. Please check collection permissions.');
    }
    throw error;
  }
};

export const emailLogin = async (email: string, password: string, name: string, userType: 'student' | 'faculty') => {
  try {
    const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : FACULTY_COLLECTION_ID;
    
    // Fix: Use Query.equal for each field
    // Query with lowercase email for consistency
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [
        Query.equal('email', email.toLowerCase()),
        Query.equal('password', password),
        Query.equal('name', name)
      ]
    );

    if (response.documents.length === 0) {
      throw new Error('Invalid credentials. Please check your details.');
    }

    const user = response.documents[0];
    console.log('Login successful for:', user.name);
    return { user };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const createAccount = async (email: string, password: string, name: string) => {
  try {
    const user = await account.create('unique()', email, password, name);
    return user;
  } catch (error) {
    console.error('Create account error:', error);
    throw error;
  }
};

export async function logout() {
  try {
    await account.deleteSession('current');
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch (error) {
    console.error(error);
    return null;
  }
}