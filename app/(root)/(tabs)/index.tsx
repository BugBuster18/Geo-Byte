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
import { appwriteConfig, client } from '@/lib/appwrite';

const CLASSROOM_WIFI_CONFIG = {
  CS301: {
    ssid: "CS301_CLASSROOM",
    bssid: "d4:20:b0:9a:93:71", // Your classroom router's BSSID
    name: "Software Engineering",
    code: "CS301" // Added course code
  }
} as const;

type ClassroomKeys = keyof typeof CLASSROOM_WIFI_CONFIG;
const currentClass: ClassroomKeys = 'CS301';

const CLASSROOM_COORDINATES = [
  // [ 75.024145,15.393461],
  // [75.024585,15.393709],
  // [75.024331,15.394174 ],
  // [75.023805,15.393964],
  // [ 75.024145,15.393461],



// ! classroom

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

  const getWifiStatusText = () => {
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
      // First check if WiFi is enabled and connected
      const netInfo = await NetInfo.fetch('wifi');
      console.log('Detailed NetInfo:', netInfo);

      if (!netInfo.isConnected) {
        throw new Error("Please connect to WiFi");
      }

      // On Android, we need to specifically check for WiFi details
      if (Platform.OS === 'android') {
        const wifiInfo = {
            ssid: (netInfo.details as any)?.ssid || null,
            bssid: (netInfo.details as any)?.bssid || null
          };
        console.log('WiFi Info:', wifiInfo);

        // Debug check for BSSID
        if (!wifiInfo.bssid) {
          console.warn('BSSID not available. Check location permissions.');
          // For testing, you might want to bypass this check
          // return true;
          throw new Error("Unable to verify classroom WiFi. Please ensure location permissions are enabled.");
        }

        setCurrentWifi(wifiInfo);

        // Check if connected to correct classroom WiFi
        const expectedConfig = CLASSROOM_WIFI_CONFIG[currentClass];
        if (!expectedConfig) {
          throw new Error("Class configuration not found");
        }

        if (wifiInfo.bssid !== expectedConfig.bssid) {
          console.log('BSSID Mismatch:', {
            current: wifiInfo.bssid,
            expected: expectedConfig.bssid
          });
          throw new Error(`Please connect to ${expectedConfig.name} WiFi`);
        }
      } else {
        // For iOS, we might need a different approach since BSSID access is limited
        // You might want to use location verification instead
        console.warn('iOS WiFi verification fallback to location check');
        return await verifyLocation();
      }

      setWifiStatus('connected');
      return true;
    } catch (error: any) {
      console.error('WiFi check error:', error);
      setWifiStatus('not_connected');
      Alert.alert("WiFi Error", error.message);
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

  const handleAuthentication = async (type: 'face' | 'fingerprint') => {
    setModalVisible(false);
    try {
      // First verify WiFi connection
      const isWifiValid = await checkWifiConnection();
      if (!isWifiValid) {
        return;
      }

      // Log WiFi details for verification
      console.log('Current WiFi:', currentWifi);
      console.log('Expected BSSID:', CLASSROOM_WIFI_CONFIG[currentClass].bssid);

      // Rest of authentication code...
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Error', 'This device doesn\'t support biometric authentication');
        return;
      }
  
      const biometricMethods = await getBiometricType();
      
      if (type === 'face' && !biometricMethods.face) {
        Alert.alert('Error', 'Face authentication is not available on this device');
        return;
      }
  
      if (type === 'fingerprint' && !biometricMethods.fingerprint) {
        Alert.alert('Error', 'Fingerprint authentication is not available on this device');
        return;
      }
  
      const androidMessage = type === 'face' ? 
        'Scan your face to mark attendance' : 
        'Scan your fingerprint to mark attendance';
  
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: Platform.OS === 'android' ? androidMessage : 
          `Authenticate using ${type === 'face' ? 'Face ID' : 'Touch ID'}`,
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        requireConfirmation: false,
        ...(Platform.OS === 'android' && {
          authenticationType: type === 'face' ? 
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION : 
            LocalAuthentication.AuthenticationType.FINGERPRINT
        })
      });
  
      if (result.success) {
        if (classStarted) {
          // Mark attendance in Appwrite
          const attendanceMarked = await markAttendanceInAppwrite();
          if (attendanceMarked) {
            Alert.alert("Success", "Attendance marked!", [
              { text: 'OK', onPress: handleVerificationSuccess }
            ]);
          } else {
            Alert.alert("Error", "Failed to record attendance");
          }
        } else {
          Alert.alert("Success", "Class started!", [
            { text: 'OK', onPress: handleVerificationSuccess }
          ]);
        }
      } else {
        Alert.alert(
          'Authentication Failed',
          'Please try again or use an alternative method'
        );
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
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
      // Check WiFi first
      const wifiConnected = await checkWifiConnection();
      if (wifiConnected) return true;

      // If WiFi check fails, check location
      const loc = await Location.getCurrentPositionAsync({});
      const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
      // Fix: Correct order of coordinates for turf.point (longitude, latitude)
      const userLocation = turf.point([loc.coords.longitude, loc.coords.latitude]);
      
      return turf.booleanPointInPolygon(userLocation, classroomPolygon);
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  const handleAttendanceButton = async () => {
    if (!classStarted) {
      // Initial verification to start class
      const isEligible = await isStudentEligible();
      if (isEligible) {
        setLocationStatus('inside');
        setModalVisible(true);
      } else {
        Alert.alert('Error', 'You must be either connected to classroom WiFi or inside the classroom');
        setLocationStatus('outside');
      }
    } else {
      // For marking attendance
      const isEligible = await isStudentEligible();
      if (isEligible) {
        setModalVisible(true);
      } else {
        Alert.alert('Error', 'You must be either connected to classroom WiFi or inside the classroom');
      }
    }
  };

  const handleVerificationSuccess = () => {
    if (!classStarted) {
      // Start class after initial verification
      setClassStarted(true);
      setHasInitialVerification(true);
      setTimer(0);
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
        getUserLocation();
      }, 1000);
      setTimerInterval(interval);
    } else {
      // Mark attendance
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
    // let intervalId: NodeJS.Timeout;
    // let timeoutId: NodeJS.Timeout;

    // const startLocationChecks = () => {
    //   intervalId = setInterval(() => {
    //     getUserLocation();
    //     console.log("checking")
    //   }, 30000); // Check every 30 seconds

    //   // Stop checking after 5 minutes
    //   timeoutId = setTimeout(() => {
    //     clearInterval(intervalId);
    //     setIsFiveMinuteComplete(false);
    //   }, 5 * 60 * 1000); // 5 minutes in milliseconds
    // };

    // if (isFiveMinuteComplete) {
    //   startLocationChecks();
    // }

    // // Cleanup function
    // return () => {
    //   clearInterval(intervalId);
    //   clearTimeout(timeoutId);
    // };

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
    console.log(lat, lng);
    const classroomPolygon = turf.polygon([CLASSROOM_COORDINATES]);
    const userLocation = turf.point([lng, lat]);
    
    // Check WiFi status
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

  const markAttendanceInAppwrite = async () => {
    try {
      const databases = new Databases(client);
      const ATTENDANCE_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID!;
      
      // Get current class details
      const currentClassDetails = CLASSROOM_WIFI_CONFIG[currentClass];
      
      const attendanceRecord = await databases.createDocument(
        appwriteConfig.databaseId,
        ATTENDANCE_COLLECTION_ID,
        ID.unique(),
        {
          "Name": user?.name || "ganesh",
          "Email": user?.email || "as@gmail.com",
          "Created_At": new Date().toISOString(),
          "isPresent": true,
          "Course_Code": currentClassDetails.code // Add course code from current class
        }
      );

      console.log('Attendance record created:', attendanceRecord);
      
      if (!attendanceRecord.$id) {
        throw new Error('Failed to create complete attendance record');
      }

      return true;
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      Alert.alert('Error', 'Failed to record attendance. Please try again.');
      return false;
    }
  };

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
      <View className="flex flex-row items-center justify-between ">
       <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-2xl mt-5 ml-5 ">Current Class</Text>
      </View>
      <View className="flex flex-row items-center justify-between ml-10 mt-2 shadow-md shadow-zinc-300 rounded-lg" style={{ width: 310, height: 80, borderRadius: 14 }}>
        <View className="bg-white rounded-lg p-3" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Rubik-medium' }} className="text-l">· CS301   Software Engineering</Text>
              <Animated.Image source={icons.live} style={{ width: 25, height: 28, marginLeft: 10, opacity: fadeAnim }} />
            </View>
            {(classStarted || finalTime) && (
              <Text className="text-sm font-rubik text-gray-600">
                {classStarted ? (
                  `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
                ) : (
                  `${Math.floor(finalTime! / 60)}:${(finalTime! % 60).toString().padStart(2, '0')}`
                )}
              </Text>
            )}
          </View>
          <View style={{ marginTop: 10 }}>
            <Text style={{ 
              fontFamily: 'Rubik-light',
              color: locationStatus === 'inside' ? 'green' : locationStatus === 'outside' ? 'red' : 'black'
            }}>
              {getLocationStatusText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Combined Attendance Button */}
      <TouchableOpacity 
        onPress={handleAttendanceButton}
        className={`bg-blue-500 py-3 rounded-lg mx-10 mt-4 mb-4`} // Added mb-4 for spacing
      >
        <Text className="text-white text-center font-rubik-medium text-base">
          {!classStarted 
            ? "Verify Your Presence" 
            : "Mark Attendance"}
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
              Attendance Verification
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
              onPress={() => wifiStatus === 'connected' && handleAuthentication('face')}
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
              onPress={() => wifiStatus === 'connected' && handleAuthentication('fingerprint')}
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