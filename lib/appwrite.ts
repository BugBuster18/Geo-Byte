import { Alert } from 'react-native';
import { Account, Avatars, Client, OAuthProvider, Databases, ID, Query } from 'react-native-appwrite';
import { sendOTPEmail } from './emailService';
import { User } from './types';

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
};

export const client = new Client();
try{

  client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!);
} catch (error) {
  console.error('Error setting up Appwrite client:', error);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const STUDENTS_COLLECTION_ID = process.env.EXPO_PUBLIC_STUDENT_COLLECTION_ID!;    // 67c74c510001bc241039
const FACULTY_COLLECTION_ID = process.env.EXPO_PUBLIC_FACULTY_COLLECTION_ID!;     // 67c74cbc0024c78264c0
const COURSES_COLLECTION_ID = '67cc850800136002bd84';  // Set the constant directly

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

// Add utility function for email sending simulation
const simulateEmailSend = (email: string, otp: string) => {
  console.log(`OTP for ${email}: ${otp}`);
  // In a real app, this would send an actual email
  Alert.alert('OTP Sent', `Your OTP is: ${otp}\n\nIn production, this would be sent via email.`);
};

// Email authentication functions
export const emailSignup = async (
  email: string, 
  password: string, 
  name: string, 
  userType: 'student' | 'faculty',
  section?: string
) => {
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

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create user document with unverified status
    const userData = {
      email: email.toLowerCase(),
      password,
      name,
      class: userType === 'student' ? section : undefined, // Now stores full section name
      semester: userType === 'student' ? '4th' : undefined, // Added semester field
      verified: false,
      otp: otp, // Store OTP temporarily
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
    };

    // Filter out undefined values
    const cleanedUserData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => v !== undefined)
    );

    const user = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      ID.unique(),
      cleanedUserData
    );

    // Send OTP via email
    await sendOTPEmail(email, otp);
    
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

export const sendVerificationEmail = async (email: string, otp: string) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_ENDPOINT}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return response.ok;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    // Try student collection first
    let response = await databases.listDocuments(
      DATABASE_ID,
      STUDENTS_COLLECTION_ID,
      [Query.equal('email', email.toLowerCase())]
    );

    // If not found in students, try faculty collection
    if (response.documents.length === 0) {
      response = await databases.listDocuments(
        DATABASE_ID,
        FACULTY_COLLECTION_ID,
        [Query.equal('email', email.toLowerCase())]
      );
    }

    if (response.documents.length === 0) {
      console.error('User not found');
      return false;
    }

    const user = response.documents[0];
    console.log('Found user:', user); // Debug log

    // Check if OTP has expired
    const otpExpiry = new Date(user.otpExpiry);
    if (otpExpiry < new Date()) {
      throw new Error('OTP has expired');
    }

    // Debug logs
    console.log('Stored OTP:', user.otp);
    console.log('Provided OTP:', otp);
    console.log('OTP Match:', user.otp === otp);

    // Verify OTP
    if (user.otp === otp) {
      // Update user document to verified
      // await databases.updateDocument(
      //   DATABASE_ID,
      //   user.$collectionId, // Use the correct collection ID
      //   user.$id,
      //   {
      //     verified: true,
      //     otp: null,
      //     otpExpiry: null
      //   }
      // );
      return true;
    }
    return false;
  } catch (error) {
    console.error('Detailed OTP verification error:', error);
    throw error;
  }
};

