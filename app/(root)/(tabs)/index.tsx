import React, { useEffect, useRef, useState } from "react";
import { View, Text, Button, Alert ,Image, ScrollView, SafeAreaView, TouchableOpacity, Animated, Modal, Platform } from "react-native";
import * as Location from "expo-location";
import * as turf from "@turf/turf";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import CustomTouchable from "@/components/CustomTouchable";
import Subjects from "@/components/Subjects";
import * as Font from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as Network from 'expo-network';
import NetInfo from '@react-native-community/netinfo';
import { ID, Databases } from 'react-native-appwrite';
import { appwriteConfig, client, getCourses, DATABASE_ID } from '@/lib/appwrite';
import { User, Course } from "@/lib/types";

const CLASSROOM_WIFI_CONFIG = {
  CS301: {
    ssid: "CS301_CLASSROOM",
    bssid: ["d4:20:b0:99:ad:81", "d4:20:b0:99:ad:91"], // Array of BSSIDs
    name: "Software Engineering",
    code: "CS301"
  }
} as const;

type ClassroomKeys = keyof typeof CLASSROOM_WIFI_CONFIG;
const currentClass: ClassroomKeys = 'CS301';

const CLASSROOM_COORDINATES = [
  [75.0251, 15.3928], // Corner 1 (lng, lat)
  [75.0251, 15.3927], // Corner 3
  [75.0252, 15.3927], // Corner 2
  [75.0251, 15.3928], // Corner 4
  [75.0251, 15.3928], // Corner 1 (lng, lat)
];

