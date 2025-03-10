import React from 'react';
import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import icons from '@/constants/icons';
import { subjectsData } from '@/constants/subjectsData';

interface Course {
  courseId: string;
  className: string;
  facultyId: string;
  isClassOn: boolean;
  startedAt: string;
  endedAt: string;
}

const SubjectsList = () => {
  const router = useRouter();
  
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(root)/(tabs)');
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView className="px-4">
          <View className="flex-row items-center mt-4 mb-6">
            <TouchableOpacity onPress={handleBack}>
              <Image source={icons.backArrow} className="w-6 h-6 mr-3" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-2xl">
              All Subjects
            </Text>
          </View>

          {subjectsData.map((course: Course) => (
            <TouchableOpacity 
              key={course.courseId}
              onPress={() => {
                router.push({
                  pathname: '/subjects/[id]',
                  params: { id: course.courseId }
                });
              }}
              className="bg-[#dce6fa] p-4 rounded-xl mb-4 flex-row justify-between items-center"
            >
              <View>
                <Text style={{ fontFamily: 'Rubik-Bold' }} className="text-lg">
                  {course.courseId} - {course.className}
                </Text>
                <Text style={{ fontFamily: 'Rubik-Regular', color: '#666' }} className="mt-1">
                  {course.facultyId}
                </Text>
                {course.isClassOn && (
                  <Text style={{ fontFamily: 'Rubik-Medium', color: '#4CAF50' }} className="mt-1">
                    Ongoing Class • {course.startedAt}
                  </Text>
                )}
              </View>
              <Image 
                source={icons.rightArrow} 
                style={{ width: 20, height: 20, tintColor: '#666' }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default SubjectsList;
