import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

// League styling — mirrors leaderboard tiers (color + gradient per league).
export const LEAGUE_TIERS: Record<string, { color: string; gradient: [string, string]; textDark: boolean }> = {
  Bronze:      { color: '#CD7F32', gradient: ['#CD7F32', '#8B4513'], textDark: false },
  Silver:      { color: '#B0B8C1', gradient: ['#C0C0C0', '#808080'], textDark: true },
  Gold:        { color: '#F7CB16', gradient: ['#FFD700', '#B8860B'], textDark: true },
  Platinum:    { color: '#00C9C8', gradient: ['#00C9C8', '#007BFF'], textDark: false },
  Diamond:     { color: '#7DD4F8', gradient: ['#B9F2FF', '#00BFFF'], textDark: true },
  Master:      { color: '#9B59B6', gradient: ['#9B59B6', '#6C3483'], textDark: false },
  Grandmaster: { color: '#E91E63', gradient: ['#E91E63', '#880E4F'], textDark: false },
  Elite:       { color: '#FF5722', gradient: ['#FF5722', '#BF360C'], textDark: false },
  Champion:    { color: '#E00000', gradient: ['#E00000', '#7F0000'], textDark: false },
  Legend:      { color: '#FF9900', gradient: ['#FF9900', '#E00000'], textDark: true },
};

export function getLeagueTier(name?: string | null) {
  if (name && LEAGUE_TIERS[name]) return { name, ...LEAGUE_TIERS[name] };
  return { name: 'Bronze', ...LEAGUE_TIERS.Bronze };
}

interface XPBarProps {
  level: number;
  currentXp: number;
  /** XP-in-level to start the fill animation from (for increase animation). Defaults to 0. */
  startXp?: number;
  animated?: boolean;
  animationDuration?: number;
  /** When provided, bar + badge use this league's color/gradient (same as Leaderboard). */
  leagueTier?: string | null;
  barColors?: [string, string];
  badgeColor?: string;
}

const XPBar: React.FC<XPBarProps> = ({ level, currentXp, startXp, animated = true, animationDuration = 1500, leagueTier, barColors, badgeColor }) => {
  const { colors } = useTheme();
  const league = getLeagueTier(leagueTier);
  const effectiveBarColors = barColors ?? (leagueTier ? league.gradient : (['#3B82F6', '#2563EB'] as [string, string]));
  const effectiveBadgeColor = badgeColor ?? (leagueTier ? league.color : '#3B82F6');
  const effectiveBadgeText = leagueTier ? (league.textDark ? '#021518' : '#FFF') : '#FFF';
  const safeLevel = Math.max(1, level || 1);
  const xpForNext = safeLevel * 2000;
  const progress = Math.min(Math.max(0, currentXp || 0) / xpForNext, 1);
  const startProgress = startXp !== undefined
    ? Math.min(Math.max(0, startXp) / xpForNext, 1)
    : 0;

  const animatedWidth = useRef(new Animated.Value(startProgress)).current;

  useEffect(() => {
    animatedWidth.setValue(startProgress);
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(progress);
    }
  }, [progress, startProgress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: effectiveBadgeColor }]}>
          <Text style={[styles.levelText, { color: effectiveBadgeText }]}>LVL {level}</Text>
        </View>
        <Text style={[styles.xpText, { color: colors.textMuted }]}>
          {currentXp} / {xpForNext} XP
        </Text>
      </View>

      <View style={[styles.barContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Animated.View style={[styles.progress, { width: widthInterpolation }]}>
          <LinearGradient
            colors={effectiveBarColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glow} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 1,
  },
  xpText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  barContainer: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 6,
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});

export default XPBar;
