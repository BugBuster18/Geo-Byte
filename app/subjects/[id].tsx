import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import icons from '@/constants/icons';
import Svg, { Circle } from 'react-native-svg';
import { subjectsData } from '@/constants/subjectsData';
import images from '@/constants/images';

const SubjectDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [localHoursAttended, setLocalHoursAttended] = useState(0);

  const subjectDetails = subjectsData.find(subject => subject.id === id);
  
  useEffect(() => {
    if (subjectDetails) {
      setLocalHoursAttended(subjectDetails.hoursAttended);
    }
  }, [subjectDetails]);

  const adjustHours = (amount: number) => {
    if (!subjectDetails) return;
    const newHours = Math.min(
      Math.max(localHoursAttended + amount, 0),
      subjectDetails.totalHours
    );
    setLocalHoursAttended(newHours);
  };

  // Update attendance calculation to handle zero case
  const calculateAttendance = (attended: number, total: number) => {
    if (total === 0 || attended === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  // Add error handling
  if (!subjectDetails) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View className="flex-1 px-4">
          <View className="flex-row items-center mt-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Image source={icons.backArrow} className="w-6 h-6 mr-3" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-2xl">
              Subject Not Found
            </Text>
          </View>
          
          <View className="flex-1 items-center justify-center">
            <Image 
              source={images.noResult} 
              style={{
                width: 200,
                height: 200,
                marginBottom: 20
              }}
              resizeMode="contain"
            />
            <Text style={{ 
              fontFamily: 'Rubik-Regular',
              textAlign: 'center',
              color: '#666',
              marginTop: 16
            }} className="text-base">
              The requested subject could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const radius = 70;
  const circleCircumference = 2 * Math.PI * radius;
  const attendance = calculateAttendance(localHoursAttended, subjectDetails.totalHours);
  const dashOffset = circleCircumference * (1 - attendance / 100);
  
  // Determine color based on attendance
  const getAttendanceColor = (percentage: number) => {
    if (percentage < 85) {
      return '#FF4444'; // Red for low attendance
    }
    return '#4CAF50'; // Green for good attendance
  };

  // Calculate rotation to start from bottom
  const rotation = -90;
  const attendanceColor = getAttendanceColor(attendance);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView className="px-4">
        {/* Header with back button and subject code */}
        <View className="flex-row items-center mt-4 mb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={icons.backArrow} className="w-6 h-6 mr-3" />
          </TouchableOpacity>
        </View>

        {/* Subject Title */}
        <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-3xl mb-6">
          {subjectDetails.code} {"\n"}
          {subjectDetails.name}
        </Text>

        {/* Attendance Circle */}
        <View className="items-center justify-center mb-8">
          <Svg width={radius * 2 + 20} height={radius * 2 + 20} style={{ transform: [{ rotate: `${rotation}deg` }] }}>
            {/* Background Circle */}
            <Circle
              cx={radius + 10}
              cy={radius + 10}
              r={radius}
              stroke="#E6E6E6"
              strokeWidth="10"
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx={radius + 10}
              cy={radius + 10}
              r={radius}
              stroke={attendanceColor}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circleCircumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(180 ${radius + 10} ${radius + 10})`}
            />
          </Svg>
          <View style={{ position: 'absolute', transform: [{ rotate: '0deg' }] }}>
            <Text style={{ 
              fontFamily: 'Rubik-Bold', 
              fontSize: 32, 
              textAlign: 'center',
              color: attendance < 85 ? '#FF4444' : '#000' 
            }}>
              {attendance}%
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 16, textAlign: 'center' }}>
              Attendance
            </Text>
          </View>
        </View>

        {/* Commenting out Attendance Controls temporarily
        <View className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-center mb-3 text-gray-600">
            Adjust Attendance Hours
          </Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row space-x-2">
              <TouchableOpacity 
                onPress={() => adjustHours(-1.5)}
                className="bg-red-100 w-16 py-3 rounded-lg border border-red-200"
              >
                <Text className="text-red-600 font-semibold text-center">-1.5h</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => adjustHours(-1)}
                className="bg-red-50 w-16 py-3 rounded-lg border border-red-100"
              >
                <Text className="text-red-500 font-semibold text-center">-1h</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-2">
              <TouchableOpacity 
                onPress={() => adjustHours(1)}
                className="bg-green-50 w-16 py-3 rounded-lg border border-green-100"
              >
                <Text className="text-green-500 font-semibold text-center">+1h</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => adjustHours(1.5)}
                className="bg-green-100 w-16 py-3 rounded-lg border border-green-200"
              >
                <Text className="text-green-600 font-semibold text-center">+1.5h</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        */}

        {/* Attendance Details */}
        <View className=" p-4 rounded-xl mb-6">
          <View className="flex-row justify-between items-center">
            <View className="items-center">
              <Text style={{ fontFamily: 'Rubik-Bold', fontSize: 24 }}>
                {localHoursAttended}
              </Text>
              <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 14, color: '#666' }}>
                Hours Attended
              </Text>
            </View>
            <View className="items-center">
              <Text style={{ fontFamily: 'Rubik-Bold', fontSize: 24 }}>
                {subjectDetails.totalHours}
              </Text>
              <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 14, color: '#666' }}>
                Total Hours
              </Text>
            </View>
            <View className="items-center">
              <Text style={{ fontFamily: 'Rubik-Bold', fontSize: 24 }}>
                {subjectDetails.credits}
              </Text>
              <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 14, color: '#666' }}>
                Credits
              </Text>
            </View>
          </View>
          {/* Attendance Status Message */}
          {attendance < 85 && (
            <View className="mt-4 p-3 bg-[#FFE5E5] rounded-lg">
              <View className="flex-row justify-center items-center">

                <Text style={{ fontFamily: 'Rubik-Regular', color: '#FF4444', textAlign: 'center' }}>
                  Warning:Attend <Text style={{ fontFamily: 'Rubik-Bold' }}>
                    {Math.ceil(((85*subjectDetails.totalHours) - (100*localHoursAttended))/100)}
                  </Text> more hours to meet minimum requirement
                </Text>
              </View>
            </View>
          )}
          {attendance >= 85 && (
            <View className="mt-4 p-3 bg-[#E7FFE9] rounded-lg">
              <View className="flex-row justify-center items-center">
                <Image 
                  source={icons.info}
                  style={{ width: 20, height: 20, marginRight: 8, tintColor: '#4CAF50' }}
                />
                <Text style={{ fontFamily: 'Rubik-Regular', color: '#4CAF50', textAlign: 'center' }}>
                  Great attendance! You can skip <Text style={{ fontFamily: 'Rubik-Bold' }}>
                    {Math.floor((-(85*subjectDetails.totalHours) + (100*localHoursAttended))/100)}
                  </Text> hours
                </Text>
              </View>
              <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 }}>
                While maintaining minimum 85% attendance
              </Text>
            </View>
          )}
        </View>

        {/* Details Cards */}
        <View className="bg-[#dce6fa] p-6 rounded-xl mb-4">
          <View className="mb-4 pb-4 border-b border-[#c0cef0]">
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Instructor
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-base">
              {subjectDetails.instructor}
            </Text>
          </View>

          <View className="mb-4 pb-4 border-b border-[#c0cef0]">
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Schedule
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-base">
              {subjectDetails.schedule}
            </Text>
          </View>

          <View>
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Course Description
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-base">
              {subjectDetails.description}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubjectDetails;
