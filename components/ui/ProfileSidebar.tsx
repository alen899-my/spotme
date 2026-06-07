import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Modal,
  ImageBackground,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { clearAll } from "../../utils/tokenStorage";
import StreakIcon from "./StreakIcon";
import { useTheme } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH;

// ─── Responsive scale helper ─────────────────────────────────────────────────
const BASE_W = 390;
const scale = (n: number) => Math.round((SCREEN_WIDTH / BASE_W) * n);
const vs = (n: number) => Math.round((SCREEN_HEIGHT / 844) * n);

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

const P = {
  sun:     "#F7CB16",
  sunDeep: "#E7B100",
  cta:     "#2596BE",
  ctaDark: "#1a6e8a",
  ctaDeep: "#0d4d65",
  ink:     "#04282B",
  inkDeep: "#021518",
  white:   "#FFFFFF",
  danger:  "#FF4D4D",
  dangerDark: "#cc2222",
};

interface ProfileSidebarProps {
  visible: boolean;
  user: any;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: "splits",    title: "Splits",          subtitle: "Training splits & programs", icon: "layers-outline",          iconType: "Ionicons",               href: "/(tabs)/splits",    accent: false },
  { id: "details",   title: "Profile Details", subtitle: "Personal stats & data",      icon: "account-details-outline", iconType: "MaterialCommunityIcons", href: "/profile/details",  accent: false },
  { id: "weight",    title: "Weight Tracker",  subtitle: "Log & track body weight",    icon: "scale-outline",           iconType: "Ionicons",               href: "/(tabs)/weight",   accent: false },
  { id: "reports",   title: "Workout Reports", subtitle: "AI analysis & insights",    icon: "clipboard-text-outline",  iconType: "MaterialCommunityIcons", href: "/daily/reports",   accent: false },
  { id: "followers", title: "Followers",       subtitle: "Followers & following",       icon: "account-group-outline",   iconType: "MaterialCommunityIcons", href: "/profile/follow/",  accent: false },
  { id: "calendar",  title: "Calendar",        subtitle: "Workout history heatmap",    icon: "calendar-outline",        iconType: "Ionicons",               href: "/calendar",        accent: false },
  { id: "settings",  title: "Settings",        subtitle: "Preferences & theme",        icon: "settings-outline",        iconType: "Ionicons",               href: "/profile/settings", accent: false },
];

// ─── Animated menu row ────────────────────────────────────────────────────────
function MenuItem({
  item,
  onPress,
  entranceAnim,
}: {
  item: any;
  onPress: () => void;
  entranceAnim: Animated.Value;
}) {
  const { colors } = useTheme();
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  const translateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const opacity    = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale: pressAnim }], opacity }}>
      <TouchableOpacity
        style={[
          styles.menuItem,
          {
            backgroundColor: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
            paddingHorizontal: scale(8),
            paddingVertical: vs(10),
          }
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: "transparent", width: scale(28), height: scale(28) }]}>
          {item.iconType === "MaterialCommunityIcons" ? (
            <MaterialCommunityIcons name={item.icon as any} size={scale(22)} color={colors.text} />
          ) : (
            <Ionicons name={item.icon as any} size={scale(22)} color={colors.text} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: scale(6) }}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.menuSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(15)} color={colors.textDim} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Logout button ────────────────────────────────────────────────────────────
