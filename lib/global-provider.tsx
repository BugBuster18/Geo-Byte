import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { getCurrentUser, account, emailLogin } from "./appwrite";
import { useAppwrite } from "./useAppwrite";
import { Redirect, router } from "expo-router";
import { Models } from "react-native-appwrite";

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
  userType: 'student' | 'faculty' | null;
  setUserType: (type: 'student' | 'faculty') => void;
  logout: () => Promise<void>;
  currentSession: {
    presentStudents: Array<{
      id: number;
      name: string;
      rollNo: string;
      time?: string;
    }>;
    absentStudents: Array<{
      id: number;
      name: string;
      rollNo: string;
    }>;
    activeClass: any;
  };
  updateSessionStudents: (present: any[], absent: any[]) => void;
  setActiveClassSession: (classData: any) => void;
  handleEmailLogin: (email: string, password: string, name: string, userType: 'student' | 'faculty') => Promise<boolean>;
}

interface User {
  $id: string;
  name: string;
  email: string;
  userType: 'student' | 'faculty';
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [userType, setUserType] = React.useState<'student' | 'faculty' | null>(null);
  const [user, setUser] = useState<any>(null);

  // Load userType from storage on mount
  React.useEffect(() => {
    const loadUserType = async () => {
      try {
        const savedUserType = await AsyncStorage.getItem('userType');
        if (savedUserType) {
          setUserType(savedUserType as 'student' | 'faculty');
        }
      } catch (error) {
        console.error('Error loading userType:', error);
      }
    };
    loadUserType();
  }, []);

  // Add this useEffect to check for stored user on app load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedUserType = await AsyncStorage.getItem('userType');
        if (storedUser && storedUserType) {
          setUser(JSON.parse(storedUser));
          setUserType(storedUserType as 'student' | 'faculty');
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
      }
    };
    loadUser();
  }, []);

  // Modify setUserType to persist the value
  const handleSetUserType = async (type: 'student' | 'faculty') => {
    try {
      await AsyncStorage.setItem('userType', type);
      setUserType(type);
    } catch (error) {
      console.error('Error saving userType:', error);
    }
  };

  const {
    loading,
    refetch,
  } = useAppwrite({
    fn: getCurrentUser,
  });

  const isLogged = !!user;

  const logout = async () => {
    try {
      // Clear everything from AsyncStorage
      await AsyncStorage.clear();
      // Reset all states
      setUser(null);
      setUserType(null);
      setCurrentSession({
        presentStudents: [],
        absentStudents: [],
        activeClass: null
      });
      
      // Force navigation to login selection
      router.replace('/LoginSelection');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const [currentSession, setCurrentSession] = useState({
    presentStudents: [],
    absentStudents: [],
    activeClass: null
  });

  const updateSessionStudents = (present: any[], absent: any[]) => {
    setCurrentSession(prev => ({
      ...prev,
      presentStudents: present,
      absentStudents: absent
    }));
  };

  const setActiveClassSession = async (classData: any) => {
    try {
      // Clear previous attendance status when starting new session
      await AsyncStorage.removeItem('markedAttendance');
      
      setCurrentSession(prev => ({
        ...prev,
        activeClass: classData,
        presentStudents: [],
        absentStudents: []
      }));
    } catch (error) {
      console.error('Error resetting attendance status:', error);
    }
  };

  const handleEmailLogin = async (email: string, password: string, name: string, userType: 'student' | 'faculty') => {
    try {
      const result = await emailLogin(email, password, name, userType);
      if (result.user) {
        setUser(result.user);
        setUserType(userType);
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        await AsyncStorage.setItem('userType', userType);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const value = {
    isLogged,
    user,
    loading,
    refetch,
    userType,
    setUserType: handleSetUserType,
    logout,
    currentSession,
    updateSessionStudents,
    setActiveClassSession,
    handleEmailLogin
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;

function setUser(user: Models.Document) {
  throw new Error("Function not implemented.");
}
