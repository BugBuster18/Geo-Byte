import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import images from '@/constants/images';
import { Image } from 'react-native';
import { Redirect, useRouter } from 'expo-router'; // Fix import
import { useGlobalContext } from '@/lib/global-provider';
import { emailLogin, emailSignup } from '@/lib/appwrite';

const SignIn = () => {
  const { refetch, loading, isLogged, userType, handleEmailLogin } = useGlobalContext();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (!userType) {
        Alert.alert('Error', 'Please select user type first');
        return;
      }

      const success = await handleEmailLogin(email.toLowerCase(), password, '', userType);
      if (success) {
        const route = userType === 'faculty' ? '/(faculty)/(tabs)' : '/(root)/(tabs)';
        router.replace(route);
      } else {
        Alert.alert('Login Failed', 'Please check your email and password');
      }
    } catch (error: any) {
      let message = 'Login failed';
      if (error.message?.includes('Invalid credentials')) {
        message = 'Invalid email or password';
      } else if (error.message?.includes('Permission denied')) {
        message = 'Access denied. Please contact administrator.';
      }
      Alert.alert('Error', message);
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ height: '100%' }}>
        <Image source={images.iiitlogo} className="w-2/6 h-1/6 flex flex-row justify-content-flexstart pb-16 pr-10" resizeMode="contain"/>
        <View className="px-10">
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">Login</Text>
          
          <View className="mt-8 px-6">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white border border-gray-300 p-4 rounded-lg mb-4 font-rubik text-base"
              placeholderTextColor="#666"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              className="bg-white border border-gray-300 p-4 rounded-lg mb-4 font-rubik text-base"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              onPress={handleLogin}
              className="bg-blue-500 rounded-lg py-4 mb-6"
            >
              <Text className="text-white text-center font-rubik-medium text-base">
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;