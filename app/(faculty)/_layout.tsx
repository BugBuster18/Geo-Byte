import { Stack } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

export default function FacultyLayout() {
  const { userType, loading } = useGlobalContext();

  // Add this check to prevent infinite redirects
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0061ff" />
      </View>
    );
  }

  // Only redirect if we're sure about the userType
  if (!loading && userType !== 'faculty') {
    return <Redirect href="/LoginSelection" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
