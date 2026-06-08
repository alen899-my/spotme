import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../utils/tokenStorage";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  yellow:     "#F7CB16",
  yellowDim:  "rgba(247, 203, 22, 0.12)",
  blue:       "#2596BE",
  blueDark:   "#0E6A8A",
  ink:        "#020D0E",
  inkLight:   "#0A2426",
  white:      "#FFFFFF",
  mist:       "rgba(255,255,255,0.55)",
  mistBright: "rgba(255,255,255,0.82)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const insets             = useSafeAreaInsets();
  const router             = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        if (token && mounted) { router.replace("/(tabs)"); return; }
      } catch {}
      finally { if (mounted) setChecking(false); }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (checking) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── BG photo */}
      <Image
        source={require("../assets/home/firstscreenbg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* ── Darkening overlays — bottom-heavy so type is always legible */}
      <LinearGradient
        colors={["rgba(2,13,14,0.25)", "rgba(2,13,14,0.60)", "rgba(2,13,14,0.97)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle blue tint on left edge — brand anchor */}
      <LinearGradient
        colors={["rgba(37,150,190,0.22)", "transparent"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0.55, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Layout */}
      <View style={[styles.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) + 8 }]}>

        {/* ── CENTERED BRAND */}
        <View style={styles.brandSection}>
          <LinearGradient
            colors={[C.blue, C.blueDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandCard}
          >
            <View style={styles.wordmark}>
              <Text style={styles.wmSpot}>spot</Text>
              <Text style={styles.wmMe}>ME</Text>
            </View>
            <Text style={styles.tagline}>We will spot you</Text>

            <View style={styles.cardCta}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/login")}
                style={styles.ctaRow}
              >
                <Text style={styles.ctaLabel}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ── SIGN IN — under the circle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/login")}
            style={styles.signIn}
          >
            <Text style={styles.signInText}>
              Already a member?{"  "}
              <Text style={styles.signInAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: C.ink,
    ...(Platform.OS === "web" ? { maxWidth: 430, alignSelf: "center", width: "100%" } : {}),
  },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  layout: {
    flex: 1,
    flexDirection: "column",
  },

  // ── Brand section (centered) ──

  brandSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  brandCard: {
    alignItems: "center",
    justifyContent: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1.5,
    borderColor: "rgba(37,150,190,0.3)",
    shadowColor: C.blue,
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 0,
  },

  wmSpot: {
    fontFamily: "Outfit_900Black",
    fontSize: 48,
    color: C.white,
    letterSpacing: -2,
  },

  wmMe: {
    fontFamily: "Outfit_900Black",
    fontSize: 48,
    color: C.yellow,
    letterSpacing: -2,
  },

  tagline: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: C.mist,
    letterSpacing: 2.5,
    marginTop: 12,
  },

  // ── CTA ──

  cardCta: {
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  ctaLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: C.white,
    letterSpacing: 2,
  },

  signIn: {
    marginTop: 24,
  },

  signInText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: C.mist,
  },

  signInAccent: {
    fontFamily: "Outfit_700Bold",
    color: C.white,
  },

});