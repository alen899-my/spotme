import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await axios.get(`${API_URL}/exercises/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
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

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Exercise not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: '#E00000' }]}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = exercise.instruction_steps_en || [];
  const secondaryMuscles = exercise.secondary_muscles || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Hero Section (GIF / Image) ─────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <View style={[styles.heroImageWrap, { backgroundColor: '#FFF' }]}>
            {exercise.gif_url ? (
              <Image
                source={{ uri: exercise.gif_url }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            ) : exercise.image_url ? (
              <Image
                source={{ uri: exercise.image_url }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.heroImage, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="barbell-outline" size={64} color={colors.textDim} />
              </View>
            )}
          </View>

          {/* Premium Overlays */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={StyleSheet.absoluteFillObject}
          />

          <TouchableOpacity
            style={[styles.floatingBack, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroLabelWrap}>
            <Text style={styles.heroBgLabel}>{exercise.category?.slice(0, 3).toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Content Section ─────────────────────────────────────────── */}
        <View style={[styles.contentWrap, { backgroundColor: colors.bg }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
            <View style={styles.badgeRow}>
              <LinearGradient 
                colors={['#E00000', '#B00000']} 
                style={styles.badge}
                start={{x:0, y:0}} end={{x:1, y:1}}
              >
                <Text style={styles.badgeText}>{exercise.category}</Text>
              </LinearGradient>
              <View style={[styles.badge, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>{exercise.equipment || 'Bodyweight'}</Text>
              </View>
              {exercise.avg_rating !== undefined && exercise.avg_rating !== null && (
                <View style={[styles.badge, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Ionicons name="star" size={12} color="#D97706" />
                  <Text style={[styles.badgeText, { color: '#B45309' }]}>{exercise.avg_rating} AVG</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Grid (Uber Style) */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(224,0,0,0.1)' }]}>
                <MaterialCommunityIcons name="arm-flex" size={20} color="#E00000" />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Target Muscle</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{exercise.target || 'N/A'}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                <MaterialCommunityIcons name="human-handsup" size={20} color="#007AFF" />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Focus Area</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{exercise.body_part || 'N/A'}</Text>
            </View>
          </View>

          {/* Secondary Muscles */}
          {secondaryMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Secondary Muscles</Text>
              <View style={styles.muscleTags}>
                {secondaryMuscles.map((muscle: string, index: number) => (
                  <View key={index} style={[styles.muscleTag, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.muscleTagText, { color: colors.text }]}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Instructions</Text>
              <View style={[styles.stepBadge, { backgroundColor: 'rgba(224,0,0,0.1)' }]}>
                <Text style={styles.stepBadgeText}>{steps.length || 1} STEPS</Text>
              </View>
            </View>
            
            <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {steps.length > 0 ? (
                steps.map((step: string, index: number) => (
                  <View key={index} style={[styles.stepRow, index === steps.length - 1 && { marginBottom: 0 }]}>
                    <View style={[styles.stepNumber, { backgroundColor: '#E00000' }]}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.stepText, { color: colors.text }]}>
                  {exercise.instructions_en || 'Position yourself correctly and perform the movement with controlled form.'}
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.mainActionBtn} activeOpacity={0.9}>
          <LinearGradient
            colors={['#E00000', '#B00000']}
            style={styles.actionGradient}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.actionText}>ADD TO WORKOUT</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  heroContainer: {
    width: '100%',
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  heroImageWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '90%',
    height: '90%',
  },
  floatingBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroLabelWrap: {
    position: 'absolute',
    right: -20,
    top: 60,
    zIndex: 1,
  },
  heroBgLabel: {
    fontSize: 120,
    fontFamily: FONTS.heading,
    color: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '90deg' }],
  },
  contentWrap: {
    padding: 24,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40,
    zIndex: 2,
    minHeight: 500,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
    opacity: 0.5,
  },
  headerRow: {
    marginBottom: 28,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#E00000',
    letterSpacing: 1,
  },
  instructionsCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  muscleTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  muscleTagText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
  },
  stepText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'transparent',
  },
  mainActionBtn: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#E00000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
    fontSize: 16,
  },
});
