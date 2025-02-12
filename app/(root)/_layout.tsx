import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, Slot, Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppLayout(){
    const { loading, isLogged } = useGlobalContext();
  
    if (loading) {
      return (
        <SafeAreaView className="bg-white h-full flex justify-center items-center">
          <ActivityIndicator className="text-primary-300" size="large"/>
        </SafeAreaView>
      );
    }
  
    if (!isLogged && !loading) {
      return <Redirect href='/LoginSelection' />;
    }
  
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{
            gestureEnabled: false
          }}
        />
        <Stack.Screen 
          name="allsubjects" 
          options={{
            gestureEnabled: true,
            presentation: 'card'
          }}
        />
        <Slot />
      </Stack>
    );
  }
