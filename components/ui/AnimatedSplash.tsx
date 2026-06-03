import React, { useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from "react-native";

const { width: SW } = Dimensions.get("window");

interface AnimatedSplashProps {
  onFinish: () => void;
  fontsLoaded: boolean;
}

export default function AnimatedSplash({ onFinish, fontsLoaded }: AnimatedSplashProps) {
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(logoScale, {
        toValue: 1.05,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 2.8,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(containerFade, {
            toValue: 0,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          onFinish();
        });
      });
    });
  }, [onFinish, fontsLoaded]);

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: containerFade,
        },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {fontsLoaded && (
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Text style={styles.wordmark}>
            spot<Text style={styles.wordmarkMe}>ME</Text>
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999, // Render above all navigation bars and stacks
    backgroundColor: "#000000", // Pure OLED Black background (Netflix style)
  },
  wordmark: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(64),
    color: "#FFFFFF",
    letterSpacing: -2.8,
    textAlign: "center",
  },
  wordmarkMe: {
    color: "#F7CB16", // Brand Gold
    textShadowColor: "rgba(247, 203, 22, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
});

function scale(n: number) {
  const BASE_W = 390;
  return Math.round((SW / BASE_W) * n);
}
