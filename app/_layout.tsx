import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { 
  useFonts, 
  Outfit_400Regular, 
  Outfit_600SemiBold, 
  Outfit_700Bold, 
  Outfit_900Black 
} from "@expo-google-fonts/outfit";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { useState } from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import SilentUpdateManager from "../components/SilentUpdateManager";
import AnimatedSplash from "../components/ui/AnimatedSplash";

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);
  const [loaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    BebasNeue_400Regular,
  });

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          {!splashFinished ? (
            <AnimatedSplash onFinish={() => setSplashFinished(true)} fontsLoaded={loaded} />
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
