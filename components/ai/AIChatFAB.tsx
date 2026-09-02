import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import AIChatModal from './AIChatModal';

const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');

interface AIChatFABProps {
  user?: any;
}

export default function AIChatFAB({ user }: AIChatFABProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Subtle breathing animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            bottom: Math.max(insets.bottom, 12) + 72,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setModalVisible(true)}
            style={[
              styles.fabButton,
              {
                backgroundColor: isDark ? '#141E24' : '#FFFFFF',
                borderColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Image source={coachAvatarSource} style={styles.coachImg} />
            <View style={[styles.sparkleBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <AIChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        user={user}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  coachImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
