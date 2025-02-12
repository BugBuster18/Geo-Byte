import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { Redirect, router } from 'expo-router';
import images from '@/constants/images';
import { useGlobalContext } from '@/lib/global-provider';
const UserType = 'student';

const LoginSelection = () => {
  const { refetch, loading, isLogged} = useGlobalContext();
  
    if (!loading && isLogged) return <Redirect href="/" />;
  return (
    
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName="h-full">
        <Image 
          source={images.iiitlogo} 
          className="w-2/6 h-1/6 flex flex-row justify-content-flexstart pb-16 pr-10" 
          resizeMode="contain"
        />
        <View className="px-10">
          <Text className="text-base text-center uppercase font-rubik text-black-200">
            Welcome to GeoAttend
          </Text>
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">
            Choose Your Role
          </Text>
          
          {/* Student Login */}
          <TouchableOpacity 
            onPress={() => router.push('/sign-in')} 
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5">
            <View className="flex flex-row items-center justify-center">
              <Text className="text-lg font-rubik-medium text-black-300">Login as Student</Text>
            </View>
          </TouchableOpacity>

          {/* Faculty Login */}
          <TouchableOpacity 
            onPress={() => router.push('/sign-in')} 
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5">
            <View className="flex flex-row items-center justify-center">
              <Text className="text-lg font-rubik-medium text-black-300">Login as Faculty</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginSelection;
