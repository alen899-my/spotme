import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AppState,
  Platform,
} from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

export default function SilentUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const slideAnim = useRef(new Animated.Value(150)).current; // Start off-screen (below bottom)
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Pulse animation for the "update ready" indicator dot
  useEffect(() => {
    if (updateReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [updateReady]);

  const checkAndDownloadUpdate = async () => {
    // Skip in development mode to avoid blocking local Metro bundling
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        // Fetch and cache the update bundle in the background
        const result = await Updates.fetchUpdateAsync();
        if (result.isNew) {
          setUpdateReady(true);
          // Slide in the update banner smoothly
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      }
    } catch (error) {
      // Fail silently under the hood if offline or server is unreachable
      console.log('[SilentUpdateManager] Check failed:', error);
    }
  };

  useEffect(() => {
    // 1. Check on component mount (App launch)
    checkAndDownloadUpdate();

    // 2. Check whenever app returns to foreground from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAndDownloadUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log('[SilentUpdateManager] Reload failed:', error);
    }
  };

  if (!updateReady) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.leftContent}>
          <Animated.View style={[styles.pulseCircle, { opacity: pulseAnim }]} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Update Available</Text>
            <Text style={styles.subtitle}>Tap reload to apply changes</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleReload} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#111" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>RELOAD</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 24, // Position above home indicator / navigation bar
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pulseCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50', // Success green dot
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 16,
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#111111',
    letterSpacing: 0.5,
  },
});
