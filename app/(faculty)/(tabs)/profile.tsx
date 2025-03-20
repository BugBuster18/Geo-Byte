import { View, Text, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';

const FacultyProfile = () => {
  const { user, logout } = useGlobalContext();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1 ">
      <View className="px-4 py-4 ">
        <Text className="text-2xl font-rubik-bold">Faculty Profile</Text>
        
        <View className="mt-4 ">
          <Text className="text-lg font-rubik">Name: {user?.name || 'N/A'}</Text>
          <Text className="text-lg font-rubik">Email: {user?.email || 'N/A'}</Text>
          <Text className="text-lg font-rubik">Department: Computer Science</Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-full py-3 px-6 mt-8"
        >
          <Text className="text-white text-center font-rubik-medium">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FacultyProfile;
