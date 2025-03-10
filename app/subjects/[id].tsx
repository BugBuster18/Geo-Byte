import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import icons from '@/constants/icons';
import Svg, { Circle } from 'react-native-svg';
import { subjectsData } from '@/constants/subjectsData';
import images from '@/constants/images';

interface Course {
  courseId: string;
  className: string;
  facultyId: string;
  isClassOn: boolean;
  startedAt: string;
  endedAt: string;
}

const SubjectDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const courseDetails = subjectsData.find(course => course.courseId === id) as Course;

  // Error handling for missing course
  if (!courseDetails) {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView className="px-4">
        {/* Header Section */}
        <View className="flex-row items-center mt-4 mb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={icons.backArrow} className="w-6 h-6 mr-3" />
          </TouchableOpacity>
        </View>

        {/* Course Title */}
        <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-3xl mb-6">
          {courseDetails.courseId} {"\n"}
          {courseDetails.className}
        </Text>

        {/* Class Status */}
        <View className="bg-[#dce6fa] p-6 rounded-xl mb-4">
          <View className="mb-4 pb-4 border-b border-[#c0cef0]">
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Instructor
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-base">
              {courseDetails.facultyId}
            </Text>
          </View>

          <View className="mb-4 pb-4 border-b border-[#c0cef0]">
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Schedule
            </Text>
            <Text style={{ fontFamily: 'Rubik-Regular' }} className="text-base">
              {courseDetails.startedAt} - {courseDetails.endedAt}
            </Text>
          </View>

          <View className="mb-4 pb-4 border-b border-[#c0cef0]">
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg mb-1">
              Status
            </Text>
            <Text style={{ 
              fontFamily: 'Rubik-Regular',
              color: courseDetails.isClassOn ? '#4CAF50' : '#666'
            }} className="text-base">
              {courseDetails.isClassOn ? 'Class is ongoing' : 'No class in session'}
            </Text>
          </View>
        </View>

        {/* ...rest of existing UI code... */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubjectDetails;
