export interface AppwriteUser {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface User {
  $id: string;
  name?: string;
  email?: string;
  userType?: 'student' | 'faculty';
}

export interface Course {
  $id: string;
  courseId: string;
  courseName: string;
  className: string;
  facultyId: string;
  isClassOn: boolean;
  startedAt?: string;
  endedAt?: string;
}

// ...rest of interfaces...

export interface GlobalContextType {
  isLogged: boolean;
  loading: boolean;
  refetch: () => void;
  setUser: (user: User | null) => void;
}
