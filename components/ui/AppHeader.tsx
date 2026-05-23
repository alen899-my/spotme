import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";

const P = {
  sun:     "#F7CB16",
  sunDeep: "#E7B100",
  cta:     "#2596BE",
  ctaDark: "#1a6e8a",
  ctaDeep: "#0d4d65",
  ink:     "#04282B",
  inkDeep: "#021518",
  white:   "#FFFFFF",
};

const { width: W } = Dimensions.get("window");
const scale = (n: number) => Math.round((W / 390) * n);

interface AppHeaderProps {
  user: any;
  onProfilePress: () => void;
  onActionPress?: () => void;
  actionIcon?: string;
  actionBadge?: number;
}

export default function AppHeader({
  user,
  onProfilePress,
  onActionPress,
  actionIcon = "notifications-outline",
  actionBadge,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  const profileScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(profileScale, { toValue: 0.91, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const onPressOut = () => Animated.spring(profileScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 20 }).start();

  const topPad = Math.max(insets.top, Platform.OS === "ios" ? 44 : 24);
  const hasPhoto = !!(user?.profile_pic_url || user?.profilePicUrl);
  const photoUri  = user?.profile_pic_url || user?.profilePicUrl;

  return (
    <View style={[styles.container, { paddingTop: topPad + scale(6) }]}>

      {/* ── Left: avatar ── */}
      <Animated.View style={{ transform: [{ scale: profileScale }] }}>
        <TouchableOpacity
          onPress={onProfilePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
          style={styles.avatarBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {hasPhoto ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={scale(18)} color={P.cta} />
            </View>
          )}
          <View style={styles.activeDot} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Centre: wordmark ── */}
      <View style={styles.wordmarkWrap} pointerEvents="none">
        <Text style={styles.wordmarkSpot} allowFontScaling={false}>spot</Text>
        <Text style={styles.wordmarkMe}   allowFontScaling={false}>ME</Text>
      </View>

      {/* ── Right: action button ── */}
      <View style={styles.rightSlot}>
        {onActionPress ? (
          <TouchableOpacity
            onPress={onActionPress}
            style={styles.iconBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={actionIcon as any} size={scale(20)} color={P.white} />
            {!!actionBadge && actionBadge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} allowFontScaling={false}>
                  {actionBadge > 9 ? "9+" : String(actionBadge)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

    </View>
  );
}

const AVATAR = scale(38);
const BTN    = scale(38);

const styles = StyleSheet.create({
  container: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingHorizontal: scale(18),
    paddingBottom:   scale(10),
    backgroundColor: P.cta,
    zIndex: 100,
  },

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarBtn: {
    width:          AVATAR,
    height:         AVATAR,
    borderRadius:   AVATAR / 2,
    borderWidth:    2.5,
    borderColor:    P.white,
    overflow:       "visible",
    justifyContent: "center",
    alignItems:     "center",
  },

  avatarImg: {
    width:        AVATAR - 5,
    height:       AVATAR - 5,
    borderRadius: (AVATAR - 5) / 2,
  },

  avatarFallback: {
    width:           AVATAR - 5,
    height:          AVATAR - 5,
    borderRadius:    (AVATAR - 5) / 2,
    backgroundColor: P.white,
    justifyContent:  "center",
    alignItems:      "center",
  },

  activeDot: {
    position:        "absolute",
    bottom:          0,
    right:           0,
    width:           scale(10),
    height:          scale(10),
    borderRadius:    scale(5),
    backgroundColor: P.sun,           // yellow active dot
    borderWidth:     2,
    borderColor:     P.cta,
  },

  // ── Wordmark ─────────────────────────────────────────────────────────────────
  wordmarkWrap: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "center",
  },

  wordmarkSpot: {
    fontFamily:         "Outfit_900Black",
    fontSize:           scale(25),
    color:              P.white,
    letterSpacing:      -0.8,
    includeFontPadding: false,
  },

  wordmarkMe: {
    fontFamily:         "Outfit_900Black",
    fontSize:           scale(25),
    color:              P.sun,         // yellow ME
    letterSpacing:      -0.8,
    includeFontPadding: false,
  },

  // ── Right slot ───────────────────────────────────────────────────────────────
  rightSlot: {
    width:      BTN,
    alignItems: "flex-end",
  },

  iconBtn: {
    width:          BTN,
    height:         BTN,
    justifyContent: "center",
    alignItems:     "center",
  },

  // ── Notification badge ───────────────────────────────────────────────────────
  badge: {
    position:         "absolute",
    top:              -3,
    right:            -3,
    minWidth:         scale(16),
    height:           scale(16),
    borderRadius:     scale(8),
    backgroundColor:  P.sun,
    justifyContent:   "center",
    alignItems:       "center",
    paddingHorizontal: 3,
    borderWidth:      1.5,
    borderColor:      P.cta,
  },

  badgeText: {
    fontFamily:    FONTS.bodyBold,
    fontSize:      scale(9),
    color:         P.ink,
    letterSpacing: 0.2,
  },
});