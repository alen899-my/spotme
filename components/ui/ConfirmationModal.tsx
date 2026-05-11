import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmColor?: string;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'DELETE',
  confirmColor = '#E00000',
}: ConfirmationModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${confirmColor}15` }]}>
            <Ionicons name="alert-circle-outline" size={32} color={confirmColor} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.inputBg }]} 
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: confirmColor }]} 
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, { color: '#FFF' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {},
  btnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    letterSpacing: 1,
  },
});
