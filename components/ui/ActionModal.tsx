import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ModalType = 'confirm' | 'delete' | 'info' | 'success' | 'error';

interface ActionModalProps {
  visible: boolean;
  type?: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const TYPE_CONFIG = {
  confirm: {
    icon: 'help-circle-outline' as const,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'] as [string, string],
    defaultConfirm: 'CONFIRM',
  },
  delete: {
    icon: 'trash-outline' as const,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'] as [string, string],
    defaultConfirm: 'DELETE',
  },
  info: {
    icon: 'information-circle-outline' as const,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'] as [string, string],
    defaultConfirm: 'OK',
  },
  success: {
    icon: 'checkmark-circle-outline' as const,
    color: '#10B981',
    gradient: ['#10B981', '#059669'] as [string, string],
    defaultConfirm: 'GOT IT',
  },
  error: {
    icon: 'alert-circle-outline' as const,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'] as [string, string],
    defaultConfirm: 'OK',
  },
};

export default function ActionModal({
  visible,
  type = 'confirm',
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  loading = false,
}: ActionModalProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const config = TYPE_CONFIG[type];
  const isSingle = type === 'info' || type === 'success' || type === 'error';
  const finalConfirmText = confirmText || config.defaultConfirm;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={isSingle ? onConfirm : onCancel}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFF',
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? '#38383A' : '#D1D1D6' }]} />

          {/* Icon */}
          {type !== 'info' && (
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: config.color + (isDark ? '20' : '12') },
              ]}
            >
              <Ionicons name={config.icon} size={36} color={config.color} />
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                marginTop: type === 'info' ? 8 : 0,
              },
            ]}
          >
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {message}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            {!isSingle && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  },
                ]}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: colors.text },
                  ]}
                >
                  CANCEL
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, isSingle ? styles.fullBtn : styles.halfBtn]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.gradient,
                  isSingle ? styles.fullBtn : styles.halfBtn,
                ]}
              >
                {loading ? (
                  <Text style={[styles.btnText, { color: '#FFF' }]}>
                    {finalConfirmText}
                  </Text>
                ) : (
                  <Text style={[styles.btnText, { color: '#FFF' }]}>
                    {finalConfirmText}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
  },
  halfBtn: {
    flex: 1,
  },
  fullBtn: {
    flex: 1,
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    letterSpacing: 1,
  },
});
