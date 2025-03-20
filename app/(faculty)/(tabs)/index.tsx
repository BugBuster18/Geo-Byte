import { View, Text, TouchableOpacity, ScrollView, Image, Animated, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import icons from '@/constants/icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCoursesByFacultyId, deleteCourse, startClass, stopClass } from '@/lib/appwrite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Update the Course interface to include sessionData and date
interface Course {
  $id: string;
  courseId: string;
  courseName: string;
  className: string;
  facultyId: string;
  isClassOn: boolean;
  startedAt?: string;
  endedAt?: string;
  date?: string;
  sessionData?: {
    presentStudents: Array<{ id: number; rollNo: string; name: string; time?: string }>;
    absentStudents: Array<{ rollNo: string; name: string }>;
    courseId: string;
    courseName: string;
    className: string;
    date: string;
    startTime?: string;
    endTime: string;
    totalStudents: number;
  };
}

const FacultyHome = () => {
  const params = useLocalSearchParams();
  const { user, currentSession, setActiveClassSession } = useGlobalContext();
  const router = useRouter();
  const [activeClass, setActiveClass] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [attendanceTaken, setAttendanceTaken] = useState(false);
  const [classSession, setClassSession] = useState<{
    startTime: Date | null;
    date: string | null;
  }>({
    startTime: null,
    date: null,
  });
  const [completedClasses, setCompletedClasses] = useState<Course[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startedClasses, setStartedClasses] = useState<Course[]>([]);

  const capitalizeFirstLetter = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const loadStartedClass = async () => {
    try {
      const stored = await AsyncStorage.getItem('startedClass');
      if (stored) {
        const parsedClass = JSON.parse(stored);
        setActiveClass(parsedClass);
        setStartedClasses([parsedClass]);
      }
    } catch (error) {
      console.error('Error loading started class:', error);
    }
  };

  const saveStartedClass = async (course: Course) => {
    try {
      await AsyncStorage.setItem('startedClass', JSON.stringify(course));
      setStartedClasses([course]);
    } catch (error) {
      console.error('Error saving started class:', error);
    }
  };

  const handleStartClass = async (course: Course) => {
    try {
      const success = await startClass(user?.$id || '', course.courseId);
      if (!success) {
        throw new Error('Failed to start class. Another class may be in session.');
      }

      const updatedCourse = {
        ...course,
        isClassOn: true,
        startedAt: new Date().toLocaleTimeString()
      };

      setActiveClass(updatedCourse);
      setClassSession({
        startTime: new Date(),
        date: new Date().toLocaleDateString(),
      });
      setActiveClassSession({ 
        ...updatedCourse,
        presentStudents: [],
        absentStudents: []
      });
      
      // Remove from available courses list
      setCourses(prev => prev.filter(c => c.$id !== course.$id));
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to start class';
      console.error('Error starting class:', error);
      Alert.alert('Error', message);
    }
  };

  const handleStopClass = async () => {
    if (!activeClass) return;

    try {
      const success = await stopClass(activeClass.courseId);
      if (success) {
        if (currentSession.presentStudents.length > 0) {
          const currentDate = new Date();
          const formattedDate = currentDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          const sessionData = {
            courseId: activeClass.courseId,
            courseName: activeClass.courseName,
            className: activeClass.className,
            date: formattedDate,
            startTime: classSession.startTime?.toLocaleTimeString(),
            endTime: currentDate.toLocaleTimeString(),
            presentStudents: currentSession.presentStudents,
            absentStudents: currentSession.absentStudents,
            totalStudents: 60,
          };

          // Add to completed classes with formatted date
          const completedClass = {
            ...activeClass,
            endedAt: currentDate.toLocaleTimeString(),
            date: formattedDate, // Add formatted date here
            sessionData
          };

          const updatedCompletedClasses = [completedClass, ...completedClasses];
          setCompletedClasses(updatedCompletedClasses);
          await AsyncStorage.setItem('completedCourses', JSON.stringify(updatedCompletedClasses));
          Alert.alert('Success', 'Class session saved successfully');
        }

        // Reset states
        setActiveClass(null);
        setAttendanceTaken(false);
        setActiveClassSession(null);
        setClassSession({ startTime: null, date: null });
        await AsyncStorage.removeItem('startedClass');
        setStartedClasses([]);
        refreshCourses();
      }
    } catch (error) {
      console.error('Error ending class:', error);
      Alert.alert('Error', 'Failed to end class session');
    }
  };

  const handleTakeAttendance = async (courseId: string) => {
    try {
      setLoading(true);
      const serverUrl = process.env.EXPO_PUBLIC_SERVER_ENDPOINT;
      console.log('Enabling attendance for:', courseId);
      console.log('Server URL:', serverUrl);
      
      const response = await fetch(`${serverUrl}/teacher/enableAttendance/${courseId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add empty body since it's a POST request
        body: JSON.stringify({})
      });

      // First log the raw response for debugging
      const rawResponse = await response.text();
      console.log('Raw server response:', rawResponse);

      // Try parsing the response
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to enable attendance');
      }

      setAttendanceTaken(true);
      Alert.alert('Success', 'Students can now mark their attendance');
    } catch (error) {
      console.error('Error enabling attendance:', error);
      Alert.alert(
        'Error', 
        'Failed to start attendance taking. Please check server connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Add function to stop taking attendance
  const handleStopTakingAttendance = async (courseId: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_ENDPOINT}/teacher/disableAttendance/${courseId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to disable attendance');
      }

      setAttendanceTaken(false);
      Alert.alert('Attendance Stopped', 'Students can no longer mark attendance');
    } catch (error) {
      console.error('Error disabling attendance:', error);
      Alert.alert('Error', 'Failed to stop attendance');
    }
  };

  const handleViewAttendance = () => {
    if (!activeClass) return;
    
    router.push({
      pathname: '/(faculty)/(tabs)/attendance-details',
      params: { 
        subject: activeClass.courseName,  // Changed from subject to courseName
        className: activeClass.className  // Changed from name to className
      }
    });
  };

  const handleDeleteCourse = async (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete ${course.courseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourse(course.courseId);
              // Refresh course list
              const fetchedCourses = await getCoursesByFacultyId(user?.$id || '');
              setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
              Alert.alert('Success', 'Course deleted successfully');
            } catch (error) {
              console.error('Delete course error:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          }
        }
      ]
    );
  };

  // Add animation for live indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  // Fetch courses when component mounts
  useEffect(() => {
    const fetchCoursesAndStatus = async () => {
      try {
        setLoading(true);
        if (user?.$id) {
          await refreshCourses();
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        Alert.alert('Error', 'Failed to fetch courses');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesAndStatus();
  }, [user]);

  // Add effect to handle refresh parameter
  useEffect(() => {
    if (params.refresh === 'true') {
      refreshCourses();
    }
  }, [params.refresh]);

  // Add new effect to load completed courses on mount
  useEffect(() => {
    const loadCompletedCourses = async () => {
      try {
        const stored = await AsyncStorage.getItem('completedCourses');
        if (stored) {
          setCompletedClasses(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading completed courses:', error);
      }
    };
    loadCompletedCourses();
  }, []);

  useEffect(() => {
    loadStartedClass();
  }, []);

  // Add new effect to check for active classes on mount
  useEffect(() => {
    const checkActiveClasses = async () => {
      try {
        if (!user?.$id) return;
        
        const fetchedCourses = await getCoursesByFacultyId(user.$id);
        const activeClass = fetchedCourses.find(course => course.isClassOn);
        
        if (activeClass) {
          setActiveClass(activeClass);
          setClassSession({
            startTime: new Date(activeClass.startedAt || ''),
            date: new Date().toLocaleDateString(),
          });
          setActiveClassSession({ 
            ...activeClass,
            presentStudents: [],
            absentStudents: []
          });
        }
        
        setCourses(fetchedCourses.filter(course => !course.isClassOn));
      } catch (error) {
        console.error('Error checking active classes:', error);
      }
    };

    checkActiveClasses();
  }, [user]);

  const refreshCourses = async () => {
    setLoading(true);
    try {
      if (user?.$id) {
        const fetchedCourses = await getCoursesByFacultyId(user.$id);
        if (Array.isArray(fetchedCourses)) {
          setCourses(fetchedCourses);
        }
      }
    } catch (error) {
      console.error('Error refreshing courses:', error);
      Alert.alert('Error', 'Failed to refresh courses');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (classData: Course & { sessionData?: any }) => {
    try {
      const headers = 'Roll No,Name,Time,Status\n';
      const presentRows = classData.sessionData?.presentStudents.map((student: any) => 
        `${student.rollNo},${student.name},${student.time},Present`
      ).join('\n');
      const absentRows = classData.sessionData?.absentStudents.map((student: any) =>
        `${student.rollNo},${student.name},-,Absent`
      ).join('\n');
      
      const csvContent = headers + presentRows + '\n' + absentRows;
      const filename = `${classData.courseId}_${classData.className}_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Attendance Report',
          UTI: 'public.comma-separated-values-text'
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate attendance report');
    }
  };

  const handleRefreshCompletedClasses = async () => {
    setIsRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem('completedCourses');
      if (stored) {
        setCompletedClasses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error refreshing completed classes:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetCompletedClasses = async () => {
    Alert.alert(
      'Reset Completed Classes',
      'Are you sure you want to reset all completed classes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('completedCourses');
              setCompletedClasses([]);
              Alert.alert('Success', 'Completed classes reset successfully');
            } catch (error) {
              console.error('Error resetting completed classes:', error);
              Alert.alert('Error', 'Failed to reset completed classes');
            }
          }
        }
      ]
    );
  };

  const COURSE_CODE_MAP: { [key: string]: string } = {
    'Operating Systems': 'CS204',
    'Software Engineering': 'CS301',
    'Database Management Systems': 'CS310',
    'Theory of Computation': 'CS206',
    'Linear Algebra': 'MA202',
    'Ethics': 'HS205'
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pb-6">
          {/* Header Section */}
          <View className="flex flex-row items-center justify-between mt-5">
            <View className="flex flex-row items-center">
              <View className="flex-col ml-3">
                <Text className="text-xs text-gray-500 font-rubik">Faculty Dashboard</Text>
                <Text className="text-xl text-black font-rubik-bold">
                  {capitalizeFirstLetter(user?.name || '')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity 
                onPress={refreshCourses}
                className="bg-blue-50 p-2 rounded-full"
              >
                <Image 
                  source={require('@/assets/icons/refresh.png')} 
                  className="w-6 h-6" 
                  tintColor="#0061ff"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/(faculty)/create-course')}
                className="bg-blue-500 py-2 px-4 rounded-full"
              >
                <Text className="text-white font-rubik-medium">Create Course</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-blue-50 p-2 rounded-full">
                <Image source={icons.bell} className="w-6 h-6" tintColor="#0061ff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Class Section */}
          {activeClass ? (
            <View className="mt-6 bg-blue-500 p-5 rounded-xl">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-xl font-rubik-bold text-white">{activeClass.courseName}</Text>
                  <View className="flex-row items-center mt-1">
                    <Animated.View style={{ opacity: fadeAnim }} className="w-2 h-2 rounded-full bg-red-400 mr-2" />
                    <Text className="text-sm font-rubik text-white">{activeClass.className} · Live Now</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={handleStopClass}
                  className="bg-red-500 py-2 px-4 rounded-full"
                >
                  <Text className="text-white font-rubik-medium">End Class</Text>
                </TouchableOpacity>
              </View>

              {/* Attendance Counter */}
              <View className="mt-4 bg-white/20 p-4 rounded-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-rubik-medium">
                    {attendanceTaken ? 'Present Students' : 'Start Attendance'}
                  </Text>
                  {attendanceTaken && (
                    <Text className="text-white font-rubik-bold text-xl">
                      {currentSession.presentStudents.length}
                    </Text>
                  )}
                </View>
                {!attendanceTaken ? (
                  <TouchableOpacity 
                    onPress={() => handleTakeAttendance(activeClass?.courseId || '')}  // Changed from $id to courseId
                    className="bg-white mt-3 py-3 rounded-lg"
                  >
                    <Text className="text-blue-600 font-rubik-medium text-center">
                      Take Attendance
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row space-x-2 mt-3">
                    <TouchableOpacity 
                      onPress={handleViewAttendance}
                      className="bg-white flex-1 py-3 rounded-lg"
                    >
                      <Text className="text-blue-600 font-rubik-medium text-center">
                        View Details
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleStopTakingAttendance(activeClass?.courseId || '')}
                      className="bg-red-500 flex-1 py-3 rounded-lg"
                    >
                      <Text className="text-white font-rubik-medium text-center">
                        Stop Taking
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text className="text-xl font-rubik-bold text-gray-800 mt-6 mb-4">Today's Classes</Text>
          )}

          {/* Add Started Classes Section */}
          {startedClasses.length > 0 && !activeClass && (
            <View className="mt-6">
              <Text className="text-xl font-rubik-bold text-gray-800 mb-4">
                Started Class
              </Text>
              {startedClasses.map((course) => (
                <TouchableOpacity
                  key={course.$id}
                  onPress={() => handleStartClass(course)}
                  className="bg-white shadow-lg shadow-gray-100 rounded-xl p-4 mb-4 border border-green-100"
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-lg font-rubik-medium text-gray-800">
                        {course.courseName}
                      </Text>
                      <Text className="text-base font-rubik text-gray-500">
                        {course.className}
                      </Text>
                      <Text className="text-sm font-rubik text-green-500">
                        Started at: {course.startedAt}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleStartClass(course)}
                      className="bg-green-500 py-3 px-6 rounded-full"
                    >
                      <Text className="text-white font-rubik-medium">Continue</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Classes List */}
          <View className="mt-2">
            {loading ? (
              <ActivityIndicator size="large" color="#0061ff" className="mt-4" />
            ) : courses.length > 0 ? (
              courses.map((course) => (
                <TouchableOpacity
                  key={course.$id}
                  disabled={!!activeClass}
                  className={`bg-white shadow-lg shadow-gray-100 rounded-xl p-4 mb-4 ${!activeClass ? 'border border-blue-100' : ''}`}
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-lg font-rubik-medium text-gray-800">
                        {course.courseName}
                      </Text>
                      <Text className="text-base font-rubik text-gray-500">
                        {course.className}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-500">
                        Course ID: {course.courseId}
                      </Text>
                    </View>
                    {!activeClass && (
                      <View className="flex-row space-x-2">
                        <TouchableOpacity 
                          onPress={() => handleStartClass(course)}
                          className="bg-blue-500 py-3 px-6 rounded-full"
                        >
                          <Text className="text-white font-rubik-medium">
                            {course.isClassOn ? 'Continue' : 'Start'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => handleDeleteCourse(course)}
                          className="bg-red-500 py-3 px-4 rounded-full"
                        >
                          <Text className="text-white font-rubik-medium">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="mt-4">
                <Text className="text-center text-gray-500 font-rubik">
                  No courses found. Create your first course!
                </Text>
              </View>
            )}
          </View>

          {/* Completed Classes Section */}
          <View className="mt-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-rubik-bold text-gray-800">
                Completed Classes
              </Text>
              <View className="flex-row space-x-2">
                <TouchableOpacity 
                  onPress={handleRefreshCompletedClasses}
                  disabled={isRefreshing}
                  className="bg-blue-500 p-2 rounded-full"
                >
                  <Image 
                    source={require('@/assets/icons/refresh.png')} 
                    className="w-5 h-5" 
                    tintColor="white"
                    style={{
                      opacity: isRefreshing ? 0.5 : 1,
                      transform: [{
                        rotate: isRefreshing ? '180deg' : '0deg'
                      }]
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleResetCompletedClasses}
                  className="bg-orange-500 p-2 rounded-full"
                >
                  <Text className="text-white font-rubik-medium px-2">
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {completedClasses.length > 0 ? (
              completedClasses.map((course: Course) => (
                <View
                  key={`${course.$id}_completed`}
                  className="bg-white shadow-lg shadow-gray-100 rounded-xl p-4 mb-4 border border-gray-100"
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-lg font-rubik-medium text-gray-800">
                        {course.courseName}
                      </Text>
                      <Text className="text-base font-rubik text-gray-500">
                        {course.className}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-500">
                        Date: {course.date}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-500">
                        Ended at: {course.endedAt}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDownloadReport(course)}
                      className="bg-green-500 py-2 px-4 rounded-lg"
                    >
                      <Text className="text-white font-rubik-medium">
                        Download Report
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-center text-gray-500 font-rubik">
                No completed classes yet
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FacultyHome;
