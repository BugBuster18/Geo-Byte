import { SplashScreen, Stack } from "expo-router";
import "./global.css"; //to add tailwind to our app
import { useFonts } from "expo-font"
import { useEffect } from "react";
import { GlobalProvider } from "@/lib/global-provider";
export default function RootLayout() {
  const [fontsLoaded] = useFonts( {
    "Rubik-Bold":require('../assets/fonts/Rubik-Bold.ttf'),
    "Rubik-ExtraBold":require('../assets/fonts/Rubik-ExtraBold.ttf'),
    "Rubik-Light":require('../assets/fonts/Rubik-Light.ttf'),
    "Rubik-Medium":require('../assets/fonts/Rubik-Medium.ttf'),
    "Rubik-Regular":require('../assets/fonts/Rubik-Regular.ttf'),
    "Rubik-SemiBold":require('../assets/fonts/Rubik-SemiBold.ttf'),
  })
  useEffect(() => {
    if(fontsLoaded){
      SplashScreen.hideAsync();
    }
  },[fontsLoaded]);
  if(!fontsLoaded)
    return null;
  // every screen will have the access to the data within global provider
  return (
  <GlobalProvider> 
    <Stack screenOptions={{headerShown:false}} />
  </GlobalProvider>);
}
