import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { emailSignup } from '@/lib/appwrite';
import images from '@/constants/images';
import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const SignUp = () => {
  const { userType } = useGlobalContext();
  const router = useRouter();
  
  // Redirect faculty to login page
  useEffect(() => {
    if (userType === 'faculty') {
      router.replace('/sign-in');
    }
  }, [userType]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const sections = [
    "4th Sem CSE-A",
    "4th Sem CSE-B"
  ];

  const handleSignup = async () => {
    try {
      setIsLoading(true); // Start loading

      if (!email || !password || !name || !section) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      if (!(email.endsWith("@iiitdwd.ac.in"))) {
        Alert.alert('Error', 'Please Enter college email id');
        return;
      }

      if (!userType) {
        Alert.alert('Error', 'Please select user type first');
        return;
      }

      const { user } = await emailSignup(email, password, name, userType, section);
      if (user) {
        Alert.alert('Success', 'Please check your email for verification code', [
          { text: 'OK', onPress: () => router.push({
            pathname: '/verify-otp',
            params: { email }
          })}
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsLoading(false); // End loading regardless of outcome
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ height: '100%' }}>
        <Image source={images.iiitlogo} className="w-2/6 h-1/6 flex flex-row justify-content-flexstart pb-16 pr-10" resizeMode="contain"/>
        <View className="px-10">
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">Create Account</Text>
          
          <View className="mt-8 px-6">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              className="bg-white border border-gray-300 p-4 rounded-lg mb-4 font-rubik text-base"
              placeholderTextColor="#666"
            />
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
            
            {/* Replace Picker with Custom Dropdown */}
            <TouchableOpacity
              onPress={() => setShowDropdown(!showDropdown)}
              className="bg-white border border-gray-300 p-4 rounded-lg mb-1 flex-row justify-between items-center"
            >
              <Text className="font-rubik text-base text-gray-700">
                {section || "Select Section"}
              </Text>
              <MaterialIcons 
                name={showDropdown ? "arrow-drop-up" : "arrow-drop-down"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>

            {showDropdown && (
              <View className="bg-white border border-gray-300 rounded-lg mb-4 overflow-hidden">
                {sections.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => {
                      setSection(item);
                      setShowDropdown(false);
                    }}
                    className={`p-4 ${
                      section === item ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Text className={`font-rubik ${
                      section === item ? 'text-blue-500' : 'text-gray-700'
                    }`}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity 
              onPress={handleSignup}
              disabled={isLoading}
              className={`bg-blue-500 rounded-lg py-4 mb-6 ${isLoading ? 'opacity-70' : ''}`}
            >
              <Text className="text-white text-center font-rubik-medium text-base">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/sign-in')}>
              <Text className="text-blue-500 text-center mt-4">
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
