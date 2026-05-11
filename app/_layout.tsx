import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { 
  useFonts, 
  Outfit_400Regular, 
  Outfit_600SemiBold, 
  Outfit_700Bold, 
  Outfit_900Black 
} from "@expo-google-fonts/outfit";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { useEffect } from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
