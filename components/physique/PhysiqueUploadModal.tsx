import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  // Upload mode
  onSubmit?: (imageUri: string) => void;
  uploading?: boolean;
  usedToday?: number;
  dailyLimit?: number;
  // Delete mode
  mode?: 'upload' | 'delete';
  onConfirmDelete?: () => void;
  deleteItem?: { photo_url?: string; overall_score?: number; created_at?: string } | null;
};

const SOURCE_OPTIONS = [
  {
    id: 'camera',
    icon: 'camera' as const,
    label: 'Take a Photo',
    sub: 'Use your camera to capture your physique',
    gradient: ['#1a6e8a', '#2596BE'] as [string, string],
  },
  {
    id: 'gallery',
    icon: 'images' as const,
    label: 'Choose from Gallery',
    sub: 'Pick an existing photo',
    gradient: ['#065f46', '#10B981'] as [string, string],
  },
];

export default function PhysiqueUploadModal({
  visible,
  onClose,
  onSubmit,
  uploading,
  usedToday = 0,
  dailyLimit = 5,
  mode = 'upload',
  onConfirmDelete,
  deleteItem,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limitReached = usedToday >= dailyLimit;

  const reset = useCallback(() => {
    setStep(0);
    setImageUri(null);
    setDeleting(false);
  }, []);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await onConfirmDelete?.();
    } finally {
      setDeleting(false);
      onClose();
    }
  }, [onConfirmDelete, onClose]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSourceSelect = useCallback(async (id: string) => {
    if (id === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.88,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setStep(1);
      }
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.88,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setStep(1);
      }
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!imageUri) return;
    onSubmit?.(imageUri);
  }, [imageUri, onSubmit]);

  // ── Delete confirmation sheet ──────────────────────────────────────────────
  if (mode === 'delete') {
    const dateStr = deleteItem?.created_at
      ? new Date(deleteItem.created_at).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
      : '';
    const score = deleteItem?.overall_score ?? null;
    const scoreColor =
      score === null ? '#90A4AE'
      : score >= 70 ? '#10B981'
      : score >= 50 ? '#F59E0B'
      : '#EF4444';

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: isDark ? '#111' : '#FAFAFA', paddingBottom: insets.bottom + 8, flex: 0 },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
            </View>

            <View style={styles.stepWrap}>
              {/* Header */}
              <View style={styles.stepHeader}>
                <View
                  style={[
                    styles.deleteIconBox,
                    { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' },
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#04282B' }]}>
                    Delete Analysis
                  </Text>
                  <Text style={[styles.stepSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                    This action cannot be undone
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                  activeOpacity={0.65}
                >
                  <Ionicons name="close" size={20} color={isDark ? '#fff' : '#222'} />
                </TouchableOpacity>
              </View>

              {/* Preview card */}
              <View
                style={[
                  styles.deletePreviewCard,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
                ]}
              >
                {deleteItem?.photo_url ? (
                  <Image source={{ uri: deleteItem.photo_url }} style={styles.deleteThumb} />
                ) : (
                  <View style={[styles.deleteThumbPlaceholder, { backgroundColor: isDark ? '#2A2A2A' : '#EEF2F6' }]}>
                    <Ionicons name="person-outline" size={20} color={isDark ? 'rgba(255,255,255,0.3)' : '#B0BEC5'} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
                  {dateStr ? (
                    <Text style={[styles.deleteDate, { color: isDark ? 'rgba(255,255,255,0.5)' : '#90A4AE' }]}>
                      {dateStr}
                    </Text>
                  ) : null}
                  {score !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.deleteScore, { color: scoreColor }]}>{score}</Text>
                      <Text style={[styles.deleteScoreLabel, { color: scoreColor }]}>/100 score</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Warning */}
              <View
                style={[
                  styles.deleteWarning,
                  { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)', borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)' },
                ]}
              >
                <Ionicons name="warning-outline" size={15} color="#EF4444" />
                <Text style={[styles.deleteWarningText, { color: isDark ? 'rgba(255,255,255,0.65)' : '#607D8B' }]}>
                  Your physique photo and AI analysis data will be permanently removed.
                </Text>
              </View>

              {/* Action buttons */}
              <View style={[styles.ctaBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0' }]}>
                <View style={styles.deleteActions}>
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: isDark ? 'rgba(255,255,255,0.7)' : '#607D8B' }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteConfirmBtn, deleting && { opacity: 0.6 }]}
                    onPress={handleConfirmDelete}
                    disabled={deleting}
                    activeOpacity={0.75}
                  >
                    <LinearGradient
                      colors={['#b91c1c', '#EF4444']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.deleteConfirmGrad}
                    >
                      {deleting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={18} color="#FFF" />
                          <Text style={styles.deleteConfirmText}>Delete Analysis</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Upload sheet ────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#111' : '#FAFAFA',
                paddingBottom: insets.bottom + 8,
                flex: step === 0 ? 0 : 1,
              },
            ]}
          >
            {/* Handle bar */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
            </View>

            {/* ── Step 0: Source picker ── */}
            {step === 0 && (
              <View style={styles.stepWrap}>
                <View style={styles.stepHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#04282B' }]}>
                      Physique Analysis
                    </Text>
                    <Text style={[styles.stepSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                      Upload a clear photo for best results
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                    activeOpacity={0.65}
                  >
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                </View>

             
                {limitReached ? (
                  <View style={styles.limitBlock}>
                    <Ionicons name="lock-closed-outline" size={40} color="rgba(239,68,68,0.5)" />
                    <Text style={[styles.limitBlockTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                      Come back tomorrow
                    </Text>
                    <Text style={[styles.limitBlockSub, { color: isDark ? 'rgba(255,255,255,0.5)' : '#78909C' }]}>
                      You've used all {dailyLimit} daily analyses. Your limit resets at midnight.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.sourceList}>
                    {SOURCE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.68}
                        onPress={() => handleSourceSelect(opt.id)}
                        style={[styles.sourceCard, { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}
                      >
                        <LinearGradient
                          colors={opt.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.sourceIconBox}
                        >
                          <Ionicons name={opt.icon} size={24} color="#FFF" />
                        </LinearGradient>
                        <View style={styles.sourceText}>
                          <Text style={[styles.sourceLabel, { color: isDark ? '#fff' : '#1A1A1A' }]}>{opt.label}</Text>
                          <Text style={[styles.sourceSub, { color: isDark ? 'rgba(255,255,255,0.48)' : '#78909C' }]}>{opt.sub}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.28)' : '#B0BEC5'} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {!limitReached && (
                  <View style={[styles.tipsBox, { backgroundColor: isDark ? 'rgba(37,150,190,0.06)' : 'rgba(37,150,190,0.05)', borderColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.2)' }]}>
                    <Text style={[styles.tipItem, { color: isDark ? 'rgba(255,255,255,0.6)' : '#607D8B' }]}>• Stand in good lighting, facing the camera</Text>
                    <Text style={[styles.tipItem, { color: isDark ? 'rgba(255,255,255,0.6)' : '#607D8B' }]}>• Wear form-fitting clothing</Text>
                    <Text style={[styles.tipItem, { color: isDark ? 'rgba(255,255,255,0.6)' : '#607D8B' }]}>• Include full body from head to toe</Text>
                  </View>
                )}

                <View style={{ height: 20 }} />
              </View>
            )}

            {/* ── Step 1: Preview + Confirm ── */}
            {step === 1 && imageUri && (
              <View style={[styles.stepWrap, { flex: 1 }]}>
                <View style={styles.stepHeader}>
                  <TouchableOpacity
                    onPress={() => { setStep(0); setImageUri(null); }}
                    style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                    activeOpacity={0.65}
                  >
                    <Ionicons name="arrow-back" size={18} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#04282B' }]}>Ready to Analyze</Text>
                    <Text style={[styles.stepSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                      AI will score your physique in seconds
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                    activeOpacity={0.65}
                  >
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                </View>

                {/* Photo preview */}
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.previewOverlay} />
                <View style={styles.previewBadge}>
                    <Ionicons name="scan-outline" size={14} color="#2596BE" />
                    <Text style={styles.previewBadgeText}>Ready for AI Analysis</Text>
                  </View>
                </View>

                <View style={[styles.analyzeInfoBox, { backgroundColor: isDark ? 'rgba(37,150,190,0.08)' : 'rgba(37,150,190,0.06)', borderColor: isDark ? 'rgba(37,150,190,0.2)' : 'rgba(37,150,190,0.25)' }]}>
                  <Text style={[styles.analyzeInfoText, { color: isDark ? 'rgba(255,255,255,0.65)' : '#607D8B' }]}>
                    Our AI coach will analyze your physique score, muscle symmetry, posture, strengths, and personalized recommendations.
                  </Text>
                </View>

                {/* CTA */}
                <View style={[styles.ctaBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0' }]}>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    disabled={uploading}
                    activeOpacity={0.72}
                  >
                    <LinearGradient
                      colors={['#1a6e8a', '#2596BE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitBtnGrad}
                    >
                      {uploading ? (
                        <>
                          <ActivityIndicator color="#FFF" size="small" />
                          <Text style={styles.submitBtnText}>Analyzing Physique...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={20} color="#FFF" />
                          <Text style={styles.submitBtnText}>Analyze My Physique</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  stepWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  stepTitle: { fontFamily: FONTS.heading, fontSize: 22, letterSpacing: -0.3 },
  stepSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  limitBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 16,
  },
  limitText: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  limitBlock: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  limitBlockTitle: { fontFamily: FONTS.heading, fontSize: 22, letterSpacing: -0.3 },
  limitBlockSub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  sourceList: { gap: 10, paddingBottom: 16 },
  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, borderWidth: 1, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sourceIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sourceText: { flex: 1 },
  sourceLabel: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  sourceSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  tipsBox: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 5, marginBottom: 4 },
  tipsTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 4 },
  tipItem: { fontFamily: FONTS.body, fontSize: 12 },
  previewWrap: {
    width: '100%', height: 280, borderRadius: 20, overflow: 'hidden',
    marginBottom: 14, position: 'relative', backgroundColor: '#000',
  },
  previewImage: { width: '100%', height: '100%' },
  previewOverlay: { ...StyleSheet.absoluteFillObject },
  previewBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(37,150,190,0.4)',
  },
  previewBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: '#2596BE' },
  analyzeInfoBox: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  analyzeInfoText: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 18 },
  ctaBar: { paddingTop: 12, borderTopWidth: 1 },
  submitBtn: { borderRadius: 20, overflow: 'hidden' },
  submitBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  submitBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 0.4 },

  // ── Delete mode styles ──────────────────────────────────────────────────────
  deleteIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deletePreviewCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14,
  },
  deleteThumb: { width: 54, height: 54, borderRadius: 12 },
  deleteThumbPlaceholder: {
    width: 54, height: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  deleteDate: { fontFamily: FONTS.body, fontSize: 12 },
  deleteScore: { fontFamily: FONTS.heading, fontSize: 26, letterSpacing: -1 },
  deleteScoreLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  deleteWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 4,
  },
  deleteWarningText: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 18, flex: 1 },
  deleteActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  deleteConfirmBtn: { flex: 2, borderRadius: 20, overflow: 'hidden' },
  deleteConfirmGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  deleteConfirmText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 0.3 },
});