export const emailLogin = async (email: string, password: string, name: string, userType: 'student' | 'faculty') => {
  try {
    const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : FACULTY_COLLECTION_ID;
    
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Convert email to lowercase for consistency
    const normalizedEmail = email.toLowerCase();
    
    // First verify if user exists
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.equal('email', normalizedEmail)]
    );

    if (response.documents.length === 0) {
      throw new Error('Invalid credentials. User not found.');
    }

    // Then verify password
    const user = response.documents[0];
    if (user.password !== password) {
      throw new Error('Invalid credentials. Please check your password.');
    }

    // Add useful metadata to the response
    return {
      user: {
        ...user,
        userType,
        lastLoginAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to authenticate user');
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

interface Course {
  $id: string;
  courseId: string;  // Added this field
  courseName: string;
  className: string;
  facultyId: string;
  isClassOn: boolean;
  startedAt?: string;
  endedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $collectionId?: string;
  $databaseId?: string;
}

export const getCourses = async (): Promise<Course[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COURSES_COLLECTION_ID
    );
    
    // Sort courses by startedAt time to ensure consistent order
    const courses = response.documents.map(doc => ({
      $id: doc.$id,
      courseId: doc.courseId,
      courseName: doc.courseName,
      className: doc.className,
      facultyId: doc.facultyId,
      isClassOn: doc.isClassOn || false,
      startedAt: doc.startedAt,
      endedAt: doc.endedAt
    }));

    // Sort by startedAt time, most recent first
    return courses.sort((a, b) => {
      if (!a.startedAt) return 1;
      if (!b.startedAt) return -1;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

export const getCoursesByFacultyId = async (facultyId: string): Promise<Course[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COURSES_COLLECTION_ID,
      [Query.equal('facultyId', facultyId)]
    );

    // Map the response directly without checking class status
    return response.documents.map(doc => ({
      $id: doc.$id,
      courseId: doc.courseId,
      courseName: doc.courseName,
      className: doc.className,
      facultyId: doc.facultyId,
      isClassOn: doc.isClassOn || false,
      startedAt: doc.startedAt,
      endedAt: doc.endedAt
    }));
  } catch (error) {
    console.error('Error fetching faculty courses:', error);
    throw error;
  }
};

export const getCoursesByClassName = async (className: string): Promise<Course[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COURSES_COLLECTION_ID,
      [Query.equal('className', className)]
    );
    return response.documents.map(doc => ({
      $id: doc.$id,
      courseId: doc.courseId,  // Include courseId in the mapped response
      courseName: doc.courseName,
      className: doc.className,
      facultyId: doc.facultyId,
      isClassOn: doc.isClassOn || false,
      startedAt: doc.startedAt,
      endedAt: doc.endedAt
    }));
  } catch (error) {
    console.error('Error fetching class courses:', error);
    throw error;
  }
};

export const createCourse = async (courseData: {
  courseId: string;
  courseName: string;
  className: string;
  facultyId: string;
}): Promise<Course> => {
  try {
    console.log('Creating course with collection ID:', COURSES_COLLECTION_ID); // Debug log
    const response = await databases.createDocument(
      DATABASE_ID,
      COURSES_COLLECTION_ID,
      ID.unique(),
      {
        ...courseData,
        isClassOn: false,
        startedAt: null,
        endedAt: null
      }
    );
    return response as Course;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId: string): Promise<boolean> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COURSES_COLLECTION_ID,
      [Query.equal('courseId', courseId)]
    );

    if (response.documents.length > 0) {
      await databases.deleteDocument(
        DATABASE_ID,
        COURSES_COLLECTION_ID,
        response.documents[0].$id
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

export const startClass = async (facultyId: string, courseId: string): Promise<boolean> => {
  try {
    const serverUrl = process.env.EXPO_PUBLIC_SERVER_ENDPOINT;
    const response = await fetch(`${serverUrl}/teacher/on/${facultyId}/${courseId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start class');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error starting class:', error);
    throw error;
  }
};

export const stopClass = async (courseId: string): Promise<boolean> => {
  try {
    const serverUrl = process.env.EXPO_PUBLIC_SERVER_ENDPOINT;
    const response = await fetch(`${serverUrl}/teacher/off/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error stopping class:', error);
    throw error;
  }
};

export const markAttendanceInAppwrite = async ({ 
  user, 
  activeClass 
}: { 
  user: User | null; 
  activeClass: Course 
}) => {
  try {
    if (!user?.name || !user?.email || !activeClass?.courseId) {
      throw new Error('Missing required attendance data');
    }

    const ATTENDANCE_COLLECTION_ID = '67c89861000dfa747718';
    const currentTime = new Date().toISOString();

    const attendanceData = {
      Name: user.name,
      Email: user.email,
      isPresent: true,
      Created_At: currentTime,
      courseId: activeClass.courseId,
      userId: user.$id // Add user ID to track ownership
    };

    const attendanceRecord = await databases.createDocument(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      ID.unique(),
      attendanceData
    );

    return !!attendanceRecord.$id;
  } catch (error: any) {
    if (error?.code === 401) {
      throw new Error('Please login again to mark attendance');
    }
    throw error;
  }
};