import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { API_URL } from '../../utils/api';



const formatLabel = (value?: string | null) =>
  value
    ? value
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'N/A';

export default function ExerciseDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await axios.get(`${API_URL}/exercises/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setExercise(res.data);
      } catch (err) {
        console.error('Failed to fetch exercise detail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const shellWidth = Math.min(width - 20, 760);
  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 56;
  const headerHeight = Math.min(Math.max(width * 0.48, 188), 236) + topOffset;
  const gridCardWidth = (shellWidth - 10) / 2;
  const imageUri = exercise?.gif_url || exercise?.image_url || null;
  const steps = Array.isArray(exercise?.instruction_steps_en) ? exercise.instruction_steps_en : [];
  const secondaryMuscles = Array.isArray(exercise?.secondary_muscles) ? exercise.secondary_muscles : [];

  const muscleCards = [
    { key: 'target', label: 'Target Muscle', value: formatLabel(exercise?.target), tone: 'blue' as const },
    { key: 'focus', label: 'Focus Area', value: formatLabel(exercise?.body_part), tone: 'blue' as const },
    ...secondaryMuscles.map((muscle: string, index: number) => ({
      key: `secondary-${index}`,
      label: 'Secondary',
      value: formatLabel(muscle),
      tone: 'yellow' as const,
    })),
  ];
  const muscleRows = Array.from({ length: Math.ceil(muscleCards.length / 2) }, (_, index) =>
    muscleCards.slice(index * 2, index * 2 + 2)
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? colors.bg : P.offWhite }]}>
        <ActivityIndicator size="large" color={isDark ? colors.primary : P.cta} />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? colors.bg : P.offWhite }]}>
        <Ionicons name="alert-circle-outline" size={48} color={isDark ? colors.textMuted : P.muted} />
        <Text style={[styles.errorText, { color: isDark ? colors.text : P.ink }]}>Exercise not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backActionBtn, { backgroundColor: isDark ? colors.primary : P.cta }]} activeOpacity={0.88}>
          <Text style={styles.backActionBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? colors.bg : P.offWhite }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
      >
        <View style={[styles.hero, { height: headerHeight, paddingTop: topOffset, backgroundColor: isDark ? colors.card : P.cta, borderBottomWidth: isDark ? 1 : 0, borderBottomColor: isDark ? colors.border : 'transparent' }]}>
          <View style={[styles.heroInner, { width: shellWidth }]}>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={P.white} />
              <Text style={styles.backLinkText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.heroRow}>
              {imageUri ? (
                <TouchableOpacity
                  style={styles.heroMedia}
                  activeOpacity={0.92}
                  onPress={() => setPreviewVisible(true)}
                >
                  <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="contain" />
                </TouchableOpacity>
              ) : (
                <View style={styles.heroMedia}>
                  <View style={styles.heroFallback}>
                    <Ionicons name="barbell-outline" size={54} color={P.sun} />
                  </View>
                </View>
              )}

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle} numberOfLines={3}>
                  {exercise.name}
                </Text>

                {exercise.category ? (
                  <Text style={styles.heroMetaText} numberOfLines={1}>
                    {formatLabel(exercise.category)}
                  </Text>
                ) : null}

                {exercise.avg_rating !== undefined && exercise.avg_rating !== null ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={P.sun} />
                    <Text style={styles.ratingText}>{exercise.avg_rating}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.contentWrap, { width: shellWidth }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : P.ink }]}>Muscle Groups</Text>
            <View style={styles.grid}>
              {muscleRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {row.map((card) => (
                    <View
                      key={card.key}
                      style={[
                        styles.gridCard,
                        {
                          width: row.length === 1 ? shellWidth : gridCardWidth,
                          backgroundColor: isDark ? colors.card : (card.tone === 'blue' ? P.cta : P.sun),
                          borderWidth: isDark ? 1 : 0,
                          borderColor: isDark ? (card.tone === 'blue' ? 'rgba(37,150,190,0.18)' : 'rgba(231,177,0,0.22)') : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.gridLabel, { color: isDark ? (card.tone === 'blue' ? colors.primary : '#F7CB16') : (card.tone === 'blue' ? '#D6EEF7' : '#7A5B00') }]}>
                        {card.label}
                      </Text>
                      <Text style={[styles.gridValue, { color: isDark ? colors.text : (card.tone === 'blue' ? P.white : P.ink) }]}>
                        {card.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : P.ink, marginBottom: 0 }]}>Instructions</Text>
              <Text style={[styles.stepCount, { color: isDark ? colors.primary : P.ctaDeep }]}>{steps.length || 1} steps</Text>
            </View>

            <View style={[styles.instructionsCard, { backgroundColor: isDark ? colors.card : P.cta, borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent' }]}>
              {steps.length > 0 ? (
                steps.map((step: string, index: number) => (
                  <View key={`${step}-${index}`} style={[styles.stepRow, index === steps.length - 1 && styles.lastStepRow]}>
                    <View style={styles.stepNumber}>
                      <Text style={[styles.stepNumberText, { color: isDark ? P.ink : P.ctaDeep }]}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: isDark ? colors.textMuted : P.white }]}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.stepText, { color: isDark ? colors.textMuted : P.white }]}>
                  {exercise.instructions_en || 'Position yourself correctly and perform the movement with controlled form.'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setPreviewVisible(false)}
          />

          <TouchableOpacity
            style={styles.previewClose}
            activeOpacity={0.85}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={22} color={P.white} />
          </TouchableOpacity>

          {imageUri ? (
            <View style={styles.previewImageWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: P.offWhite,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: P.offWhite,
  },
  hero: {
    width: '100%',
    backgroundColor: P.cta,
    paddingBottom: 16,
  },
  heroInner: {
    alignSelf: 'center',
    paddingBottom: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backLinkText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: P.white,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroMedia: {
    width: '42%',
    height: '100%',
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
  },
  heroImage: {
    width: '100%',
    height: '88%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    lineHeight: 30,
    color: P.white,
    textTransform: 'capitalize',
  },
  heroMetaText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#D6EEF7',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  ratingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: P.sun,
  },
  contentWrap: {
    alignSelf: 'center',
    paddingHorizontal: 2,
    paddingTop: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: P.ink,
    marginBottom: 10,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCard: {
    minHeight: 92,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  gridCardBlue: {
    backgroundColor: P.cta,
  },
  gridCardYellow: {
    backgroundColor: P.sun,
  },
  gridLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridLabelBlue: {
    color: '#D6EEF7',
  },
  gridLabelYellow: {
    color: '#7A5B00',
  },
  gridValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  gridValueBlue: {
    color: P.white,
  },
  gridValueYellow: {
    color: P.ink,
  },
  stepCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: P.ctaDeep,
    textTransform: 'capitalize',
  },
  instructionsCard: {
    backgroundColor: P.cta,
    borderRadius: 22,
    padding: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  lastStepRow: {
    marginBottom: 0,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.sun,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: P.ctaDeep,
  },
  stepText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 21,
    color: P.white,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,21,24,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 56 : 26,
  },
  previewClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 22,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  previewImageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    color: P.ink,
    marginTop: 16,
    marginBottom: 24,
  },
  backActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: P.cta,
  },
  backActionBtnText: {
    fontFamily: FONTS.bodyBold,
    color: P.white,
    fontSize: 16,
  },
});
