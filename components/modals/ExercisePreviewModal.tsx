import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExercisePreviewModalProps {
  visible: boolean;
  exercise: any;
  onClose: () => void;
}

const ExercisePreviewModal: React.FC<ExercisePreviewModalProps> = ({ visible, exercise, onClose }) => {
  const { colors } = useTheme();

  if (!exercise) return null;

  // Handle various instruction field names and formats
  let instructionText = exercise.instruction_steps_en || exercise.instructions_en || exercise.instructions || exercise.description || '';
  
  // If it's a JSON string of an array (common in some DB setups), parse it
  let steps: string[] = [];
  if (typeof instructionText === 'string') {
    if (instructionText.startsWith('[') && instructionText.endsWith(']')) {
      try {
        steps = JSON.parse(instructionText);
      } catch (e) {
        steps = [instructionText];
      }
    } else {
      // Split by newline if it's a block of text
      steps = instructionText.split('\n').filter((s: string) => s.trim().length > 0);
    }
  } else if (Array.isArray(instructionText)) {
    steps = instructionText;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.guideOverlay}>
        <View style={[styles.guideContent, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.closeGuide} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="rgba(0,0,0,0.5)" />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image 
              source={{ uri: exercise.gif_url || exercise.image_url }} 
              style={styles.guideGif} 
              resizeMode="contain" 
            />
            <View style={styles.guideBody}>
              <Text style={[styles.guideName, { color: colors.text }]}>{exercise.name}</Text>
              
              <View style={styles.guideMetaRow}>
                <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{exercise.equipment}</Text>
                </View>
                <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{exercise.target}</Text>
                </View>
              </View>
              
              <Text style={[styles.guideSectionTitle, { color: colors.text }]}>Instructions</Text>
              {steps.length > 0 ? (
                steps.map((step, index) => (
                  <Text key={index} style={[styles.guideText, { color: colors.textMuted, marginBottom: 8 }]}>
                    {steps.length > 1 ? `${index + 1}. ` : ''}{step.trim()}
                  </Text>
                ))
              ) : (
                <Text style={[styles.guideText, { color: colors.textMuted, fontStyle: 'italic' }]}>
                  No instructions available.
                </Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.gotItBtn} onPress={onClose}>
            <LinearGradient colors={['#E00000', '#B00000']} style={styles.gotItBtnGrad}>
              <Text style={styles.gotItBtnText}>GOT IT, LET'S GO!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  guideOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    padding: 20 
  },
  guideContent: { 
    borderRadius: 32, 
    overflow: 'hidden', 
    maxHeight: '85%' 
  },
  closeGuide: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    zIndex: 10 
  },
  guideGif: { 
    width: '100%', 
    height: 250, 
    backgroundColor: '#FFF' 
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
    marginBottom: 20 
  },
  guideBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  guideBadgeText: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 11, 
    textTransform: 'uppercase' 
  },
  guideSectionTitle: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 18, 
    marginBottom: 10 
  },
  guideText: { 
    fontFamily: FONTS.body, 
    fontSize: 15, 
    lineHeight: 24 
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
    alignItems: 'center' 
  },
  gotItBtnText: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 14, 
    color: '#FFF', 
    letterSpacing: 1 
  },
});

export default ExercisePreviewModal;
