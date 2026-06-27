import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../ui/OptimizedImage';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_MAX_WIDTH = Math.min(SCREEN_WIDTH - 80, 220);

interface ExercisePreviewModalProps {
  visible: boolean;
  exercise: any;
  onClose: () => void;
}

const ExercisePreviewModal: React.FC<ExercisePreviewModalProps> = ({ visible, exercise, onClose }) => {
  const { colors, isDark } = useTheme();

  if (!exercise) return null;

  let instructionText = exercise.instruction_steps_en || exercise.instructions_en || exercise.instructions || exercise.description || '';

  let steps: string[] = [];
  if (typeof instructionText === 'string') {
    if (instructionText.startsWith('[') && instructionText.endsWith(']')) {
      try {
        steps = JSON.parse(instructionText);
      } catch (e) {
        steps = [instructionText];
      }
    } else {
      let lines = instructionText.split('\n').filter((s: string) => s.trim().length > 0);
      if (lines.length === 1) {
        lines = lines[0].split(/(?<=[.!])\s+(?=[A-Z])/).filter((s: string) => s.trim().length > 0);
      }
      steps = lines;
    }
  } else if (Array.isArray(instructionText)) {
    steps = instructionText;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.guideOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(4,40,43,0.78)' }]}>
        <View style={[styles.guideContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.closeGuide} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="rgba(0,0,0,0.6)" />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.heroWrap}>
              <OptimizedImage 
                uri={exercise.gif_url || exercise.image_url} 
                style={styles.guideGif} 
                contentFit="contain" 
              />
            </View>
             <View style={styles.guideBody}>
              <Text style={[styles.guideName, { color: colors.text }]}>{exercise.name}</Text>
              
              <View style={styles.guideMetaRow}>
                <View style={[styles.guideBadge, { backgroundColor: isDark ? colors.inputBg : 'rgba(37,150,190,0.12)', borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
                  <Text style={[styles.guideBadgeText, { color: isDark ? colors.primary : P.ctaDeep }]}>{exercise.equipment}</Text>
                </View>
                <View style={[styles.guideBadge, { backgroundColor: isDark ? colors.inputBg : 'rgba(37,150,190,0.12)', borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
                  <Text style={[styles.guideBadgeText, { color: isDark ? colors.primary : P.ctaDeep }]}>{exercise.target}</Text>
                </View>
              </View>
              
              <Text style={[styles.guideSectionTitle, { color: isDark ? colors.primary : P.cta }]}>Instructions</Text>
              {steps.length > 0 ? (
                steps.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepDot}>
                      <Text style={styles.stepDotText}>{steps.length > 1 ? index + 1 : '•'}</Text>
                    </View>
                    <Text style={[styles.guideText, { color: colors.textMuted }]}>
                      {step.trim()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.guideText, { color: colors.textMuted, fontStyle: 'italic' }]}>
                  No instructions available.
                </Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.gotItBtn} onPress={onClose}>
            <View style={[styles.gotItBtnGrad, { backgroundColor: isDark ? colors.primary : P.cta }]}>
              <Text style={styles.gotItBtnText}>GOT IT, LET'S GO!</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  guideOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(4,40,43,0.78)', 
    justifyContent: 'center', 
    padding: 20 
  },
  guideContent: { 
    borderRadius: 32, 
    overflow: 'hidden', 
    maxHeight: '85%',
    borderWidth: 1.5,
  },
  closeGuide: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    zIndex: 10 
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  guideGif: { 
    width: GIF_MAX_WIDTH, 
    height: GIF_MAX_WIDTH * 0.8,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  guideBody: { 
    padding: 24 
  },
  guideName: { 
    fontFamily: FONTS.heading, 
    fontSize: 24, 
    marginBottom: 12 
  },
  guideMetaRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  guideBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 999,
    backgroundColor: 'rgba(37,150,190,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.18)',
  },
  guideBadgeText: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 11, 
    textTransform: 'uppercase',
    color: P.ctaDeep,
  },
  guideSectionTitle: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 18, 
    marginBottom: 12,
    color: P.cta,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P.sun,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepDotText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: P.ink,
  },
  guideText: { 
    fontFamily: FONTS.body, 
    fontSize: 15, 
    lineHeight: 24,
    flex: 1,
  },
  gotItBtn: { 
    margin: 24, 
    marginTop: 0, 
    borderRadius: 16, 
    overflow: 'hidden' 
  },
  gotItBtnGrad: { 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: P.cta,
  },
  gotItBtnText: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 14, 
    color: '#FFF', 
    letterSpacing: 1 
  },
});

export default ExercisePreviewModal;
