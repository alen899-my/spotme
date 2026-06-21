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
import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { WorkoutTimerProvider } from "../contexts/WorkoutTimerContext";
import SilentUpdateManager from "../components/SilentUpdateManager";
import AnimatedSplash from "../components/ui/AnimatedSplash";
import { API_URL, api } from "../utils/api";
import { getToken } from "../utils/tokenStorage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (finalStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const userToken = await getToken();
    if (userToken && token) {
      await api.post(
        '/notifications/push-token',
        { token },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    }

    return token;
  } catch {
    return null;
  }
}

function useNotificationSetup() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Push received:", notification.request.content.data);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (!data?.type) return;

      const { router } = require("expo-router");
      switch (data.type) {
        case "follow_request":
        case "follow_accept":
        case "follow_accepted":
          if (data.fromUserId) {
            router.push(`/profile/${data.fromUserId}`);
          }
          break;
        case "workout_report":
          if (data.referenceId) {
            router.push(`/daily/report/${data.referenceId}`);
          }
          break;
        case "water_reminder":
          router.push("/daily/new");
          break;
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);
  const [loaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    BebasNeue_400Regular,
  });

  useNotificationSetup();

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <WorkoutTimerProvider>
            {!splashFinished ? (
              <AnimatedSplash onFinish={() => setSplashFinished(true)} fontsLoaded={loaded} />
            ) : (
              <>
                <Stack screenOptions={{ headerShown: false }} />
                <SilentUpdateManager />
              </>
            )}
          </WorkoutTimerProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