function LogoutButton({
  onPress,
  entranceAnim,
}: {
  onPress: () => void;
  entranceAnim: Animated.Value;
}) {
  const { colors } = useTheme();
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  const translateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const opacity    = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale: pressAnim }], opacity }}>
      <TouchableOpacity
        style={[
          styles.logoutBtn,
          {
            backgroundColor: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
            paddingHorizontal: scale(8),
            paddingVertical: vs(10),
          }
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.logoutIconWrap, { backgroundColor: "transparent", width: scale(28), height: scale(28) }]}>
          <Ionicons name="log-out-outline" size={scale(22)} color={colors.error} />
        </View>
        <View style={{ flex: 1, marginLeft: scale(6) }}>
          <Text style={[styles.logoutTitle, { color: colors.error }]}>Logout</Text>
          <Text style={[styles.logoutSub, { color: colors.textMuted }]}>Sign out of your account</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(15)} color={colors.error + "66"} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileSidebar({ visible, user, onClose }: ProfileSidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const slideAnim   = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  // MENU_ITEMS.length entries + 1 for logout
  const TOTAL_ANIM_COUNT = MENU_ITEMS.length + 1;
  const LOGOUT_ANIM_IDX  = MENU_ITEMS.length; // last slot
  const menuAnims = useRef(
    Array.from({ length: TOTAL_ANIM_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      slideAnim.setValue(0);
      overlayAnim.setValue(1);
      menuAnims.forEach((a) => a.setValue(1));
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  const handleNav = (item: any) => {
    onClose();
    const href = item.href;
    if (!href) { setTimeout(() => alert("Coming soon!"), 300); return; }
    if (item.id === 'followers') {
      setTimeout(() => router.push({ pathname: `/profile/follow/${user?.id}` } as any), 250);
    } else {
      const resolved = href.includes(':id') ? href.replace(':id', user?.id || '') : href;
      setTimeout(() => router.push(resolved as any), 250);
    }
  };

  // ── Logout handler ─────────────────────────────────────────────────────────
  const handleLogout = () => {
    const doLogout = async () => {
      try {
        onClose();
        // Small delay so sidebar closes cleanly before clearing storage
        setTimeout(async () => {
          await clearAll();
          router.replace("/login" as any);
        }, 300);
      } catch (e) {
        console.error("Logout error:", e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) doLogout();
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: doLogout },
        ]
      );
    }
  };

  if (!shouldRender) return null;

  const topPad    = Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) + vs(8);
  const bottomPad = Math.max(insets.bottom, vs(24));
  const H_PAD     = scale(20);

  let animIdx = 0;

  return (
    <Modal
      transparent
      visible={visible || shouldRender}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? "auto" : "none"}>

        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.overlay,
              { opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              width: SIDEBAR_WIDTH,
              transform: [{ translateX: slideAnim }],
              backgroundColor: colors.bg,
              borderRightWidth: 1,
              borderRightColor: colors.border,
            }
          ]}
        >
          {/* ── Single full-page scroll ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: H_PAD }}
            showsVerticalScrollIndicator={false}
            bounces
            overScrollMode="always"
          >

            {/* ── Close button ── */}
            <TouchableOpacity
              style={[styles.closeBtn, { top: topPad - vs(4), backgroundColor: colors.inputBg }]}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={scale(18)} color={colors.text} />
            </TouchableOpacity>

            {/* ── Wordmark ── */}
            <View style={[styles.wordmarkRow, { marginBottom: vs(20) }]}>
              <Text style={[styles.wordmarkSpot, { color: colors.text }]}>spot</Text>
              <Text style={[styles.wordmarkMe, { color: P.sun }]}>ME</Text>
            </View>

            {/* ── Avatar + name ── */}
            <View style={[styles.avatarRow, { marginBottom: vs(14) }]}>
              <View style={styles.avatarWrap}>
                {user?.profile_pic_url ? (
                  <Image source={{ uri: user.profile_pic_url }} style={[styles.avatar, { borderColor: getTierColor(user?.league_tier) }]} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.inputBg, borderColor: getTierColor(user?.league_tier) }]}>
                    <Ionicons name="person" size={scale(30)} color={colors.primary} />
                  </View>
                )}
                {user?.league_tier && (
                  <View style={styles.tierBadgeWrap}>
                    <LinearGradient colors={getTierGradient(user.league_tier)} style={styles.tierBadge}>
                      <MaterialCommunityIcons
                        name={TIER_MC_ICONS[user.league_tier] as any}
                        size={10}
                        color={TIER_DARK_TEXT.has(user.league_tier) ? '#021518' : '#FFF'}
                      />
                    </LinearGradient>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: scale(14) }}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {user?.full_name || "Gym Warrior"}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {user?.email || "warrior@spotme.com"}
                </Text>
              </View>
            </View>

            {/* ── Streak badge (only when streak > 0) ── */}
            {user?.current_streak > 0 && (
              <View style={[styles.streakWrap, { marginBottom: vs(14), backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <StreakIcon streak={user.current_streak} size={scale(26)} />
                <Text style={[styles.streakLabel, { color: colors.text }]}>{user.current_streak} DAY STREAK</Text>
              </View>
            )}

         

         
            {/* ── Menu items ── */}
            <View style={{ gap: scale(8) }}>
              {MENU_ITEMS.map((item) => {
                const currentIdx = animIdx++;
                return (
                  <MenuItem
                    key={item.id}
                    item={item}
                    entranceAnim={menuAnims[currentIdx]}
                    onPress={() => handleNav(item)}
                  />
                );
              })}
            </View>

       
            {/* ── Logout button ── */}
            <LogoutButton
              onPress={handleLogout}
              entranceAnim={menuAnims[LOGOUT_ANIM_IDX]}
            />

            {/* ── Version ── */}
            <Text style={[styles.versionText, { color: colors.textDim, marginTop: vs(20) }]}>spotME v1.0.0</Text>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },

  sidebar: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    backgroundColor: P.ink,
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 28,
    overflow: "hidden",
  },

  bgImage: {
    resizeMode: "cover",
    width: "100%",
    height: "100%",
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,40,43,0.62)",
  },

  // ── Close ──────────────────────────────────────────────────────────────────
  closeBtn: {
    position: "absolute",
    right: scale(20),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // ── Wordmark ───────────────────────────────────────────────────────────────
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: vs(4),
  },

  wordmarkSpot: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(26),
    color: P.white,
    letterSpacing: -0.8,
  },

  wordmarkMe: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(26),
    color: P.sun,
    letterSpacing: -0.8,
  },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: { position: 'relative' },

  avatar: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.75)",
  },

  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  tierBadgeWrap: {
    position: 'absolute', bottom: -1, right: -1,
  },
  tierBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },

  userName: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(19),
    color: P.white,
    letterSpacing: -0.2,
  },

  userEmail: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: "rgba(255,255,255,0.62)",
    marginTop: 2,
  },

  editPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: vs(6),
    paddingHorizontal: scale(10),
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(247,203,22,0.35)",
    gap: scale(4),
  },

  editPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: P.sun,
    letterSpacing: 0.4,
  },

  // ── Streak ─────────────────────────────────────────────────────────────────
  streakWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: P.ctaDeep,
    alignSelf: "flex-start",
    paddingHorizontal: scale(14),
    paddingVertical: vs(7),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.ctaDark,
  },

  streakLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    letterSpacing: 2,
    color: P.white,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.ctaDeep,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: P.ctaDark,
    paddingVertical: vs(14),
    paddingHorizontal: scale(8),
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontFamily: "Outfit_900Black",
    fontSize: scale(18),
    color: P.white,
    letterSpacing: -0.3,
  },

  statLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
    letterSpacing: 0.3,
  },

  statDivider: {
    width: 1,
    height: vs(28),
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // ── Rule ───────────────────────────────────────────────────────────────────
  sectionRule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // ── Menu items ─────────────────────────────────────────────────────────────
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(13),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
    backgroundColor: P.cta,
    gap: scale(14),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  menuItemAccent: {
    backgroundColor: P.ctaDark,
    borderColor: "rgba(247,203,22,0.30)",
  },

  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },

  iconWrapDefault: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  iconWrapAccent: {
    backgroundColor: "rgba(247,203,22,0.22)",
  },

  menuTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(14),
    color: P.white,
    letterSpacing: 0.1,
  },

  menuSub: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },

  // ── Logout button ──────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(13),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
    backgroundColor: "rgba(255,77,77,0.10)",
    gap: scale(14),
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.28)",
  },

  logoutIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,77,77,0.15)",
  },

  logoutTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(14),
    color: P.danger,
    letterSpacing: 0.1,
  },

  logoutSub: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: "rgba(255,77,77,0.6)",
    marginTop: 1,
  },

  // ── Version ────────────────────────────────────────────────────────────────
  versionText: {
    textAlign: "center",
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.22)",
    letterSpacing: 1,
  },
});