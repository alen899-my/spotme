import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";
import { APP_VERSION, APP_VERSION_CODE } from "../../utils/appVersion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── Responsive helpers (mobile-first, 390×844 base) ──────────────────────────
const BASE_W = 390;
const BASE_H = 844;
const s = (n: number) => Math.round((SCREEN_WIDTH / BASE_W) * n);
const vs = (n: number) => Math.round((SCREEN_HEIGHT / BASE_H) * n);
const fs = (n: number) => Math.round((Math.min(SCREEN_WIDTH, 500) / BASE_W) * n);

interface LatestBuild {
  id: number;
  title: string;
  description: string | null;
  build_channel: string;
  file_type: string;
  version: string | null;
  version_code: number | null;
  file_url: string;
  file_size: number | null;
  is_latest: boolean;
  force_update: boolean;
  created_at: string;
}

interface UpdateInfo {
  update_available: boolean;
  force_update: boolean;
  build: LatestBuild | null;
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export default function AppUpdateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      if (!token) {
        setError(true);
        return;
      }
      const res = await axios.get(
        `${API_URL}/updates/latest?channel=production&version_code=${APP_VERSION_CODE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInfo(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLatest();
    }, [fetchLatest])
  );

  const handleDownload = async () => {
    const url = info?.build?.file_url;
    if (!url) return;
    setDownloading(true);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setError(true);
        return;
      }
      await Linking.openURL(url);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  const build = info?.build ?? null;
  const hasUpdate = !!info?.update_available;
  const forced = hasUpdate && !!info?.force_update;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[st.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[st.backBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="chevron-back" size={fs(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>App Updates</Text>
        <View style={{ width: s(40) }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Installed version */}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.row}>
            <Ionicons name="phone-portrait-outline" size={fs(20)} color={colors.textMuted} style={{ width: s(28) }} />
            <View style={{ flex: 1 }}>
              <Text style={[st.cardTitle, { color: colors.text }]}>Installed version</Text>
              <Text style={[st.cardSub, { color: colors.textDim }]}>
                SpotMe v{APP_VERSION} ({APP_VERSION_CODE})
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[st.hint, { color: colors.textDim }]}>Checking for updates…</Text>
          </View>
        ) : error && !build ? (
          <View style={st.center}>
            <Ionicons name="cloud-offline-outline" size={fs(40)} color={colors.textDim} />
            <Text style={[st.hint, { color: colors.textDim }]}>Couldn&apos;t check for updates.</Text>
            <TouchableOpacity
              onPress={fetchLatest}
              style={[st.retryBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={st.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !build ? (
          <View style={st.center}>
            <Ionicons name="checkmark-circle-outline" size={fs(40)} color={colors.textDim} />
            <Text style={[st.hint, { color: colors.textDim }]}>No builds published yet.</Text>
          </View>
        ) : (
          <>
            {/* Status banner */}
            <View style={[
              st.banner,
              {
                backgroundColor: hasUpdate
                  ? (forced ? "rgba(255,68,68,0.10)" : `${colors.primary}14`)
                  : "rgba(16,185,129,0.10)",
                borderColor: hasUpdate
                  ? (forced ? "#FF4444" : colors.primary)
                  : "#10B981",
              },
            ]}>
              <Ionicons
                name={hasUpdate ? "cloud-download-outline" : "checkmark-circle-outline"}
                size={fs(26)}
                color={hasUpdate ? (forced ? "#FF4444" : colors.primary) : "#10B981"}
              />
              <View style={{ flex: 1 }}>
                <Text style={[st.bannerTitle, { color: colors.text }]}>
                  {hasUpdate
                    ? (forced ? "Update required" : "New version available")
                    : "You're up to date"}
                </Text>
                <Text style={[st.bannerSub, { color: colors.textDim }]}>
                  {hasUpdate
                    ? `v${build.version ?? "?"} is ready to download`
                    : `You have the latest version (v${build.version ?? "?"})`}
                </Text>
              </View>
            </View>

            {/* Latest build details */}
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[st.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cardTitle, { color: colors.text }]}>{build.title}</Text>
                  {!!build.description && (
                    <Text style={[st.cardSub, { color: colors.textDim }]}>{build.description}</Text>
                  )}
                </View>
              </View>
              <View style={st.metaWrap}>
                <View style={st.metaRow}>
                  <Text style={[st.metaLabel, { color: colors.textDim }]}>Version</Text>
                  <Text style={[st.metaValue, { color: colors.text }]}>
                    v{build.version ?? "?"}{build.version_code != null ? ` (${build.version_code})` : ""}
                  </Text>
                </View>
                <View style={st.metaRow}>
                  <Text style={[st.metaLabel, { color: colors.textDim }]}>Size</Text>
                  <Text style={[st.metaValue, { color: colors.text }]}>{formatSize(build.file_size)}</Text>
                </View>
                <View style={st.metaRow}>
                  <Text style={[st.metaLabel, { color: colors.textDim }]}>Published</Text>
                  <Text style={[st.metaValue, { color: colors.text }]}>
                    {build.created_at ? new Date(build.created_at).toLocaleDateString() : "—"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Download */}
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              style={[
                st.downloadBtn,
                { backgroundColor: forced ? "#FF4444" : colors.primary, opacity: downloading ? 0.7 : 1 },
              ]}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={fs(20)} color="#FFF" />
                  <Text style={st.downloadText}>
                    {hasUpdate ? "Download Update" : "Download APK"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[st.hint, { color: colors.textDim }]}>
              APK file · installs directly on Android
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(12),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: fs(20),
    letterSpacing: 0.5,
  },
  // Mobile-first: full width on phones, capped + centered on tablets/web
  scroll: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: s(20),
    paddingBottom: vs(60),
    gap: vs(16),
  },
  card: {
    borderRadius: s(16),
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingVertical: vs(15),
  },
  cardTitle: {
    fontFamily: FONTS.body,
    fontSize: fs(15),
  },
  cardSub: {
    fontFamily: FONTS.body,
    fontSize: fs(12),
    marginTop: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    borderRadius: s(16),
    borderWidth: 1,
    padding: s(16),
  },
  bannerTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: fs(16),
  },
  bannerSub: {
    fontFamily: FONTS.body,
    fontSize: fs(13),
    marginTop: 2,
  },
  metaWrap: {
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    gap: vs(8),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: FONTS.body,
    fontSize: fs(13),
  },
  metaValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: fs(13),
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: s(10),
    borderRadius: s(16),
    paddingVertical: vs(16),
  },
  downloadText: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(16),
    color: "#FFF",
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: fs(12),
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    gap: vs(12),
    paddingVertical: vs(40),
  },
  retryBtn: {
    borderRadius: s(12),
    paddingHorizontal: s(24),
    paddingVertical: vs(12),
    marginTop: vs(4),
  },
  retryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(14),
    color: "#FFF",
  },
});
