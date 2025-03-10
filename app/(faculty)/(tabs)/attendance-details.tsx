import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import icons from '@/constants/icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useGlobalContext } from '@/lib/global-provider'; // Fix import path
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STUDENTS, getStudentByRollNo, StudentData } from '@/constants/students';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Student {
  id: number;
  name: string;
  rollNo: string;
  time?: string;
}

interface AttendanceRecord {
  date: string;
  present: string[];
}

interface SubjectAttendance {
  [rollNo: string]: {
    name: string;
    attendance: { [date: string]: 'P' | 'A' };
  };
}

interface AppwriteAttendanceRecord {
  Name: string;
  Email: string;
  Created_At: string;
  Course_Code: string;
  $id: string;
}

const AttendanceDetails = () => {
  const router = useRouter();
  const { subject, className, sessionDate = new Date().toLocaleDateString() } = useLocalSearchParams();
  const { currentSession, updateSessionStudents } = useGlobalContext();
  const [showPresent, setShowPresent] = useState(true); // Add this state
  const [newRollNo, setNewRollNo] = useState('');
  const [presentStudents, setPresentStudents] = useState<Student[]>(
    currentSession?.presentStudents || []
  );
  const [absentStudents, setAbsentStudents] = useState<Student[]>(
    currentSession?.absentStudents || []
  );
  const totalStudents = 60; // Total class strength
  const attendancePercentage = ((presentStudents.length / totalStudents) * 100).toFixed(1);
  const [allStudents] = useState(Array.from({ length: 70 }, (_, i) => ({
    rollNo: `23BCS${String(i + 1).padStart(3, '0')}`,
    name: `Student ${i + 1}`
  })));
  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendance>({});

  const [appwriteAttendance, setAppwriteAttendance] = useState<{
    records: AppwriteAttendanceRecord[];
    loading: boolean;
    error: string | null;
  }>({
    records: [],
    loading: true,
    error: null
  });

  const COURSE_CODE_MAP: { [key: string]: string } = {
    'Operating Systems': 'CS204',
    'Software Engineering': 'CS301',
    'Database Management Systems': 'CS310',
    'Theory of Computation': 'CS206',
    'Linear Algebra': 'MA202',
    'Ethics': 'HS205'
  };

  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [courseStartTime, setCourseStartTime] = useState<string | null>(null);
  // Comment out date range related states and functions
  /*
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    selecting: 'start' as 'start' | 'end'
  });

  const fetchAttendanceByDateRange = async () => {
    // ... date range fetch function ...
  };

  const generateDateRangeReport = async () => {
    // ... date range report generation function ...
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // ... date change handler ...
  };
  */

  // Add function to get course details including start time
  const getCourseDetails = async (courseName: string) => {
    try {
      const COURSES_COLLECTION_ID = '67cc850800136002bd84';
      const response = await databases.listDocuments(
        DATABASE_ID,
        COURSES_COLLECTION_ID,
        [Query.equal('courseName', courseName)]
      );

      if (response.documents.length > 0) {
        const course = response.documents[0];
        console.log('Found course with start time:', course.startedAt);
        setCourseStartTime(course.startedAt);
        setCourseCode(course.courseId);
        return course;
      }
      throw new Error(`No course found with name: ${courseName}`);
    } catch (error) {
      console.error('Error fetching course details:', error);
      return null;
    }
  };

  const getCourseCode = async (courseName: string): Promise<string | null> => {
    // First try direct mapping
    if (COURSE_CODE_MAP[courseName]) {
      return COURSE_CODE_MAP[courseName];
    }

    try {
      const COURSES_COLLECTION_ID = '67cc850800136002bd84';
      const response = await databases.listDocuments(
        DATABASE_ID,
        COURSES_COLLECTION_ID,
        [Query.equal('courseName', courseName)]
      );

      if (response.documents.length > 0) {
        const course = response.documents[0];
        console.log('Found course:', course);
        return course.courseId;
      }
      
      console.error('No course found with name:', courseName);
      return null;
    } catch (error) {
      console.error('Error fetching course code:', error);
      return null;
    }
  };

  useEffect(() => {
    // Reset lists when component mounts
    setPresentStudents(currentSession?.presentStudents || []);
    setAbsentStudents(currentSession?.absentStudents || []);
  }, [currentSession]);

  useEffect(() => {
    loadAttendanceData();
    fetchAppwriteAttendance();
  }, [subject]);

  const loadAttendanceData = async () => {
    try {
      // Get all attendance records for this subject
      const keys = await AsyncStorage.getAllKeys();
      const attendanceKeys = keys.filter(key => 
        key.startsWith(`attendance_${subject}_${className}_`)
      );
      
      let allRecords = {};
      
      // Combine all records
      for (let key of attendanceKeys) {
        const record = await AsyncStorage.getItem(key);
        if (record) {
          const data = JSON.parse(record);
          allRecords = {
            ...allRecords,
            ...data.presentStudents.reduce((acc: any, student: { rollNo: any; name: any; }) => ({
              ...acc,
              [student.rollNo]: {
                name: student.name,
                attendance: {
                  [data.date]: 'P'
                }
              }
            }), {})
          };
        }
      }

      setSubjectAttendance(allRecords);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const saveAttendanceData = async () => {
    try {
      const key = `attendance_${subject}_${className}`;
      await AsyncStorage.setItem(key, JSON.stringify(subjectAttendance));
    } catch (error) {
      console.error('Error saving attendance data:', error);
    }
  };

  const fetchAppwriteAttendance = async () => {
    if (!subject) return;

    try {
      console.log('Fetching attendance for subject:', subject);
      
      // Handle subject name
      const subjectName = Array.isArray(subject) ? subject[0] : subject;
      console.log('Subject name:', subjectName);
      
      // Get course code
      const code = await getCourseCode(subjectName);
      console.log('Retrieved course code:', code);
      
      if (!code) {
        console.error('No course code found for subject:', subjectName);
        throw new Error(`Could not find course code for ${subjectName}`);
      }

      // Get today's date boundaries for filtering
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      console.log('Fetching attendance for:', {
        courseId: code,
        date: today.toLocaleDateString()
      });

      const ATTENDANCE_COLLECTION_ID = '67c89861000dfa747718';
      const response = await databases.listDocuments(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        [
          Query.equal('Course_Code', code),
          Query.greaterThanEqual('Created_At', startOfDay),
          Query.lessThanEqual('Created_At', endOfDay),
          Query.orderDesc('Created_At')
        ]
      );

      // Filter out duplicates, keeping only the earliest record for each student
      const uniqueStudents = new Map();
      response.documents.forEach((doc: any) => {
        const rollNo = doc.Email.split('@')[0].toUpperCase();
        if (!uniqueStudents.has(rollNo) || 
            new Date(doc.Created_At) < new Date(uniqueStudents.get(rollNo).Created_At)) {
          uniqueStudents.set(rollNo, doc);
        }
      });

      const uniqueRecords = Array.from(uniqueStudents.values());
      
      setAppwriteAttendance({
        records: uniqueRecords as unknown as AppwriteAttendanceRecord[],
        loading: false,
        error: null
      });

      // Map attendance records to student format
      const mappedStudents = uniqueRecords.map((doc: any) => ({
        id: doc.$id,
        name: doc.Name,
        rollNo: doc.Email.split('@')[0].toUpperCase(),
        time: new Date(doc.Created_At).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })
      }));

      console.log('Mapped students:', mappedStudents);
      setPresentStudents(mappedStudents);

      // Update absent students list
      const presentRollNos = new Set(mappedStudents.map(s => s.rollNo));
      const absentList = allStudents
        .filter(student => !presentRollNos.has(student.rollNo))
        .map((student, index) => ({
          id: Date.now() + index + 1000,
          name: student.name,
          rollNo: student.rollNo
        }));

      setAbsentStudents(absentList);

    } catch (error) {
      console.error('Error in fetchAppwriteAttendance:', error);
      setAppwriteAttendance(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch attendance records'
      }));
    }
  };

  const generateConsolidatedExcel = async () => {
    try {
      // Get current date
      const today = new Date().toISOString().split('T')[0];
      
      // Create combined attendance data
      const consolidatedData: { [rollNo: string]: { name: string; status: 'P' | 'A' } } = {};
      
      // Add present students
      presentStudents.forEach(student => {
        consolidatedData[student.rollNo] = {
          name: student.name,
          status: 'P'
        };
      });

      // Add absent students
      absentStudents.forEach(student => {
        consolidatedData[student.rollNo] = {
          name: student.name,
          status: 'A'
        };
      });

      // Create CSV content
      const headers = ['Roll No', 'Name', today];
      const rows = [headers.join(',')];

      // Sort by roll number for consistent output
      const sortedRollNos = Object.keys(consolidatedData).sort();
      
      sortedRollNos.forEach(rollNo => {
        const student = consolidatedData[rollNo];
        const row = [
          rollNo,
          student.name,
          student.status
        ];
        rows.push(row.join(','));
      });

      const csvContent = rows.join('\n');
      const filename = `${subject}_${className}_consolidated_${today}.csv`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Consolidated Attendance Report',
          UTI: 'public.comma-separated-values-text'
        });
      }
    } catch (error) {
      console.error('Error generating consolidated report:', error);
      Alert.alert('Error', 'Failed to generate consolidated attendance report');
    }
  };

  // Update global context whenever local state changes
  useEffect(() => {
    if (updateSessionStudents) {
      updateSessionStudents(presentStudents, absentStudents);
    }
  }, [presentStudents, absentStudents]);

  const handleMarkPresent = () => {
    if (!newRollNo.trim()) {
      Alert.alert('Error', 'Please enter a roll number');
      return;
    }

    // Format and validate roll number
    const formattedRollNo = newRollNo.toUpperCase().trim();
    if (!/^23BCS\d{3}$/.test(formattedRollNo)) {
      Alert.alert('Error', 'Invalid Roll Number Format', [
        { text: 'OK', onPress: () => console.log('Invalid format: ', formattedRollNo) }
      ]);
      return;
    }

    const student = getStudentByRollNo(formattedRollNo);
    if (!student) {
      Alert.alert('Error', 'Student not found. Format should be: 23BCS001');
      return;
    }

    // Check if already present
    if (presentStudents.some(s => s.rollNo === student.rollNo)) {
      Alert.alert('Already Present', 'This student is already marked present');
      return;
    }

    // Add to present list with actual student data
    setPresentStudents([
      ...presentStudents,
      {
        id: Date.now(),
        name: student.name,
        rollNo: student.rollNo,
        time: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })
      }
    ]);
    const today = new Date().toISOString().split('T')[0];
    setSubjectAttendance(prev => ({
      ...prev,
      [newRollNo]: {
        name: `Student ${newRollNo}`,
        attendance: {
          ...(prev[newRollNo]?.attendance || {}),
          [today]: 'P'
        }
      }
    }));
    saveAttendanceData();
    setNewRollNo('');
  };

  const handleMarkAbsent = () => {
    if (!newRollNo.trim()) {
      Alert.alert('Error', 'Please enter a roll number');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const presentStudent = presentStudents.find(student => student.rollNo === newRollNo);
    
    if (presentStudent) {
      // Move from present to absent list
      setPresentStudents(presentStudents.filter(student => student.rollNo !== newRollNo));
      setAbsentStudents([
        ...absentStudents,
        {
          id: presentStudent.id,
          name: presentStudent.name,
          rollNo: presentStudent.rollNo
        }
      ]);

      // Update attendance record
      setSubjectAttendance(prev => ({
        ...prev,
        [newRollNo]: {
          name: presentStudent.name,
          attendance: {
            ...(prev[newRollNo]?.attendance || {}),
            [today]: 'A'
          }
        }
      }));
      saveAttendanceData();
      Alert.alert('Success', `${presentStudent.name} marked as absent`);
    } else {
      // Add new absent student
      const newStudent = {
        id: Date.now(),
        name: `Student ${newRollNo}`,
        rollNo: newRollNo,
      };
      setAbsentStudents([...absentStudents, newStudent]);
      
      // Update attendance record
      setSubjectAttendance(prev => ({
        ...prev,
        [newRollNo]: {
          name: newStudent.name,
          attendance: {
            ...(prev[newRollNo]?.attendance || {}),
            [today]: 'A'
          }
        }
      }));
      saveAttendanceData();
    }
    setNewRollNo('');
  };

  const toggleAttendance = (studentId: number, currentStatus: 'present' | 'absent') => {
    const today = new Date().toISOString().split('T')[0];

    if (currentStatus === 'present') {
      const student = presentStudents.find(s => s.id === studentId);
      if (student) {
        setPresentStudents(presentStudents.filter(s => s.id !== studentId));
        setAbsentStudents([...absentStudents, {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo
        }]);

        // Update attendance record
        setSubjectAttendance(prev => ({
          ...prev,
          [student.rollNo]: {
            name: student.name,
            attendance: {
              ...(prev[student.rollNo]?.attendance || {}),
              [today]: 'A'
            }
          }
        }));
        saveAttendanceData();
      }
    } else {
      const student = absentStudents.find(s => s.id === studentId);
      if (student) {
        setAbsentStudents(absentStudents.filter(s => s.id !== studentId));
        setPresentStudents([...presentStudents, {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo,
          time: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })
        }]);

        // Update attendance record
        setSubjectAttendance(prev => ({
          ...prev,
          [student.rollNo]: {
            name: student.name,
            attendance: {
              ...(prev[student.rollNo]?.attendance || {}),
              [today]: 'P'
            }
          }
        }));
        saveAttendanceData();
      }
    }
  };

  const generateExcel = async () => {
    try {
      // Create CSV content
      const headers = 'Roll No,Name,Time,Status\n';
      const presentRows = presentStudents.map(student => 
        `${student.rollNo},${student.name},${student.time},Present`
      ).join('\n');
      const absentRows = absentStudents.map(student =>
        `${student.rollNo},${student.name},-,Absent`
      ).join('\n');
      
      const csvContent = headers + presentRows + '\n' + absentRows;
      
      // Generate filename with date and class details
      const filename = `${subject}_${className}_${Array.isArray(sessionDate) ? sessionDate[0] : sessionDate.replace(/\//g, '-')}.csv`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;

      // Write file
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Attendance Sheet',
          UTI: 'public.comma-separated-values-text'
        });
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      Alert.alert('Error', 'Failed to generate attendance sheet');
    }
  };

  useEffect(() => {
    setAppwriteAttendance(prev => ({ ...prev, loading: true }));
    Promise.all([
      loadAttendanceData(),
      fetchAppwriteAttendance()
    ]).finally(() => {
      setAppwriteAttendance(prev => ({ ...prev, loading: false }));
    });
  }, [subject]);

  // Remove time-based validation functions since we're not using them anymore
  const renderAttendanceTime = (time: string) => time;

  return (
    <SafeAreaView className="bg-white flex-1">
      <View className="px-4 py-4 flex-1">
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Image source={icons.backArrow} className="w-6 h-6" tintColor="#0061ff"/>
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-rubik-bold">{subject}</Text>
            <Text className="text-base font-rubik text-gray-500">{className}</Text>
          </View>
        </View>

        {/* Attendance Statistics */}
        <View className="flex-row justify-between bg-blue-50 p-4 rounded-xl mb-6">
          <View className="items-center">
            <Text className="text-2xl font-rubik-bold text-blue-600">{presentStudents.length}</Text>
            <Text className="text-sm font-rubik text-gray-600">Present</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-rubik-bold text-red-600">{totalStudents - presentStudents.length}</Text>
            <Text className="text-sm font-rubik text-gray-600">Absent</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-rubik-bold text-green-600">{attendancePercentage}%</Text>
            <Text className="text-sm font-rubik text-gray-600">Attendance</Text>
          </View>
        </View>

        {/* Manual Attendance Input */}
        <View className="mb-4">
          <TextInput
            value={newRollNo}
            onChangeText={setNewRollNo}
            placeholder="Enter Roll Number"
            className="border border-gray-200 rounded-lg p-2 font-rubik mb-2"
            keyboardType="default"
            autoCapitalize="characters"
          />
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={handleMarkPresent}
              className="bg-blue-500 py-3 rounded-lg flex-1"
            >
              <Text className="text-white font-rubik text-center">Mark Present</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleMarkAbsent}
              className="bg-red-500 py-3 rounded-lg flex-1"
            >
              <Text className="text-white font-rubik text-center">Mark Absent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Download Button */}
        <TouchableOpacity 
          onPress={generateExcel}
          className="bg-green-500 py-3 px-4 rounded-lg mb-4"
        >
          <Text className="text-white font-rubik text-center">Download Attendance Sheet</Text>
        </TouchableOpacity>

        {/* Single Refresh Button */}
        <TouchableOpacity 
          onPress={fetchAppwriteAttendance}
          className="bg-blue-500 py-3 px-4 rounded-lg mb-4 flex-row items-center justify-center"
          disabled={appwriteAttendance.loading}
        >
          <Image 
            source={icons.refresh} 
            className="w-5 h-5 mr-2" 
            tintColor="white" 
            style={{
              transform: [{ rotate: appwriteAttendance.loading ? '180deg' : '0deg' }]
            }}
          />
          <Text className="text-white font-rubik text-center">
            {appwriteAttendance.loading ? 'Refreshing...' : 'Refresh Attendance'}
          </Text>
        </TouchableOpacity>

        {/* Tab Buttons */}
        <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
          <TouchableOpacity 
            onPress={() => setShowPresent(true)}
            className={`flex-1 py-2 rounded-md ${showPresent ? 'bg-white' : ''}`}
          >
            <Text className={`text-center font-rubik ${showPresent ? 'text-blue-500' : 'text-gray-500'}`}>
              Present ({presentStudents.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowPresent(false)}
            className={`flex-1 py-2 rounded-md ${!showPresent ? 'bg-white' : ''}`}
          >
            <Text className={`text-center font-rubik ${!showPresent ? 'text-red-500' : 'text-gray-500'}`}>
              Absent ({absentStudents.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Download Consolidated Report Button */}
        <TouchableOpacity 
          onPress={generateConsolidatedExcel}
          className="bg-green-500 py-3 px-4 rounded-lg mb-4"
        >
          <Text className="text-white font-rubik text-center">Download Consolidated Report</Text>
        </TouchableOpacity>

        {/* Comment out Date Range Report Section 
        <View className="mb-4">
          <Text className="font-rubik-medium mb-2">Date Range Report</Text>
          <View className="flex-row justify-between mb-2">
            // ... date range picker buttons ...
          </View>
          
          <TouchableOpacity className="bg-green-500 py-3 px-4 rounded-lg">
            <Text className="text-white font-rubik text-center">
              Download Date Range Report
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateRange.selecting === 'start' ? dateRange.startDate : dateRange.endDate}
              mode="date"
              onChange={handleDateChange}
            />
          )}
        </View>
        */}

        {/* Student Lists */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {showPresent ? (
            appwriteAttendance.loading ? (
              <ActivityIndicator size="large" color="#0061ff" className="my-4" />
            ) : appwriteAttendance.error ? (
              <View className="p-4">
                <Text className="text-red-500 text-center">{appwriteAttendance.error}</Text>
                <TouchableOpacity 
                  onPress={fetchAppwriteAttendance}
                  className="mt-4 bg-blue-500 py-2 px-4 rounded-lg"
                >
                  <Text className="text-white text-center">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : presentStudents.length > 0 ? (
              presentStudents.map((student) => (
                <View key={student.id} 
                  className="bg-white border border-gray-100 p-3 rounded-lg mb-2 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="font-rubik text-gray-800">{student.rollNo}</Text>
                    <Text className="text-gray-500 text-sm">{student.name}</Text>
                  </View>
                  <Text className="text-sm text-gray-400">
                    {renderAttendanceTime(student.time || '')}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-center text-gray-500 p-4">No students present yet</Text>
            )
          ) : (
            absentStudents.map((student) => (
              <TouchableOpacity
                key={student.id}
                onLongPress={() => {
                  Alert.alert(
                    'Mark Present',
                    `Mark ${student.name} as present?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Mark Present', 
                        onPress: () => toggleAttendance(student.id, 'absent')
                      }
                    ]
                  );
                }}
                className="bg-white border border-gray-100 p-3 rounded-lg mb-2 flex-row justify-between items-center"
              >
                <View>
                  <Text className="font-rubik text-gray-800">{student.rollNo}</Text>
                  <Text className="text-gray-500 text-sm">{student.name}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AttendanceDetails;
