import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import axios from "axios";
import { getToken } from "../../utils/tokenStorage";
import { API_URL } from "../../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CATEGORIES = ["General", "Bug Report", "Feature Request"];

export default function FeedbackScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState("General");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const styles = makeStyles(colors);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = async () => {
    setSending(true);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/feedback`,
        { category, title: title.trim(), description: description.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowSuccess(true);
    } catch (e: any) {
      const msg = e.response?.data?.message || "Failed to submit feedback.";
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.responsiveContainer]}>
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Feedback</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textDim }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryBtn,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.inputBg,
                      borderColor: category === cat ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryBtnText,
                    { color: category === cat ? '#FFF' : colors.textMuted },
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.textDim }]}>Title</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief title for your feedback"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.textDim }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your feedback, suggestion, or issue..."
                placeholderTextColor={colors.textDim}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || sending}
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.primary : colors.inputBg, opacity: sending ? 0.6 : 1 },
            ]}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.submitText, { color: canSubmit ? '#FFF' : colors.textMuted }]}>
                Send Feedback
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => { setShowSuccess(false); router.back(); }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => { setShowSuccess(false); router.back(); }}
        >
          <View
            style={{
              backgroundColor: isDark ? colors.card : '#FFF',
              borderRadius: 24,
              padding: 32,
              marginHorizontal: 28,
              width: '85%',
              maxWidth: 340,
              alignItems: 'center',
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#10B98120',
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 20,
            }}>
              <Ionicons name="checkmark-circle" size={44} color="#10B981" />
            </View>

            <Text style={{
              fontFamily: FONTS.heading, fontSize: 22, color: colors.text,
              textAlign: 'center', marginBottom: 8,
            }}>
              Thanks!
            </Text>

            <Text style={{
              fontFamily: FONTS.body, fontSize: 14, color: colors.textDim,
              textAlign: 'center', lineHeight: 20, marginBottom: 24,
            }}>
              Your feedback has been submitted successfully.
            </Text>

            <TouchableOpacity
              onPress={() => { setShowSuccess(false); router.back(); }}
              style={{
                width: '100%', borderRadius: 14, paddingVertical: 14,
                backgroundColor: '#10B981', alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 0.5 }}>
                GOT IT
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  responsiveContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    backgroundColor: colors.bg,
    ...(Platform.OS === "web" && SCREEN_WIDTH > 720
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
        }
      : {}),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },
  fieldWrap: {
    marginBottom: 20,
  },
  input: {
    fontFamily: FONTS.body,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    minHeight: 50,
  },
  textArea: {
    minHeight: 160,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
