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
import { useEffect, useState } from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import SilentUpdateManager from "../components/SilentUpdateManager";
import AnimatedSplash from "../components/ui/AnimatedSplash";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);
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
          {!splashFinished ? (
            <AnimatedSplash onFinish={() => setSplashFinished(true)} />
          ) : (
            <>
              <Stack screenOptions={{ headerShown: false }} />
              <SilentUpdateManager />
            </>
          )}
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
