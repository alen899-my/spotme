import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type LogMealPayload = {
  imageUri: string | null;
  ingredients: { name: string; quantity: string }[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: LogMealPayload) => void;
  uploading?: boolean;
  initialImageUri?: string | null;
  initialIngredients?: { name: string; quantity: string }[];
};

const SOURCE_OPTIONS = [
  {
    id: 'camera',
    icon: 'camera' as const,
    label: 'Take a Photo',
    sub: 'Use your camera to capture the meal',
    gradient: ['#1a6e8a', '#2596BE'] as [string, string],
    glow: '#2596BE40',
  },
  {
    id: 'gallery',
    icon: 'images' as const,
    label: 'Choose from Gallery',
    sub: 'Pick an existing photo',
    gradient: ['#065f46', '#10B981'] as [string, string],
    glow: '#10B98140',
  },
  {
    id: 'manual',
    icon: 'pencil' as const,
    label: 'Enter Manually',
    sub: 'Type ingredients and quantities',
    gradient: ['#6d28d9', '#8B5CF6'] as [string, string],
    glow: '#8B5CF640',
  },
];

export default function LogMealSheet({
  visible,
  onClose,
  onSubmit,
  uploading,
  initialImageUri,
  initialIngredients,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
  
  const reset = useCallback(() => {
    setStep(0);
    setImageUri(null);
    setIngredients([{ name: '', quantity: '' }]);
  }, []);

  useEffect(() => {
    if (visible) {
      if (initialImageUri || (initialIngredients && initialIngredients.length > 0)) {
        setImageUri(initialImageUri || null);
        setIngredients(initialIngredients && initialIngredients.length > 0 ? initialIngredients : [{ name: '', quantity: '' }]);
        setStep(1);
      } else {
        reset();
      }
    }
  }, [visible, initialImageUri, initialIngredients, reset]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const goToStep1 = useCallback((uri: string | null = null) => {
    if (uri) setImageUri(uri);
    setStep(1);
  }, []);

  const goBack = useCallback(() => {
    setStep(0);
    setImageUri(null);
  }, []);

  const handleSourceSelect = useCallback(async (id: string) => {
    if (id === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.88,
      });
      if (!result.canceled) {
        goToStep1(result.assets[0].uri);
      }
    } else if (id === 'gallery') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.88,
      });
      if (!result.canceled) {
        goToStep1(result.assets[0].uri);
      }
    } else {
      // Manual — no image required
      goToStep1(null);
    }
  }, [goToStep1]);

  const handleSubmit = useCallback(() => {
    const filled = ingredients.filter(i => i.name.trim());
    onSubmit({ imageUri, ingredients: filled });
    reset();
    onClose();
  }, [imageUri, ingredients, onSubmit, reset, onClose]);

  const addIngredient = () =>
    setIngredients(prev => [...prev, { name: '', quantity: '' }]);

  const updateIngredient = (index: number, field: 'name' | 'quantity', value: string) =>
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));

  const removeIngredient = (index: number) =>
    setIngredients(prev => prev.length === 1 ? [{ name: '', quantity: '' }] : prev.filter((_, i) => i !== index));

  const canSubmit = !!(imageUri || ingredients.some(i => i.name.trim()));

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
              }
            ]}
          >

            {/* Handle bar */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
            </View>

            {/* ── Step 0: Source Picker ── */}
            {step === 0 && (
              <View style={styles.stepWrap}>
                {/* Header */}
                <View style={styles.stepHeader}>
                  <View>
                    <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#04282B' }]}>Log a Meal</Text>
                    <Text style={[styles.stepSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                      How would you like to log it?
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.65}>
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                </View>

                {/* Source cards */}
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
              </View>
            )}

            {/* ── Step 1: Preview + Ingredients ── */}
            {step === 1 && (
              <View style={[styles.stepWrap, { flex: 1 }]}>
                {/* Header */}
                <View style={styles.stepHeader}>
                  <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} activeOpacity={0.65}>
                    <Ionicons name="arrow-back" size={18} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#04282B' }]}>Review & Log</Text>
                    <Text style={[styles.stepSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                      {imageUri ? 'AI will analyze your photo' : 'Describe your meal ingredients'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.65}>
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#222'} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.formScroll}
                  keyboardShouldPersistTaps="handled"
                >

                  {/* Image preview */}
                  {imageUri ? (
                    <View style={styles.previewWrap}>
                      <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.previewOverlay} />
                      <TouchableOpacity
                        onPress={() => setImageUri(null)}
                        style={styles.removeImageBtn}
                        activeOpacity={0.65}
                      >
                        <Ionicons name="close-circle" size={22} color="#FFF" />
                      </TouchableOpacity>
                     
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addPhotoBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(37,150,190,0.25)', backgroundColor: isDark ? 'rgba(37,150,190,0.06)' : 'rgba(37,150,190,0.04)' }]}
                      onPress={() => handleSourceSelect('gallery')}
                      activeOpacity={0.68}
                    >
                      <Ionicons name="camera-outline" size={30} color="#2596BE" />
                      <Text style={styles.addPhotoText}>Add a photo (optional)</Text>
                    </TouchableOpacity>
                  )}

                  {/* Ingredients section */}
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
                      INGREDIENTS
                    </Text>
                    <TouchableOpacity onPress={addIngredient} style={styles.addIngBtn} activeOpacity={0.68}>
                      <Ionicons name="add" size={15} color="#2596BE" />
                      <Text style={styles.addIngText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {ingredients.map((ing, idx) => (
                    <View key={`ing-${idx}`} style={styles.ingRow}>
                      <TextInput
                        style={[styles.ingInput, styles.ingNameInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', color: isDark ? '#fff' : '#1A1A1A', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}
                        placeholder="e.g. Grilled chicken"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : '#94A3B8'}
                        value={ing.name}
                        onChangeText={v => updateIngredient(idx, 'name', v)}
                      />
                      <TextInput
                        style={[styles.ingInput, styles.ingQtyInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', color: isDark ? '#fff' : '#1A1A1A', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}
                        placeholder="100g"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : '#94A3B8'}
                        value={ing.quantity}
                        onChangeText={v => updateIngredient(idx, 'quantity', v)}
                      />
                      <TouchableOpacity
                        onPress={() => removeIngredient(idx)}
                        style={[styles.ingRemoveBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={16} color={isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8'} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={{ height: 24 }} />
                </ScrollView>

                {/* CTA Button */}
                <View style={[styles.ctaBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0' }]}>
                  <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || uploading}
                    activeOpacity={0.72}
                  >
                    <LinearGradient
                      colors={canSubmit ? ['#1a6e8a', '#2596BE'] : ['#455A64', '#546E7A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitBtnGrad}
                    >
                      {uploading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name={imageUri ? 'sparkles' : 'checkmark-circle'} size={20} color="#FFF" />
                          <Text style={styles.submitBtnText}>
                            {imageUri ? 'Analyze & Log Meal' : 'Log Meal'}
                          </Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    maxHeight: SCREEN_HEIGHT * 0.88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 24,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  stepWrap: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  stepTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  stepSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Source picker
  sourceList: {
    gap: 10,
    paddingBottom: 20,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sourceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceText: {
    flex: 1,
  },
  sourceLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  sourceSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2,
  },
  // Step 1 form
  formScroll: {
    paddingBottom: 12,
  },
  previewWrap: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  previewBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  previewBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  addPhotoBox: {
    height: 100,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  addPhotoText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#2596BE',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(37,150,190,0.1)',
  },
  addIngText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#2596BE',
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ingInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  ingNameInput: {
    flex: 1,
  },
  ingQtyInput: {
    width: 84,
  },
  ingRemoveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CTA
  ctaBar: {
    paddingTop: 12,
    paddingHorizontal: 0,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  submitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0.4,
  },
});
