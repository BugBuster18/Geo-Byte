import { View, Text, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import images from '@/constants/images';

const StudentProfile = () => {
  const { user, logout } = useGlobalContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName='h-full'>
        <Image source={images.iiitlogo} className="w-2/6 h-1/6 flex flex-row justify-content-flexstart pb-16 pr-10" resizeMode="contain"/>
        <View className="px-10">
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">Profile</Text>
          
          <View className="mt-8 px-6">
            <Text className="text-lg font-rubik">Name: {user?.name || 'N/A'}</Text>
            <Text className="text-lg font-rubik">Email: {user?.email || 'N/A'}</Text>

            <TouchableOpacity 
              onPress={handleLogout}
              className="bg-red-500 rounded-full py-3 px-6 mt-8"
            >
              <Text className="text-white text-center font-rubik-medium">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StudentProfile;