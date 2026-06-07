import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import { P } from '../../../constants/homeTheme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_URL } from '../../../utils/api';



export default function CreateSessionScreen() {
  const router = useRouter();
  const { id: splitId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a name for this session', 'info');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/workouts/splits/${splitId}/sessions`, {
        name,
        sort_order: 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('Session added!');
      // Navigate to the exercises list for this session
      router.replace(`/splits/session/${res.data.id}`);
    } catch (err) {
      console.error('Error creating session:', err);
      showToast('Failed to create session', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Session</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 140 + Math.max(insets.bottom, 12) }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>Session Name</Text>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Push Day, Back & Bi, Leg Session"
                placeholderTextColor={colors.textDim}
                value={name}
                onChangeText={setName}
              />
              
              <View style={styles.tipCard}>
                <Ionicons name="flash-outline" size={20} color={P.cta} />
                <Text style={[styles.tipText, { color: colors.textMuted }]}>
                  Next, you'll be able to select exercises from the library to add to this session.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.bg,
                paddingBottom: Math.max(insets.bottom, 12) + 12,
              }
            ]}
          >
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              <View style={styles.saveBtnGradient}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <><Text style={styles.saveBtnText}>ADD SESSION & CONTINUE</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    marginBottom: 12,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  scrollContent: { paddingHorizontal: 20, flexGrow: 1 },
  form: { paddingTop: 10 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 10 },
  input: { borderRadius: 14, padding: 16, fontFamily: FONTS.body, fontSize: 16, borderWidth: 1 },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(37,150,190,0.08)',
    padding: 16,
    borderRadius: 16,
    marginTop: 28,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.14)',
  },
  tipText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 20 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    gap: 10,
    backgroundColor: P.cta,
  },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 1 },
});
