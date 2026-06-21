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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import OptimizedImage from "./OptimizedImage";
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const P = {
  sun:     "#F7CB16",
  cta:     "#2596BE",
  ctaDark: "#1a6e8a",
  white:   "#FFFFFF",
  ink:     "#04282B",
};

const { width: W } = Dimensions.get("window");
const scale = (n: number) => Math.round((W / 390) * n);

const TIER_GRADIENTS: Record<string, [string, string]> = {
  Bronze: ['#CD7F32','#8B4513'], Silver: ['#C0C0C0','#808080'], Gold: ['#FFD700','#B8860B'],
  Platinum: ['#00C9C8','#007BFF'], Diamond: ['#B9F2FF','#00BFFF'], Master: ['#9B59B6','#6C3483'],
  Grandmaster: ['#E91E63','#880E4F'], Elite: ['#FF5722','#BF360C'], Champion: ['#E00000','#7F0000'], Legend: ['#FF9900','#E00000'],
};
const TIER_MC_ICONS: Record<string, string> = {
  Bronze: 'shield', Silver: 'shield-half-full', Gold: 'trophy',
  Platinum: 'diamond-stone', Diamond: 'diamond', Master: 'crown',
  Grandmaster: 'crown-outline', Elite: 'sword-cross', Champion: 'fire', Legend: 'star-four-points',
};
const TIER_DARK_TEXT = new Set(['Silver', 'Gold', 'Diamond', 'Legend']);
const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#B0B8C1', Gold: '#F7CB16',
  Platinum: '#00C9C8', Diamond: '#7DD4F8', Master: '#9B59B6',
  Grandmaster: '#E91E63', Elite: '#FF5722', Champion: '#E00000', Legend: '#FF9900',
};
function getTierColor(tier?: string) { return TIER_COLORS[tier || ''] || '#CD7F32'; }
function getTierGradient(tier?: string): [string, string] { return TIER_GRADIENTS[tier || ''] || ['#CD7F32','#8B4513']; }

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
  const { colors, isDark } = useTheme();
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
  const tierColor = getTierColor(user?.league_tier);

  return (
    <View style={[
      styles.container, 
      { paddingTop: insets.top + scale(6) },
      isDark && {
        backgroundColor: "#000000",
        borderBottomColor: colors.border,
      }
    ]}>
      <View style={styles.row}>
        <Animated.View style={{ transform: [{ scale: profileScale }] }}>
          <TouchableOpacity
            onPress={onProfilePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
            style={styles.avatarBtnOuter}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.avatarBtn, { borderColor: tierColor }]}>
              {hasPhoto ? (
                <OptimizedImage uri={photoUri} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, isDark && { backgroundColor: colors.inputBg }]}>
                  <Ionicons name="person" size={scale(16)} color={isDark ? colors.textMuted : P.cta} />
                </View>
              )}
              <View style={[styles.activeDot, isDark && { borderColor: "#000000" }]} />
            </View>
            {user?.league_tier && (
              <View style={styles.headerTierBadgeWrap}>
                <LinearGradient colors={getTierGradient(user.league_tier)} style={styles.headerTierBadge}>
                  <MaterialCommunityIcons
                    name={TIER_MC_ICONS[user.league_tier] as any}
                    size={7}
                    color={TIER_DARK_TEXT.has(user.league_tier) ? '#021518' : '#FFF'}
                  />
                </LinearGradient>
              </View>
            )}
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
              style={[styles.iconBtn, isDark && { backgroundColor: colors.inputBg }]}
              activeOpacity={0.82}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={actionIcon as any} size={scale(18)} color={P.white} />
              {!!actionBadge && actionBadge > 0 && (
                <View style={[styles.badge, isDark && { borderColor: "#000000" }]}>
                  <Text style={styles.badgeText} allowFontScaling={false}>
                    {actionBadge > 9 ? "9+" : String(actionBadge)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.iconBtn, isDark && { backgroundColor: colors.inputBg }]} />
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
    paddingBottom: scale(10),
    backgroundColor: P.cta,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    zIndex: 100,
  },
  row: {
    minHeight: scale(42),
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBtnOuter: {
    position: 'relative',
  },
  avatarBtn: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  headerTierBadgeWrap: {
    position: 'absolute', bottom: -1, right: -1,
    zIndex: 10,
  },
  headerTierBadge: {
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
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
    borderColor: P.cta,
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
    color: P.white,
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
    backgroundColor: "rgba(255,255,255,0.12)",
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
    borderColor: P.cta,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    color: P.ink,
    letterSpacing: 0.2,
  },
});
