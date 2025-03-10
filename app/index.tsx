import { Redirect } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLogged, userType, loading } = useGlobalContext();
  
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0061ff" />
      </View>
    );
  }

  if (!isLogged) {
    return <Redirect href="/LoginSelection" />;
  }

  // Simple routing based on userType
  return userType === 'faculty' 
    ? <Redirect href="/(faculty)/(tabs)" />
    : <Redirect href="/(root)/(tabs)" />;
}
