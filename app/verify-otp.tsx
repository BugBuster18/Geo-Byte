import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOTP } from '@/lib/appwrite';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const handleVerify = async () => {
    try {
      if (!otp || otp.length !== 6) {
        Alert.alert('Error', 'Please enter a valid 6-digit OTP');
        return;
      }

      const verified = await verifyOTP(email as string, otp);
      if (verified) {
        Alert.alert('Success', 'Email verified successfully', [
          { text: 'OK', onPress: () => router.push('/sign-in') }
        ]);
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <View className="px-10 py-8">
        <Text className="text-3xl font-rubik-bold text-center mb-4">Verify Email</Text>
        <Text className="text-base text-gray-600 text-center mb-8">
          Please enter the verification code sent to {email}
        </Text>
        
        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="Enter OTP"
          keyboardType="number-pad"
          maxLength={6}
          className="bg-white border border-gray-300 p-4 rounded-lg mb-6 font-rubik text-base text-center"
        />

        <TouchableOpacity 
          onPress={handleVerify}
          className="bg-blue-500 rounded-lg py-4"
        >
          <Text className="text-white text-center font-rubik-medium text-base">
            Verify
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VerifyOTP;
