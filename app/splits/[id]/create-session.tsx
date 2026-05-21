import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CreateSessionScreen() {
  const router = useRouter();
  const { id: splitId } = useLocalSearchParams();
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Session</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView>
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
              <Ionicons name="flash-outline" size={20} color="#E00000" />
              <Text style={[styles.tipText, { color: colors.textMuted }]}>
                Next, you'll be able to select exercises from the library to add to this session.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            <LinearGradient colors={['#E00000', '#B00000']} style={styles.saveBtnGradient}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <><Text style={styles.saveBtnText}>ADD SESSION & CONTINUE</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, marginTop: 10 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 10 },
  input: { borderRadius: 14, padding: 16, fontFamily: FONTS.body, fontSize: 16, borderWidth: 1 },
  tipCard: { flexDirection: 'row', backgroundColor: 'rgba(224,0,0,0.05)', padding: 16, borderRadius: 16, marginTop: 32, gap: 12 },
  tipText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 20 },
  saveBtn: { marginTop: 'auto', marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 1 },
});
