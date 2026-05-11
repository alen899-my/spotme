import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../constants/theme";

const { width, height } = Dimensions.get("window");

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        router.replace("/(tabs)");
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full bleed background image */}
      <Image
        source={require("../assets/home/firstscreenbg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Dark overlay — bottom heavy, so top stays visible */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.15)",
          "rgba(10,0,0,0.35)",
          "rgba(10,0,0,0.72)",
          "rgba(8,0,0,0.96)",
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Red glow accent — bottom center */}
      <LinearGradient
        colors={["transparent", "rgba(224,0,0,0.18)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.redGlow}
      />

      {/* Top — Logo bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.pillBadge}>
          <Text style={styles.pillText}>BETA</Text>
        </View>
      </View>

      {/* Bottom content block */}
      <View style={[styles.bottomBlock, { paddingBottom: Math.max(insets.bottom, 40) }]}>

        {/* Eyebrow */}
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>YOUR JOURNEY STARTS HERE</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          TRAIN{"\n"}
          <Text style={styles.headlineAccent}>SMARTER.</Text>{"\n"}
          WIN EVERY{"\n"}DAY.
        </Text>

        {/* Sub */}
        <Text style={styles.sub}>
          Expert coaching · Personalized plans{"\n"}
          Real results, zero excuses.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/login")}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>GET STARTED</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary link */}
        <TouchableOpacity 
          style={styles.secondaryBtn} 
          activeOpacity={0.7}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.secondaryText}>
            Already a member?{" "}
            <Text style={styles.secondaryAccent}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000", // Fixed black for the root
    ...(Platform.OS === "web"
      ? {
          maxWidth: 430,
          alignSelf: "center" as any,
          width: "100%",
          height: "100vh" as any,
          overflow: "hidden" as any,
        }
      : {}),
  },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  redGlow: {
    position: "absolute",
    bottom: height * 0.28,
    left: 0,
    right: 0,
    height: 180,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoImage: {
    width: 240,
    height: 68,
    marginLeft: -10,
  },
  pillBadge: {
    backgroundColor: "rgba(224,0,0,0.2)",
    borderWidth: 0.5,
    borderColor: "rgba(224,0,0,0.6)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: "#FF4444",
    letterSpacing: 2,
  },

  // Bottom
  bottomBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    zIndex: 10,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  eyebrowLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E00000",
    borderRadius: 2,
  },
  eyebrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2.5,
  },
  headline: {
    fontFamily: FONTS.heading,
    fontSize: 68,
    color: "#FFFFFF", // Always white
    lineHeight: 66,
    letterSpacing: 1,
    marginBottom: 16,
  },
  headlineAccent: {
    color: "#E00000", // Primary red
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 22,
    marginBottom: 32,
  },

  // CTA
  ctaBtn: {
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: "#FFFFFF", // Always white
    letterSpacing: 3,
  },
  ctaArrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },

  // Secondary
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  secondaryText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)", // Dim text
  },
  secondaryAccent: {
    fontFamily: FONTS.bodyBold,
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
  },
});