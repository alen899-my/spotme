import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface StreakIconProps {
  streak: number;
  size?: number;
}

const StreakIcon: React.FC<StreakIconProps> = ({ streak, size = 80 }) => {
  const { colors } = useTheme();
  const animatedScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (streak > 0) {
      Animated.sequence([
        Animated.timing(animatedScale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.spring(animatedScale, { toValue: 1, friction: 4, useNativeDriver: true })
      ]).start();
    }
  }, [streak]);

  if (streak === 0) return null;

  // Egg color shifts from white/cream to golden as streak grows
  const eggColors = (streak < 7 
    ? ['#FFFBEB', '#FEF3C7'] // White/Cream
    : streak < 30 
      ? ['#FDE68A', '#F59E0B'] // Bronze/Amber
      : ['#FCD34D', '#D97706']) as [string, string]; // Golden/Epic

  return (
    <Animated.View style={[styles.container, { width: size, height: size * 1.25, transform: [{ scale: animatedScale }] }]}>
      <LinearGradient
        colors={eggColors}
        style={[styles.egg, { borderRadius: size }]}
      >
        <View style={styles.content}>
          <Text style={[styles.streakNumber, { fontSize: size * 0.4 }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { fontSize: size * 0.12 }]}>DAY STREAK</Text>
        </View>
        
        {/* Shine effect */}
        <View style={styles.shine} />
      </LinearGradient>
      
      {/* Shadow for depth */}
      <View style={[styles.shadow, { width: size * 0.8, height: size * 0.1, bottom: -size * 0.15 }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  egg: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 1000,
    borderTopRightRadius: 1000,
    borderBottomLeftRadius: 800,
    borderBottomRightRadius: 800,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  streakNumber: {
    fontFamily: FONTS.heading,
    color: '#92400E',
    includeFontPadding: false,
  },
  streakLabel: {
    fontFamily: FONTS.bodyBold,
    color: '#B45309',
    marginTop: -4,
  },
  shine: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: '30%',
    height: '20%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 100,
    transform: [{ rotate: '-15deg' }],
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
    zIndex: -1,
  },
});

export default StreakIcon;
