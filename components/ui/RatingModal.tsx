import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentRating?: number | null;
  onRate: (rating: number) => Promise<void>;
  colors: any;
  isDark: boolean;
  insets: { bottom: number };
  title?: string;
  subtitle?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING = 24;
const GRID_GAP = 7;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GRID_GAP * 4) / 5;

const RATING_ICONS: string[] = [
  "sad-outline",
  "thumbs-down-outline",
  "remove-outline",
  "ellipse-outline",
  "checkmark-outline",
  "happy-outline",
  "barbell-outline",
  "flash-outline",
  "flame-outline",
  "trophy-outline",
];

const LABELS = [
  "Terrible",
  "Very Bad",
  "Okayish",
  "Decent",
  "Good",
  "Very Good",
  "Strong Lift",
  "Amazing",
  "Beast Mode",
  "Legendary!",
];

const getColor = (num: number) => {
  if (num <= 3) return "#EF4444";
  if (num <= 5) return "#F59E0B";
  if (num <= 7) return "#3B82F6";
  return "#10B981";
};

export default function RatingModal({
  visible,
  onClose,
  currentRating,
  onRate,
  colors,
  isDark,
  insets,
  title = "Rate this program",
  subtitle = "How was your experience?",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [tempRating, setTempRating] = useState<number | null>(currentRating ?? null);

  React.useEffect(() => {
    if (visible) {
      setTempRating(currentRating ?? null);
      setSaving(false);
    }
  }, [visible, currentRating]);

  const handleRate = useCallback(
    async (num: number) => {
      if (saving) return;
      setTempRating(num);
      setSaving(true);
      try {
        await onRate(num);
        setSaving(false);
        onClose();
      } catch {
        setSaving(false);
      }
    },
    [onRate, saving, onClose]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : colors.bg, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHandle} />

          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.modalSub, { color: colors.textMuted }]}>{subtitle}</Text>

          <View style={styles.gridOuter}>
            <View style={styles.gridInner}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const selected = tempRating === num;
                const cardColor = getColor(num);
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.card,
                      selected
                        ? { backgroundColor: cardColor, borderColor: cardColor }
                        : { backgroundColor: isDark ? colors.inputBg : '#F5F5F5', borderColor: colors.border },
                    ]}
                    onPress={() => handleRate(num)}
                    activeOpacity={0.7}
                    disabled={saving}
                  >
                    <Ionicons
                      name={RATING_ICONS[num - 1] as any}
                      size={18}
                      color={selected ? (isDark ? '#000' : '#FFF') : (isDark ? colors.primary : '#666')}
                    />
                    <Text style={[styles.cardNum, { color: selected ? (isDark ? '#000' : '#FFF') : (isDark ? colors.text : '#333') }]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {tempRating ? (
            <Text style={[styles.label, { color: getColor(tempRating) }]}>
              {LABELS[tempRating - 1]}
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Tap a rating above
            </Text>
          )}

          {saving && (
            <View style={styles.savingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.savingText, { color: colors.textMuted }]}>Saving...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: isDark ? colors.inputBg : '#F0F0F0' }]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: PADDING,
    paddingTop: 12,
  },
  modalHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    textAlign: "center",
  },
  modalSub: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  gridOuter: {
    alignItems: "center",
  },
  gridInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "center",
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  cardNum: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  savingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  savingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
});
