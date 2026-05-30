import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FONTS } from "../constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = {
  sun:      "#F7CB16",
  sunDeep:  "#E7B100",
  cta:      "#2596BE",
  ink:      "#04282B",
  inkCard:  "rgba(10, 86, 91, 0.9)",
  mist:     "#F7FBF8",
  mistSoft: "rgba(247, 251, 248, 0.88)",
  border:   "rgba(255, 255, 255, 0.12)",
};



const COMMUNITY_AVATARS: Array<{
  initials: string;
  backgroundColor: string;
  textColor: string;
}> = [
  { initials: "AN", backgroundColor: "#F5C94F", textColor: PALETTE.ink },
  { initials: "JR", backgroundColor: "#B7F4FF", textColor: PALETTE.ink },
  { initials: "MK", backgroundColor: "#FFD7CC", textColor: PALETTE.ink },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const insets            = useSafeAreaInsets();
  const router            = useRouter();
  const { width, height } = useWindowDimensions();
  const [checking, setChecking] = useState(true);

  // ── Layout breakpoints
  const isShort   = height < 740;
  const isCompact = !isShort && (width < 390 || height < 820);

  // ── Dynamic sizing
  const headlineFontSize   = isShort ? 44 : isCompact ? 54 : 64;
  const headlineLineHeight = isShort ? 40 : isCompact ? 48 : 57;
  const featureIconSize    = isShort ? 26 : 32;
  const featureCardHeight  = isShort ? 110 : isCompact ? 128 : 144;

  // ── Top bar height reserve (wordmark ~32px + top inset + 14 padding + 20 gap below)
  const topBarReserve = insets.top + 14 + 32 + 24;

  // ── Auth check
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token && isMounted) {
          router.replace("/(tabs)");
          return;
        }
      } catch (error) {
        console.log(error);
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    void checkAuth();
    return () => { isMounted = false; };
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#04282B" }} />
    );
  }

  return (
    <View style={styles.root}>

      {/* ── Status Bar ─────────────────────────────────────────── */}
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Background Image ───────────────────────────────────── */}
      <Image
        source={require("../assets/home/firstscreenbg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* ── Gradient Overlays ──────────────────────────────────── */}
      <LinearGradient
        colors={[
          "rgba(3, 30, 33, 0.82)",
          "rgba(3, 30, 33, 0.4)",
          "rgba(3, 30, 33, 0.1)",
        ]}
        start={{ x: 0, y: 0.26 }}
        end={{ x: 1, y: 0.54 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[
          "rgba(2, 10, 11, 0.04)",
          "rgba(2, 10, 11, 0.4)",
          "rgba(2, 10, 11, 0.97)",
        ]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[
          "rgba(247, 203, 22, 0.15)",
          "rgba(247, 203, 22, 0.03)",
          "transparent",
        ]}
        start={{ x: 0.45, y: 0 }}
        end={{ x: 1, y: 0.34 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Full-height layout container ───────────────────────── */}
      {/*
        KEY FIX: Instead of two absolutely-positioned layers fighting for
        space, we use a single flex column that:
          1. Renders the top bar in normal flow (with safe-area padding)
          2. Uses flex: 1 spacer to push content to the bottom
          3. Renders the bottom content block anchored to the bottom
        This guarantees the headline is always visible below the top bar.
      */}
      <View style={[styles.layout, { paddingTop: insets.top + 14 }]}>

        {/* ── Top Bar ──────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingHorizontal: 26 }]}>

          {/* Wordmark */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkSpot}>spot</Text>
            <Text style={styles.wordmarkMe}>ME</Text>
          </View>

         

        </View>

        {/* ── Flex spacer — pushes content to the bottom ───────── */}
        <View style={styles.spacer} />

        {/* ── Bottom Content Block ──────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.bottomBlock,
            { paddingBottom: Math.max(insets.bottom, 22) + 10 },
          ]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >

          {/* Headline */}
          <View style={styles.headlineBlock}>
            {["MAKE", "YOUR"].map((word) => (
              <Text
                key={word}
                style={[
                  styles.headline,
                  { fontSize: headlineFontSize, lineHeight: headlineLineHeight },
                ]}
              >
                {word}
              </Text>
            ))}
            {["BODY", "HEALTHIER"].map((word) => (
              <Text
                key={word}
                style={[
                  styles.headline,
                  styles.headlineAccent,
                  { fontSize: headlineFontSize, lineHeight: headlineLineHeight },
                ]}
              >
                {word}
              </Text>
            ))}
            <Text
              style={[
                styles.headline,
                { fontSize: headlineFontSize, lineHeight: headlineLineHeight },
              ]}
            >
              AND
            </Text>
            <Text
              style={[
                styles.headline,
                styles.headlineAccent,
                { fontSize: headlineFontSize, lineHeight: headlineLineHeight },
              ]}
            >
              STRONGER
            </Text>
          </View>

          {/* Accent Divider */}
          <View style={styles.accentBar} />

          {/* Subheadline */}
          <Text
            style={[
              styles.subhead,
              isShort   && styles.subheadShort,
              isCompact && styles.subheadCompact,
            ]}
          >
            Personalized workouts, nutrition plans, and expert coaching to help
            you reach your goals faster.
          </Text>

          

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.88}
            onPress={() => router.push("/login")}
          >
            <View style={[styles.ctaInner, isShort && styles.ctaInnerShort]}>
              <Text style={[styles.ctaText, isShort && styles.ctaTextShort]}>
                Get Started
              </Text>
              <View style={[styles.ctaArrowWrap, isShort && styles.ctaArrowWrapShort]}>
                <Ionicons
                  name="chevron-forward"
                  size={isShort ? 26 : 30}
                  color={PALETTE.sun}
                />
              </View>
            </View>
          </TouchableOpacity>

        

          {/* Sign In Link */}
          <TouchableOpacity
            style={[styles.signInLink, isShort && styles.signInLinkShort]}
            activeOpacity={0.7}
            onPress={() => router.push("/login")}
          >
            <Text style={[styles.signInText, isShort && styles.signInTextShort]}>
              Already a member?{" "}
              <Text style={styles.signInAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Root & Layout ──────────────────────────────────────────────────────────

  root: {
    flex: 1,
    backgroundColor: "#031516",
    ...(Platform.OS === "web"
      ? { maxWidth: 430, alignSelf: "center", width: "100%" }
      : {}),
  },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  // Full-height flex column — top bar at top, content at bottom
  layout: {
    flex: 1,
    flexDirection: "column",
  },

  // Pushes bottom block down so it stays anchored at the bottom
  spacer: {
    flex: 1,
  },

  scrollArea: {
    flexGrow: 0,
  },

  // ── Top Bar ────────────────────────────────────────────────────────────────

  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },

  wordmarkSpot: {
    fontFamily: "Outfit_900Black",
    fontSize: 32,
    color: "#FFFFFF",
    letterSpacing: -1.2,
  },

  wordmarkMe: {
    fontFamily: "Outfit_900Black",
    fontSize: 32,
    color: PALETTE.sun,
    letterSpacing: -1.2,
  },

  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(4, 40, 43, 0.85)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PALETTE.sun,
    alignItems: "center",
    justifyContent: "center",
  },

  planText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    lineHeight: 16,
  },

  // ── Bottom Block ───────────────────────────────────────────────────────────

  bottomBlock: {
    paddingHorizontal: 26,
  },

  // ── Headline ───────────────────────────────────────────────────────────────

  headlineBlock: {
    marginBottom: 12,
  },

  headline: {
    fontFamily: FONTS.heading,
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },

  headlineAccent: {
    color: PALETTE.sun,
  },

  // ── Accent Bar ─────────────────────────────────────────────────────────────

  accentBar: {
    width: 62,
    height: 4,
    borderRadius: 999,
    backgroundColor: PALETTE.sun,
    marginBottom: 14,
  },

  // ── Subhead ────────────────────────────────────────────────────────────────

  subhead: {
    maxWidth: 312,
    color: PALETTE.mist,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },

  subheadCompact: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 290,
  },

  subheadShort: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 272,
    marginBottom: 14,
  },

  // ── Feature Cards ──────────────────────────────────────────────────────────

  featureRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  featureCard: {
    flex: 1,
    backgroundColor: PALETTE.inkCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingHorizontal: 15,
    paddingVertical: 15,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  featureCardCompact: {
    paddingHorizontal: 13,
    paddingVertical: 13,
  },

  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PALETTE.sun,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  featureIconShort: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },

  featureTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    color: "#FFFFFF",
    marginBottom: 6,
  },

  featureTitleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },

  featureDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: PALETTE.mistSoft,
  },

  featureDescriptionCompact: {
    fontSize: 11,
    lineHeight: 17,
  },

  featureDescriptionShort: {
    fontSize: 10.5,
    lineHeight: 15,
  },

  // ── CTA Button ─────────────────────────────────────────────────────────────

  ctaButton: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: PALETTE.cta,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },

  ctaInner: {
    backgroundColor: PALETTE.cta,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingLeft: 24,
    paddingRight: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ctaInnerShort: {
    paddingLeft: 20,
    paddingVertical: 13,
  },

  ctaText: {
    fontFamily: "Outfit_900Black",
    fontSize: 24,
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },

  ctaTextShort: {
    fontSize: 21,
  },

  ctaArrowWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: PALETTE.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  ctaArrowWrapShort: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  // ── Community Row ──────────────────────────────────────────────────────────

  communityRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 100,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarShort: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  avatarText: {
    fontFamily: "Outfit_900Black",
    fontSize: 13,
    letterSpacing: -0.3,
  },

  avatarTextShort: {
    fontSize: 11,
  },

  communityDivider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.26)",
    marginHorizontal: 16,
  },

  communityDividerShort: {
    height: 44,
    marginHorizontal: 14,
  },

  communityCopy: {
    flex: 1,
  },

  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },

  communityTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: PALETTE.sun,
    marginBottom: 1,
  },

  communityTitleShort: {
    fontSize: 16,
  },

  communitySubtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#FFFFFF",
  },

  communitySubtitleShort: {
    fontSize: 12,
  },

  // ── Sign In Link ───────────────────────────────────────────────────────────

  signInLink: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginTop: 8,
  },

  signInLinkShort: {
    marginTop: 5,
    paddingVertical: 5,
  },

  signInText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.78)",
  },

  signInTextShort: {
    fontSize: 12,
  },

  signInAccent: {
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
});
