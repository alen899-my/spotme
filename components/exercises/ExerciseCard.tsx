import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../ui/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';

type CardVariant = 'browse' | 'add' | 'session' | 'compact';

interface SessionData {
  sets?: number;
  reps?: string;
  weight?: string | number;
  rest_time?: string;
}

interface ExerciseCardProps {
  exercise: any;
  variant?: CardVariant;
  isFocused?: boolean;
  onPress?: (exercise: any) => void;
  onAdd?: (exercise: any) => void;
  onEdit?: (exercise: any) => void;
  onDelete?: (exercise: any) => void;
  onPreview?: (exercise: any) => void;
  sessionData?: SessionData;
  addingId?: string | null;
  isShared?: boolean;
}

const formatLabel = (value?: string | null) =>
  (value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getExerciseDescription = (item: any) => {
  const raw = typeof item?.instructions_en === 'string'
    ? item.instructions_en.replace(/\s+/g, ' ').trim()
    : '';
  if (!raw) return '';
  const firstSentence = raw.match(/.*?[.!?](\s|$)/)?.[0]?.trim() || raw;
  return firstSentence.length > 118
    ? `${firstSentence.slice(0, 115).trim()}...`
    : firstSentence;
};

const ACCENTS: Record<string, { gradient: [string, string]; glow: string }> = {
  back: { gradient: [P.ctaDeep, P.ctaDark], glow: 'rgba(247,203,22,0.18)' },
  chest: { gradient: [P.cta, P.ctaDark], glow: 'rgba(255,255,255,0.10)' },
  waist: { gradient: [P.ctaDark, P.ctaDeep], glow: 'rgba(247,203,22,0.14)' },
  'upper legs': { gradient: [P.cta, P.ctaDeep], glow: 'rgba(247,203,22,0.16)' },
  'lower legs': { gradient: [P.ctaDark, P.cta], glow: 'rgba(255,255,255,0.10)' },
  shoulders: { gradient: [P.ctaDeep, P.cta], glow: 'rgba(247,203,22,0.20)' },
  'upper arms': { gradient: [P.ctaDark, P.ctaDeep], glow: 'rgba(255,255,255,0.10)' },
  'lower arms': { gradient: [P.cta, P.ctaDark], glow: 'rgba(247,203,22,0.14)' },
  neck: { gradient: [P.ctaDeep, P.ctaDark], glow: 'rgba(247,203,22,0.16)' },
  cardio: { gradient: [P.cta, P.ctaDeep], glow: 'rgba(255,255,255,0.08)' },
};

const accentFor = (category?: string | null) =>
  ACCENTS[category?.toLowerCase() ?? ''] ?? { gradient: [P.cta, P.ctaDark] as [string, string], glow: 'rgba(247,203,22,0.14)' };

function CardMedia({ uri, gifUri, isFocused, style, fallbackStyle, fallbackIcon, error, onError }: any) {
  const gifOpacity = useRef(new Animated.Value(0)).current;
  const [gifLoaded, setGifLoaded] = useState(false);

  useEffect(() => {
    if (isFocused && gifUri && gifLoaded) {
      Animated.timing(gifOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else if (!isFocused) {
      gifOpacity.setValue(0);
    }
  }, [isFocused, gifUri, gifLoaded]);

  if (error) {
    return <View style={[style, fallbackStyle]}>{fallbackIcon}</View>;
  }

  return (
    <View style={style}>
      {/* Static image always rendered as base */}
      {uri && (
        <OptimizedImage
          uri={uri}
          style={[StyleSheet.absoluteFill, { borderRadius: style.borderRadius || 0 }]}
          onError={onError}
        />
      )}
      {/* GIF overlaid on top when focused */}
      {isFocused && gifUri && (
        <Animated.Image
          source={{ uri: gifUri }}
          style={[StyleSheet.absoluteFill, { borderRadius: style.borderRadius || 0, opacity: gifOpacity }]}
          onLoad={() => {
            setGifLoaded(true);
            Animated.timing(gifOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
          }}
          onError={onError}
        />
      )}
    </View>
  );
}

function ExerciseCard({
  exercise,
  variant = 'browse',
  isFocused = false,
  onPress,
  onAdd,
  onEdit,
  onDelete,
  onPreview,
  sessionData,
  addingId,
  isShared,
}: ExerciseCardProps) {
  const { colors, isDark } = useTheme();
  const [imgError, setImgError] = useState(false);
  const theme = accentFor(exercise.category);

  const staticUri = exercise.image_url || exercise.gif_url;
  const gifUri = exercise.gif_url;

  if (variant === 'add') {
    return (
      <TouchableOpacity
        style={[styles.addCard, { backgroundColor: isDark ? '#000000' : P.cta }]}
        activeOpacity={0.7}
        onPress={() => onPress?.(exercise)}
      >
        <CardMedia
          uri={staticUri}
          gifUri={gifUri}
          isFocused={isFocused}
          style={styles.addImage}
          fallbackStyle={styles.addImageFallback}
          fallbackIcon={<Ionicons name="barbell-outline" size={28} color="#999" />}
          error={imgError}
          onError={() => setImgError(true)}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.addName} numberOfLines={1}>
              {exercise.name}
            </Text>
            {exercise.avg_rating !== undefined && exercise.avg_rating !== null && (
              <View style={styles.addRatingBadge}>
                <Ionicons name="star" size={10} color={P.sun} />
                <Text style={styles.addRatingText}>{exercise.avg_rating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.addMeta} numberOfLines={1}>
            {[exercise.target, exercise.equipment].filter(Boolean).join(' • ')}
          </Text>
        </View>
        {onAdd && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onAdd(exercise)}
            disabled={addingId === exercise.id}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: isDark ? '#000000' : P.cta }]}
        activeOpacity={0.7}
        onPress={() => onPress?.(exercise)}
      >
        <CardMedia
          uri={staticUri}
          gifUri={gifUri}
          isFocused={isFocused}
          style={styles.compactImage}
          fallbackStyle={styles.compactImageFallback}
          fallbackIcon={<Ionicons name="barbell-outline" size={18} color="#999" />}
          error={imgError}
          onError={() => setImgError(true)}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.compactName} numberOfLines={1}>{exercise.name}</Text>
            {exercise.avg_rating !== undefined && exercise.avg_rating !== null && (
              <View style={styles.compactRatingBadge}>
                <Ionicons name="star" size={9} color={P.sun} />
                <Text style={styles.compactRatingText}>{exercise.avg_rating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.compactMeta} numberOfLines={1}>
            {[exercise.target, exercise.equipment].filter(Boolean).join(' • ')}
          </Text>
        </View>
        {onAdd && (
          <TouchableOpacity
            style={styles.compactAddBtn}
            onPress={() => onAdd(exercise)}
            disabled={addingId === exercise.id}
          >
            <Ionicons name="add-circle" size={26} color={isDark ? colors.primary : P.cta} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'session') {
    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          isDark
            ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
            : { backgroundColor: P.cta, borderColor: P.cta, borderWidth: 1 },
        ]}
        activeOpacity={0.8}
        onPress={() => onPress?.(exercise)}
      >
        <View style={styles.sessionInfoRow}>
          <CardMedia
            uri={staticUri}
            gifUri={gifUri}
            isFocused={isFocused}
            style={styles.sessionImage}
            fallbackStyle={styles.sessionImageFallback}
            fallbackIcon={<Ionicons name="barbell-outline" size={32} color="#999" />}
            error={imgError}
            onError={() => setImgError(true)}
          />
          <View style={styles.sessionTextBlock}>
            <View style={styles.sessionTopRow}>
              <Text style={[styles.sessionName, { color: isDark ? colors.text : '#FFF' }]} numberOfLines={1}>
                {exercise.name}
              </Text>
              {exercise.avg_rating !== undefined && exercise.avg_rating !== null && (
                <View style={styles.sessionRatingBadge}>
                  <Ionicons name="star" size={10} color={P.sun} />
                  <Text style={styles.sessionRatingText}>{exercise.avg_rating}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sessionMeta, { color: isDark ? colors.text : P.ink, backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.88)' }]}>
              {exercise.target} • {exercise.equipment}
            </Text>
          </View>
        </View>

        <View style={styles.sessionControls}>
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>SETS</Text>
            <Text style={styles.controlValue}>{sessionData?.sets || exercise.sets || 3}</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>REPS</Text>
            <Text style={styles.controlValue}>{sessionData?.reps || exercise.reps || '8-12'}</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>WEIGHT</Text>
            <Text style={styles.controlValue}>{sessionData?.weight || exercise.weight || 0}kg</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>REST</Text>
            <Text style={styles.controlValue}>{sessionData?.rest_time || exercise.rest_time || '60s'}</Text>
          </View>
        </View>

        {!isShared && (onEdit || onDelete) && (
          <View style={styles.sessionActions}>
            {onEdit && (
              <TouchableOpacity
                style={[styles.sessionActionBtn, { backgroundColor: isDark ? `${colors.primary}15` : 'rgba(255,255,255,0.15)', borderColor: isDark ? `${colors.primary}30` : 'rgba(255,255,255,0.3)' }]}
                onPress={() => onEdit(exercise)}
              >
                <Ionicons name="create-outline" size={18} color={isDark ? colors.primary : '#FFF'} />
                <Text style={[styles.sessionActionText, { color: isDark ? colors.primary : '#FFF' }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.sessionActionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)', borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.18)' }]}
                onPress={() => onDelete(exercise)}
              >
                <Ionicons name="trash-outline" size={18} color={isDark ? '#EF4444' : '#FFF'} />
                <Text style={[styles.sessionActionText, { color: isDark ? '#EF4444' : '#FFF' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const description = getExerciseDescription(exercise);
  const tagItems = [exercise.target, exercise.equipment]
    .filter(Boolean)
    .map((value) => formatLabel(value));

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onPress?.(exercise)}
      style={[
        styles.browseCard,
        {
          backgroundColor: isDark ? colors.bg : P.cta,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.border : 'transparent',
        },
      ]}
    >
      <View style={styles.browsePillRow}>
        {exercise.category ? (
          <View style={[styles.browseScorePill, { backgroundColor: isDark ? colors.inputBg : P.ctaDark, borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent' }]}>
            <Ionicons name="fitness-outline" size={11} color={P.sun} />
            <Text style={[styles.browseScorePillText, { color: isDark ? colors.primary : '#D6EEF7' }]}>{formatLabel(exercise.category)}</Text>
          </View>
        ) : <View />}

        {exercise.avg_rating !== undefined && exercise.avg_rating !== null && (
          <View style={[styles.browseRatingPill, { backgroundColor: isDark ? colors.inputBg : P.ctaDark, borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent' }]}>
            <Ionicons name="star" size={11} color={P.sun} />
            <Text style={[styles.browseRatingPillText, { color: P.sun }]}>{exercise.avg_rating}</Text>
          </View>
        )}
      </View>

      <View style={styles.browseBodyRow}>
        <View style={styles.browseTextBlock}>
          <Text style={[styles.browseName, { color: isDark ? colors.text : P.white }]} numberOfLines={2}>
            {exercise.name}
          </Text>

          {description ? (
            <Text style={[styles.browseDescription, { color: isDark ? colors.textMuted : '#D6EEF7' }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          {tagItems.length > 0 ? (
            <View style={styles.browseTagsRow}>
              {tagItems.map((tag) => (
                <View key={`${exercise.id}-${tag}`} style={[styles.browseTag, { backgroundColor: isDark ? colors.inputBg : P.ctaDark, borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent' }]}>
                  <Text style={[styles.browseTagText, { color: isDark ? colors.primary : '#D6EEF7' }]}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <CardMedia
          uri={staticUri}
          gifUri={gifUri}
          isFocused={isFocused}
          style={styles.browseThumb}
          fallbackStyle={styles.browseThumbPlaceholder}
          fallbackIcon={
            <>
              <LinearGradient
                colors={isDark ? ['#000000', '#000000'] : [P.ctaDark, P.ctaDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.browseThumbGlow, { backgroundColor: theme.glow }]} />
              <Ionicons name="barbell-outline" size={40} color={P.sun} />
            </>
          }
          error={imgError}
          onError={() => setImgError(true)}
        />
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(ExerciseCard);

const styles = StyleSheet.create({
  browseCard: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 9,
    overflow: 'hidden',
  },
  browsePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  browseScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '72%',
  },
  browseScorePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  browseRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  browseRatingPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  browseBodyRow: {
    flexDirection: 'row',
    gap: 14,
  },
  browseTextBlock: {
    flex: 1,
  },
  browseName: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 2,
  },
  browseDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    color: '#D6EEF7',
  },
  browseTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  browseTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  browseTagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  browseThumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    resizeMode: 'cover',
    flexShrink: 0,
  },
  browseThumbPlaceholder: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseThumbGlow: {
    position: 'absolute',
    top: -14,
    right: -12,
    width: 86,
    height: 86,
    borderRadius: 43,
  },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 0,
  },
  addImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  addImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    marginBottom: 2,
    color: '#FFF',
    lineHeight: 20,
    flexShrink: 1,
  },
  addRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  addRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: P.sun,
  },
  addMeta: {
    fontFamily: FONTS.body,
    fontSize: 13,
    textTransform: 'capitalize',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#34D399',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  compactImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  compactImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
    flexShrink: 1,
  },
  compactRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  compactRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: P.sun,
  },
  compactMeta: {
    fontFamily: FONTS.body,
    fontSize: 11,
    textTransform: 'capitalize',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  compactAddBtn: {
    padding: 4,
    marginLeft: 8,
  },

  sessionCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    gap: 14,
  },
  sessionImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  sessionImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sessionTextBlock: {
    flex: 1,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sessionName: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    flexShrink: 1,
  },
  sessionRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sessionRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: P.sun,
  },
  sessionMeta: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  sessionControls: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlItem: {
    flex: 1,
    alignItems: 'center',
  },
  controlLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  controlValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
  },
  vDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sessionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sessionActionText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
});
