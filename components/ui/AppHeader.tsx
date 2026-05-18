import React from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

interface AppHeaderProps {
  user: any;
  onProfilePress: () => void;
}

export default function AppHeader({ user, onProfilePress }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const topPad = Math.max(insets.top, Platform.OS === "ios" ? 44 : 20);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPad,
          backgroundColor: colors.tabBar,
          borderBottomColor: colors.tabBarBorder,
        },
      ]}
    >
      {/* Left: Profile Icon */}
      <View style={styles.side}>
        <TouchableOpacity
          onPress={onProfilePress}
          style={[styles.profileBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
          activeOpacity={0.75}
        >
          {user?.profile_pic_url || user?.profilePicUrl ? (
            <Image
              source={{ uri: user.profile_pic_url || user.profilePicUrl }}
              style={styles.profileImage}
            />
          ) : (
            <Ionicons name="person" size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Centered Logo */}
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Right spacer (mirrors profile button width for centering) */}
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    zIndex: 100,
  },
  side: {
    width: 44,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 100,
    height: 36,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});
