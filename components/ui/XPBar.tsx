import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface XPBarProps {
  level: number;
  currentXp: number;
  animated?: boolean;
}

const XPBar: React.FC<XPBarProps> = ({ level, currentXp, animated = true }) => {
  const { colors } = useTheme();
  const xpForNext = level * 1000;
  const progress = Math.min(currentXp / xpForNext, 1);
  
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(progress);
    }
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <Text style={[styles.xpText, { color: colors.textMuted }]}>
          {currentXp} / {xpForNext} XP
        </Text>
      </View>
      
      <View style={[styles.barContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Animated.View style={[styles.progress, { width: widthInterpolation }]}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
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
