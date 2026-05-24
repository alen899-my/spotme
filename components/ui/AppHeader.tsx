import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";

const P = {
  sun:     "#F7CB16",
  cta:     "#2596BE",
  ctaDark: "#1a6e8a",
  white:   "#FFFFFF",
  ink:     "#04282B",
  pageBg:  "#F5F9FC",
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

  const onPressIn = () =>
    Animated.spring(profileScale, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

  const onPressOut = () =>
    Animated.spring(profileScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();

  const hasPhoto = !!(user?.profile_pic_url || user?.profilePicUrl);
  const photoUri = user?.profile_pic_url || user?.profilePicUrl;

  return (
    <View style={[styles.container, { paddingTop: insets.top + scale(2) }]}>
      <View style={styles.row}>
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
                <Ionicons name="person" size={scale(16)} color={P.cta} />
              </View>
            )}
            <View style={styles.activeDot} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.wordmarkWrap} pointerEvents="none">
          <Text style={styles.wordmarkSpot} allowFontScaling={false}>spot</Text>
          <Text style={styles.wordmarkMe} allowFontScaling={false}>ME</Text>
        </View>

        <View style={styles.rightSlot}>
          {onActionPress ? (
            <TouchableOpacity
              onPress={onActionPress}
              style={styles.iconBtn}
              activeOpacity={0.82}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={actionIcon as any} size={scale(18)} color={P.white} />
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
    </View>
  );
}

const AVATAR = scale(36);
const BTN = scale(36);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(4),
    backgroundColor: P.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(37,150,190,0.10)",
    zIndex: 100,
  },
  row: {
    minHeight: scale(36),
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBtn: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    borderColor: "rgba(37,150,190,0.25)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  avatarImg: {
    width: AVATAR - 4,
    height: AVATAR - 4,
    borderRadius: (AVATAR - 4) / 2,
  },
  avatarFallback: {
    width: AVATAR - 4,
    height: AVATAR - 4,
    borderRadius: (AVATAR - 4) / 2,
    backgroundColor: P.white,
    justifyContent: "center",
    alignItems: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: scale(1),
    right: scale(1),
    width: scale(9),
    height: scale(9),
    borderRadius: scale(4.5),
    backgroundColor: P.sun,
    borderWidth: 1.5,
    borderColor: P.pageBg,
  },
  wordmarkWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  wordmarkSpot: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(21),
    color: P.ctaDark,
    letterSpacing: -0.8,
    includeFontPadding: false,
  },
  wordmarkMe: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(21),
    color: P.sun,
    letterSpacing: -0.8,
    includeFontPadding: false,
  },
  rightSlot: {
    width: BTN,
    alignItems: "flex-end",
  },
  iconBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(37,150,190,0.08)",
    borderWidth: 1,
    borderColor: "rgba(37,150,190,0.12)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: P.sun,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: P.pageBg,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    color: P.ink,
    letterSpacing: 0.2,
  },
});