const App = () => {
  const {user} = useGlobalContext();
  const name = user?.name;
  const capitalizeFirstLetter = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };
  const capitalizedFirstName = name ? capitalizeFirstLetter(name) : "";
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isinside, setIsinside] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [arrowDirection, setArrowDirection] = useState<boolean[]>([false, false, false, false]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFiveMinuteComplete, setIsFiveMinuteComplete] = useState(true);
  const [wifiStatus, setWifiStatus] = useState<'not_checked' | 'checking' | 'connected' | 'not_connected'>('not_checked');
  const [currentWifi, setCurrentWifi] = useState<{ ssid: string | null; bssid: string | null }>({ ssid: null, bssid: null });
  const [classStarted, setClassStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [maxTime] = useState(300); // 5 minutes = 300 seconds
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'not_checked' | 'inside' | 'outside'>('not_checked');
  const [hasInitialVerification, setHasInitialVerification] = useState(false);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [refreshingCurrentClass, setRefreshingCurrentClass] = useState(false);
  const [hasVerifiedPresence, setHasVerifiedPresence] = useState(false);

  const getWifiStatusText = () => {
    if (Platform.OS === 'ios') {
      return locationStatus === 'inside' 
        ? 'Location verified'
        : 'Please ensure you are inside the classroom';
    }
    switch (wifiStatus) {
      case 'checking':
        return 'Checking WiFi connection...';
      case 'connected':
        return 'Connected to WiFi';
      case 'not_connected':
        return 'Please connect to classroom WiFi';
      default:
        return 'WiFi status not checked';
    }
  };

  const router = useRouter();

  const toggleArrow = (index: number) => {
    setArrowDirection(prevState => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      return newState;
    });
  };

  const GiveAttendance = async () => {
    getUserLocation();
   //
   // 
   // 
    //if(isinside)
    setModalVisible(true);
  };

  const getBiometricType = async () => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricMethods = {
      face: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      fingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    };
    return biometricMethods;
  };

  const checkWifiConnection = async () => {
    try {
      // iOS: Use location-based verification
      if (Platform.OS === 'ios') {
        const isInside = await verifyLocation();
        if (isInside) {
          setWifiStatus('connected');
          return true;
        }
        throw new Error("Please ensure you are inside the classroom");
      }

      // Get active course and check if class is in session
      if (activeCourses.length === 0) {
        throw new Error("No active class found");
      }

      const netInfo = await NetInfo.fetch('wifi');
      if (!netInfo.isConnected) {
        throw new Error("Please connect to WiFi");
      }

      const wifiInfo = {
        ssid: (netInfo.details as any)?.ssid || null,
        bssid: (netInfo.details as any)?.bssid || null
      };
      console.log('WiFi Info:', wifiInfo);

      if (!wifiInfo.bssid) {
        console.warn('BSSID not available. Check location permissions.');
        throw new Error("Unable to verify classroom WiFi. Please ensure location permissions are enabled.");
      }

      setCurrentWifi(wifiInfo);
      const expectedConfig = CLASSROOM_WIFI_CONFIG[currentClass];
      if (!expectedConfig) {
        throw new Error("Class configuration not found");
      }

      // Check if current BSSID matches any of the allowed BSSIDs
      const isValidBSSID = expectedConfig.bssid.includes(wifiInfo.bssid);
      if (!isValidBSSID) {
        console.log('BSSID Mismatch:', {
          current: wifiInfo.bssid,
          expected: expectedConfig.bssid
        });
        throw new Error(`Please connect to ${expectedConfig.name} WiFi`);
      }

      setWifiStatus('connected');
      return true;
    } catch (error: any) {
      console.error('Verification error:', error);
      setWifiStatus('not_connected');
      Alert.alert("Verification Error", error.message);
      return false;
    }
  };

  const verifyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
      const userLocation = turf.point([loc.coords.longitude, loc.coords.latitude]);
      return turf.booleanPointInPolygon(userLocation, classroomPolygon);
    } catch (error) {
      console.error('Location verification error:', error);
      return false;
    }
  };

  const handleAuthentication = async (type: 'face' | 'fingerprint', isVerification = false) => {
    try {
      const isWifiValid = await checkWifiConnection();
      if (!isWifiValid) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: isVerification 
          ? `Verify your presence using ${type}` 
          : `Mark attendance using ${type}`,
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        if (isVerification) {
          // For verification, just close modal and set status
          setModalVisible(false);
          setHasVerifiedPresence(true);
          Alert.alert('Success', 'Your presence has been verified. Click "Mark Attendance" when ready.');
          return true;
        } else {
          // For attendance marking
          try {
            const attendanceMarked = await markAttendanceInAppwrite({
              user,
              activeClass: currentActiveClass!
            });
            
            if (attendanceMarked) {
              setModalVisible(false);
              setHasVerifiedPresence(false); // Reset verification
              Alert.alert('Success', 'Attendance marked successfully!');
              return true;
            }
          } catch (error) {
            console.error('Attendance marking error:', error);
            Alert.alert('Error', 'Failed to mark attendance');
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Authentication failed');
      return false;
    }
  };

  const verifyWifiAndProceed = async () => {
    setWifiStatus('checking');
    try {
      const networkState = await Network.getNetworkStateAsync();
      console.log('Network state:', networkState);
      
      if (!networkState.isConnected) {
        throw new Error('Please connect to WiFi');
      }

      if (networkState.type !== Network.NetworkStateType.WIFI) {
        throw new Error('Please use WiFi instead of mobile data');
      }

      // Get WiFi info
      const netInfo = await NetInfo.fetch();
      console.log('NetInfo:', netInfo);

      setWifiStatus('connected');
      return true;
    } catch (error) {
      console.error('WiFi verification failed:', error);
      setWifiStatus('not_connected');
      Alert.alert('WiFi Error', error instanceof Error ? error.message : 'Failed to verify WiFi connection');
      return false;
    }
  };

  // Add this function to handle WiFi verification button press
  const handleWifiVerification = async () => {
    const isValid = await verifyWifiAndProceed();
    if (isValid) {
      setWifiStatus('connected');
    }
  };

  const startClass = async () => {
    try {
      // First check location
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      
      // Check if inside classroom
      const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
      const userLocation = turf.point([longitude, latitude]);
      
      if (!turf.booleanPointInPolygon(userLocation, classroomPolygon)) {
        Alert.alert('Error', 'You must be inside the classroom to start');
        setLocationStatus('outside');
        return;
      }

      // If inside, start the class and timer
      setLocationStatus('inside');
      setClassStarted(true);
      setTimer(0);
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
        getUserLocation(); // Keep checking location
      }, 1000);
      setTimerInterval(interval);
    } catch (error) {
      Alert.alert('Error', 'Failed to verify location');
    }
  };

  const handleGiveAttendance = async () => {
    if (!classStarted) {
      Alert.alert('Error', 'Please wait for class to start');
      return;
    }
    
    if (locationStatus === 'outside') {
      Alert.alert('Error', 'You must be inside the classroom to mark attendance');
      return;
    }

    // Save final time and stop timer only when marking attendance
    setFinalTime(timer);
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setClassStarted(false);
    GiveAttendance();
  };

  const isStudentEligible = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Only check location
        const loc = await Location.getCurrentPositionAsync({});
        const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
        const userLocation = turf.point([loc.coords.longitude, loc.coords.latitude]);
        return turf.booleanPointInPolygon(userLocation, classroomPolygon);
      } else {
        // Android: Keep existing WiFi + location check
        const wifiConnected = await checkWifiConnection();
        if (wifiConnected) return true;

        const loc = await Location.getCurrentPositionAsync({});
        const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
        const userLocation = turf.point([loc.coords.longitude, loc.coords.latitude]);
        return turf.booleanPointInPolygon(userLocation, classroomPolygon);
      }
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  const handlePresenceVerification = async () => {
    try {
      const isEligible = await isStudentEligible();
      if (!isEligible) {
        throw new Error('You must be in class to verify presence');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your presence using biometrics',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        setHasVerifiedPresence(true);
        Alert.alert('Success', 'Your presence has been verified. You can now mark attendance.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify presence. Please try again.');
    }
  };

  const handleAttendanceButton = async () => {
    if (!currentActiveClass) {
      Alert.alert('No Active Class', 'There is no ongoing class at the moment.');
      return;
    }

    const isEligible = await isStudentEligible();
    if (!isEligible) {
      const message = Platform.OS === 'ios' 
        ? 'You must be inside the classroom'
        : 'You must be either connected to classroom WiFi or inside the classroom';
      Alert.alert('Error', message);
      setLocationStatus('outside');
      return;
    }

    setLocationStatus('inside');

    if (!hasVerifiedPresence) {
      // Direct biometric verification without modal
      await handlePresenceVerification();
    } else {
      // Show modal only for attendance marking
      setModalVisible(true);
    }
  };

  const getAttendanceButtonText = () => {
    if (!currentActiveClass) return "No Active Class";
    if (!hasVerifiedPresence) return "Verify Presence";
    return "Mark Attendance";
  };

  const handleVerificationSuccess = () => {
    if (!classStarted) {
      setClassStarted(true);
      setHasInitialVerification(true);
      setTimer(0);
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
        if (Platform.OS !== 'ios') {
          // Only check location continuously on Android
          getUserLocation();
        }
      }, 1000);
      setTimerInterval(interval);
    } else {
      setFinalTime(timer);
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      setClassStarted(false);
      setHasInitialVerification(false);
    }
    setModalVisible(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        'Rubik-Bold': require('@/assets/fonts/Rubik-Bold.ttf'),
        'Rubik-Regular': require('@/assets/fonts/Rubik-Regular.ttf'),
      });
      setFontsLoaded(true);
    };

    loadFonts();

    const requestPermissions = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for attendance.");
      }
    };
    requestPermissions();
  }, []);

  
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  const getUserLocation = async () => {
    setIsLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });
      checkGeofence(latitude, longitude);
    } catch (error) {
      Alert.alert("Error", "Failed to get location.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkGeofence = async (lat: number, lng: number) => {
    const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
    const userLocation = turf.point([lng, lat]);
    
    if (Platform.OS === 'ios') {
      // iOS: Only update status without triggering alerts
      const isInside = turf.booleanPointInPolygon(userLocation, classroomPolygon);
      setLocationStatus(isInside ? 'inside' : 'outside');
      setIsinside(isInside);
      return;
    }
    
    // Android: Keep existing WiFi + location check
    const wifiConnected = await checkWifiConnection().catch(() => false);
    if (wifiConnected || turf.booleanPointInPolygon(userLocation, classroomPolygon)) {
      setLocationStatus('inside');
      setIsinside(true);
    } else {
      setLocationStatus('outside');
      setIsinside(false);
    }
  };

  const getLocationStatusText = () => {
    if (!classStarted) return 'Class not started';
    switch (locationStatus) {
      case 'inside':
        return 'You are inside the classroom';
      case 'outside':
        return 'You are outside the classroom';
      default:
        return 'Checking location...';
    }
  };

  const markAttendanceInAppwrite = async ({ 
    user, 
    activeClass 
  }: { 
    user: User | null; 
    activeClass: Course 
  }) => {
    try {
      if (!activeClass || !user) {
        throw new Error('Missing required data');
      }
  
      console.log('Attempting to mark attendance with:', {
        user,
        activeClass,
      });
  
      const databases = new Databases(client);
      const ATTENDANCE_COLLECTION_ID = '67c89861000dfa747718';
  
      const attendanceData = {
        Name: user.name || "",
        Email: user.email || "",
        isPresent: true,
        Created_At: new Date().toISOString(),
        Course_Code: activeClass.courseId
      };
  
      console.log('Creating attendance record with:', attendanceData);
  
      const attendanceRecord = await databases.createDocument(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        ID.unique(),
        attendanceData
      );
  
      console.log('Attendance record created:', attendanceRecord);
      return true;
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchActiveCourses = async () => {
      try {
        const courses = await getCourses();
        setActiveCourses(courses.filter(course => course.isClassOn));
      } catch (error) {
        console.error('Error fetching active courses:', error);
      }
    };

    fetchActiveCourses();
    const interval = setInterval(fetchActiveCourses, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshCurrentClass = async () => {
    try {
      setRefreshingCurrentClass(true);
      const courses = await getCourses();
      const active = courses.filter(course => course.isClassOn);
      setActiveCourses(active);
    } catch (error) {
      console.error('Error refreshing current class:', error);
      Alert.alert('Error', 'Failed to refresh current class');
    } finally {
      setRefreshingCurrentClass(false);
    }
  };

  // Only show the most recent active class
  const currentActiveClass = activeCourses.length > 0 ? activeCourses[0] : null;

  useEffect(() => {
    if (!currentActiveClass) {
      setHasVerifiedPresence(false);
    }
  }, [currentActiveClass]);

  if (!fontsLoaded) {
    return null; // or a loading spinner
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
    <View className="px-2">
    <View className="flex flex-row items-center justify-between mt-5">
      <View className="flex flex-row">
        {/* <Image
          source={{ uri: user?.avatar }}
          className="size-12 rounded-full"
        /> */}

        <View className="flex flex-col items-start ml-2 justify-center">
          <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-xs text-black-100">
            Good Morning
          </Text>
          <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-xl text-black-300">
            {capitalizedFirstName}
          </Text>
        </View>
      </View>
      <Image source={icons.bell} className="size-6" />
    </View>

    {/* ye line he */}
    <View className="flex flex-col mt-5">
      <View style={{ borderBottomColor: 'black', borderBottomWidth: 0.5, marginVertical: 1}} />
    </View>

    
  {/* this is the intro name */}

    <View className="flex flex-col  mt-10 ml-5">
      <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-3xl text-black-300  mt-2">
        Hi, {"\n"}
        {capitalizedFirstName}
        </Text>
        <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-2xl text-center text-black-100 mt-4">
          Welcome to Your Class
        </Text>
      </View>
      
      {/* box and cards */}
      <View className="flex flex-row items-center justify-between">
        <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-2xl mt-5 ml-5">
          Current Classes
        </Text>
        <TouchableOpacity 
          onPress={refreshCurrentClass}
          disabled={refreshingCurrentClass}
          className="mt-5 mr-5"
        >
          <Animated.Image 
            source={icons.refresh}
            className="w-6 h-6"
            style={{
              opacity: refreshingCurrentClass ? 0.5 : 1,
              transform: [{
                rotate: refreshingCurrentClass ? '180deg' : '0deg'
              }]
            }}
          />
        </TouchableOpacity>
      </View>

      {currentActiveClass ? (
        <View key={currentActiveClass.courseId} className="flex flex-row items-center justify-between ml-10 mt-2 shadow-md shadow-zinc-300 rounded-lg" style={{ width: 310, height: 80, borderRadius: 14 }}>
          <View className="bg-white rounded-lg p-3" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Rubik-medium' }} className="text-l">
                  · {currentActiveClass.courseId} {currentActiveClass.courseName}
                </Text>
                <Animated.Image source={icons.live} style={{ width: 25, height: 28, marginLeft: 10, opacity: fadeAnim }} />
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: 'Rubik-light', color: 'green' }}>
                Started at {currentActiveClass.startedAt}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex flex-row items-center justify-center ml-10 mt-2">
          <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-gray-500">
            No active class at the moment
          </Text>
        </View>
      )}
      
      {/* Combined Attendance Button */}
      <TouchableOpacity 
        onPress={handleAttendanceButton}
        disabled={false} // Remove the disabled state
        className={`bg-blue-500 py-3 rounded-lg mx-10 mt-4 mb-4`}
      >
        <Text className="text-white text-center font-rubik-medium text-base">
          {getAttendanceButtonText()}
        </Text>
      </TouchableOpacity>
      
    <View className="flex items-center justify-center">
    
      <View style={{ width: 350, height: 240 }} // Reduced height from 300 to 200
        className='bg-[#dce6fa] rounded-lg p-4 shadow-md shadow-zinc-300'
      >
        <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
          <CustomTouchable 
            index={0} 
            arrowDirection={arrowDirection[0]} 
            toggleArrow={toggleArrow} 
            title="Today's Classes"
            isDropdownOnly={true}
          >
            <Subjects name="Software Engineering" code="CS301" subjectId="CS301" />
            <Subjects name="Database Systems" code="CS302" subjectId="CS302" />
            <Subjects name="Computer Networks" code="CS303" subjectId="CS303" />
          </CustomTouchable>
          
          <CustomTouchable 
            index={1} 
            arrowDirection={arrowDirection[1]} 
            toggleArrow={toggleArrow} 
            title="Attendance Report"
          >
            <Subjects name="Software Engineering" code="CS301" subjectId="CS301" />
          </CustomTouchable>
          
          <CustomTouchable 
            index={2} 
            arrowDirection={false}
            toggleArrow={() => router.push('/allsubjects')}
            title="Subjects"
            isNavigationOnly={true}
          />
        </ScrollView>
      </View>
    </View>
    
    {/* <View className="flex flex-col items-center justify-center mt-5">
      <Text>Geofencing Attendance System</Text>
      <Button title={isLoading ? "Loading..." : "Check Location"} onPress={getUserLocation} disabled={isLoading} />
      {isinside ? <Text>Your attendance is marked</Text> : <Text>You are not inside the class</Text>}
    </View> */}
    
    {/* <View className="flex items-center justify-center mt-5">
      <Text>Give Attendance for Biology</Text>
      <Button title={isLoading ? "Loading..." : "Give Attendance"} onPress={GiveAttendance} disabled={isLoading} />
      {isinside ? <Text>Your attendance is marked</Text> : <Text>You are not inside the class</Text>}
    </View>
     */}
    </View>
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ width: '100%', padding: 20, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Rubik-Bold', fontSize: 20, textAlign: 'center' }}>
              Mark Attendance
            </Text>
          </View>
          
          <View style={{ gap: 10 }}>
            {/* WiFi Verification Button */}
            <TouchableOpacity 
              onPress={handleWifiVerification}
              style={{
                backgroundColor: '#dce6fa',
                padding: 15,
                borderRadius: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Image 
                source={icons.wifi} 
                style={{ width: 24, height: 24 }} 
                resizeMode="contain"
              />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Rubik-Medium', fontSize: 16, color: '#000' }}>
                  {wifiStatus === 'checking' ? 'Verifying...' : 'Verify WiFi Connection'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Status Text */}
            <Text style={{ 
              textAlign: 'center', 
              color: wifiStatus === 'connected' ? 'green' : 'black',
              marginBottom: 10
            }}>
              {getWifiStatusText()}
            </Text>

            {/* Biometric Options - Always show them but disable if WiFi not connected */}
            <TouchableOpacity 
              onPress={() => wifiStatus === 'connected' && handleAuthentication('face', false)}
              style={{
                backgroundColor: wifiStatus === 'connected' ? '#dce6fa' : '#f0f0f0',
                padding: 15,
                borderRadius: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: wifiStatus === 'connected' ? 1 : 0.5
              }}
            >
              <Image 
                source={icons.faceid} 
                style={{ width: 24, height: 24 }} 
                resizeMode="contain"
              />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Rubik-Medium', fontSize: 16, color: '#000' }}>
                  {Platform.OS === 'android' ? 'Use Face Authentication' : 'Use Face ID'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => wifiStatus === 'connected' && handleAuthentication('fingerprint', false)}
              style={{
                backgroundColor: wifiStatus === 'connected' ? '#dce6fa' : '#f0f0f0',
                padding: 15,
                borderRadius: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: wifiStatus === 'connected' ? 1 : 0.5
              }}
            >
              <Image 
                source={icons.fingerprint} 
                style={{ width: 24, height: 24 }} 
                resizeMode="contain"
              />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Rubik-Medium', fontSize: 16, color: '#000' }}>
                  Use Fingerprint
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding: 10, alignItems: 'center'}}>
              <Image source={icons.cancel} style={{ width: 25, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
};


export default App;