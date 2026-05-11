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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

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
        const res = await axios.get(`${API_URL}/exercises/${id}`);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = exercise.instruction_steps_en || [];
  const secondaryMuscles = exercise.secondary_muscles || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero Section (Video/GIF) ─────────────────────────────────── */}
        <View style={styles.heroContainer}>
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

          {/* Overlays */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.05)']}
            style={StyleSheet.absoluteFillObject}
          />

          <TouchableOpacity
            style={[styles.floatingBack, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Content Section ─────────────────────────────────────────── */}
        <View style={styles.contentWrap}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: '#E00000' }]}>
                  <Text style={styles.badgeText}>{exercise.category}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.badgeText, { color: colors.textMuted }]}>{exercise.equipment || 'Bodyweight'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="body-outline" size={20} color="#E00000" />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Target</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{exercise.target || 'N/A'}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="layers-outline" size={20} color="#E00000" />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Body Part</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{exercise.body_part || 'N/A'}</Text>
            </View>
          </View>

          {/* Secondary Muscles */}
          {secondaryMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Secondary Muscles</Text>
              <View style={styles.muscleTags}>
                {secondaryMuscles.map((muscle: string, index: number) => (
                  <View key={index} style={[styles.muscleTag, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.muscleTagText, { color: colors.text }]}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How to Perform</Text>
            {steps.length > 0 ? (
              steps.map((step: string, index: number) => (
                <View key={index} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: '#E00000' }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.stepText, { color: colors.textDim }]}>
                {exercise.instructions_en || 'No instructions available.'}
              </Text>
            )}
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
    height: SCREEN_WIDTH * 0.85,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBack: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  contentWrap: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: 'inherit', // Handled by container
  },
  headerRow: {
    marginBottom: 20,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    marginBottom: 16,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  muscleTagText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
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
    lineHeight: 22,
  },
  errorText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#E00000',
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
