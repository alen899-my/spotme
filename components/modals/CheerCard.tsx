import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Modal,
  Dimensions, Animated, Easing, Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

const TIERS = [
  { name: 'All',         color: '#2596BE', gradient: ['#2596BE','#1A6B8A'] as [string,string],         mcIcon: 'earth'            },
  { name: 'Bronze',      color: '#CD7F32', gradient: ['#CD7F32','#8B4513'] as [string,string],        mcIcon: 'shield'           },
  { name: 'Silver',      color: '#B0B8C1', gradient: ['#C0C0C0','#808080'] as [string,string],        mcIcon: 'shield-half-full' },
  { name: 'Gold',        color: '#F7CB16', gradient: ['#FFD700','#B8860B'] as [string,string],        mcIcon: 'trophy'           },
  { name: 'Platinum',    color: '#00C9C8', gradient: ['#00C9C8','#007BFF'] as [string,string],        mcIcon: 'diamond-stone'    },
  { name: 'Diamond',     color: '#7DD4F8', gradient: ['#B9F2FF','#00BFFF'] as [string,string],        mcIcon: 'diamond'          },
  { name: 'Master',      color: '#9B59B6', gradient: ['#9B59B6','#6C3483'] as [string,string],        mcIcon: 'crown'            },
  { name: 'Grandmaster', color: '#E91E63', gradient: ['#E91E63','#880E4F'] as [string,string],        mcIcon: 'crown-outline'    },
  { name: 'Elite',       color: '#FF5722', gradient: ['#FF5722','#BF360C'] as [string,string],        mcIcon: 'sword-cross'      },
  { name: 'Champion',    color: '#E00000', gradient: ['#E00000','#7F0000'] as [string,string],        mcIcon: 'fire'             },
  { name: 'Legend',      color: '#FF9900', gradient: ['#FF9900','#E00000'] as [string,string],        mcIcon: 'star-four-points' },
];

function getTier(name: string) {
  return TIERS.find(t => t.name === name) ?? TIERS[1];
}

// ── Confetti Burst ─────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#F7CB16', '#2596BE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#FF6B6B', '#48DBFB', '#FF9FF3'];
const CONFETTI_PARTICLES = 40;

function ConfettiBurst() {
  const particles = useRef(
    Array.from({ length: CONFETTI_PARTICLES }, (_, i) => ({
      id: i,
      delay: Math.random() * 600,
      duration: 2000 + Math.random() * 1200,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      startX: Math.random() * W,
      size: 6 + Math.random() * 8,
      isCircle: Math.random() > 0.5,
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}

function ConfettiParticle({ particle }: { particle: any }) {
  const fallAnim  = useRef(new Animated.Value(0)).current;
  const swayAnim  = useRef(new Animated.Value(0)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 150, useNativeDriver: true,
        }),
        Animated.timing(fallAnim, {
          toValue: 1, duration: particle.duration, useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, { toValue: 1, duration: 300 + Math.random() * 300, useNativeDriver: true }),
            Animated.timing(swayAnim, { toValue: -1, duration: 300 + Math.random() * 300, useNativeDriver: true }),
          ]),
          { iterations: 3 }
        ),
      ]),
    ]).start(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    });
  }, []);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 600],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-25, 25],
  });

  const rotate = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: particle.startX,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {particle.isCircle ? (
        <View
          style={{
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: particle.color,
          }}
        />
      ) : (
        <View
          style={{
            width: particle.size * 0.6,
            height: particle.size,
            borderRadius: 2,
            backgroundColor: particle.color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      )}
    </Animated.View>
  );
}

// ── CheerCard Component ──────────────────────────────────────────────────────

interface CheerCardProps {
  visible: boolean;
  tierName: string;
  xp: number;
  xpNeeded: number;
  onClose: () => void;
}

const CARD_WIDTH = W * 0.88;
const BANNER_HEIGHT = Math.round(H * 0.28);

export default function CheerCard({ visible, tierName, xp, xpNeeded, onClose }: CheerCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [trackWidthPx, setTrackWidthPx] = useState(0);

  const promoFade     = useRef(new Animated.Value(0)).current;
  const promoScale    = useRef(new Animated.Value(0.5)).current;
  const promoWidth    = useRef(new Animated.Value(0)).current;
  const promoComplete = useRef(new Animated.Value(0)).current;
  const animating     = useRef(false);

  useEffect(() => {
    if (!visible) return;

    promoWidth.setValue(0);
    promoComplete.setValue(0);
    setTrackWidthPx(0);
    setShowConfetti(false);
    animating.current = false;

    Animated.parallel([
      Animated.timing(promoFade,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(promoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [visible, tierName]);

  useEffect(() => {
    if (!visible || trackWidthPx <= 0 || xpNeeded <= 0) return;

    const fraction = Math.min(xp / xpNeeded, 1);
    const targetPx = trackWidthPx * fraction;
    const isComplete = xp >= xpNeeded;
    const duration = animating.current ? 800 : 2400;
    animating.current = true;

    Animated.timing(promoWidth, {
      toValue: targetPx, duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (isComplete) {
        setShowConfetti(true);
        Animated.loop(
          Animated.sequence([
            Animated.timing(promoComplete, { toValue: 0.6, duration: 600, useNativeDriver: false }),
            Animated.timing(promoComplete, { toValue: 0, duration: 600, useNativeDriver: false }),
          ]),
          { iterations: 3 }
        ).start();
      }
    });
  }, [visible, trackWidthPx, xp, xpNeeded]);

  const close = useCallback(() => {
    setShowConfetti(false);
    Animated.parallel([
      Animated.timing(promoFade,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(promoScale, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }, [onClose]);

  const tier = getTier(tierName);

  return (
    <Modal transparent visible={visible} onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: promoFade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <Animated.View style={{ width: CARD_WIDTH, transform: [{ scale: promoScale }] }}>
          <View style={styles.card}>
            <View style={styles.bannerContainer}>
              <Image
                source={require('../../assets/coach/cheer.png')}
                style={styles.banner}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#111']}
                style={styles.bannerBlend}
                pointerEvents="none"
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>TIER UP!</Text>
              <Text style={styles.subtitle}>You're on fire!</Text>

              <View style={[styles.badge, { backgroundColor: tier.color, borderColor: tier.color }]}>
                <MaterialCommunityIcons name={tier.mcIcon as any} size={22} color="#FFF" />
                <Text style={styles.badgeText}>{tierName}</Text>
              </View>

              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>PROGRESS TO NEXT TIER</Text>
                <View
                  style={styles.progressTrack}
                  onLayout={(e) => { if (trackWidthPx <= 0) setTrackWidthPx(e.nativeEvent.layout.width); }}
                >
                  <Animated.View
                    style={[styles.progressFill, { width: promoWidth, backgroundColor: tier.color }]}
                  />
                  <Animated.View style={[styles.progressShine, { width: promoWidth }]} />
                  <Animated.View style={[styles.progressComplete, { opacity: promoComplete }]} />
                </View>
                <Text style={styles.progressText}>
                  {xp.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {showConfetti && <ConfettiBurst />}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  bannerContainer: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerBlend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT * 0.4,
  },
  content: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    color: '#FFF',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  badgeText: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: '#FFF',
    letterSpacing: 1.5,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    borderRadius: 5,
  },
  progressShine: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressComplete: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
    letterSpacing: 0.5,
  },
});