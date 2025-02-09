import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import images from '@/constants/images';
import { Image } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useRouter } from 'expo-router';

import icons from '@/constants/icons';
import { useGlobalContext } from '@/lib/global-provider';
import { login } from '@/lib/appwrite';

const SignIn = () => {
const { refetch, loading, isLogged} = useGlobalContext();

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    const result = await login();
    if (result) {
      refetch();
      <Redirect href="/" />;
    } else {
      Alert.alert("Error", "Failed to login");
    }
  };
  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName='h-full'>
        <Image source={images.iiitlogo} className="w-2/6 h-1/6 flex flex-row justify-content-flexstart pb-16 pr-10" resizeMode="contain"/>
        <View className="px-10">
          <Text className="text-base text-center uppercase font-rubik text-black-200">Welcome to GeoAttend</Text>
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">Let's Get Started</Text>
          <Text className='text-lg font-rubik text-black-200 text-center mt-12'>Login to Your Account with Google</Text>
          {/* button for login */}
          <TouchableOpacity onPress={handleLogin} className='bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5'>
            <View className='flex flex-row items-center justify-center'>
              <Image source={icons.google} className='w-5 h-5' resizeMode='contain'/>
              <Text className='text-lg font-rubik-medium text-black-300 ml-2'>Continue with Google</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
function useGloabalContext(): { refetch: any; loading: any; isLoggedIn: any; setIsLoggedIn: any; } {
  throw new Error('Function not implemented.');
}

