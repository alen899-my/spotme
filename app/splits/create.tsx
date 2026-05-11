import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CreateSplitGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a name for your program', 'info');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/workouts/splits`, {
        name,
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('Program created successfully!');
      // Navigate to the sessions list for this split
      router.replace(`/splits/${res.data.id}`);
    } catch (err) {
      console.error('Error creating split group:', err);
      showToast('Failed to create program', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Program</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>Program Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Push Pull Leg, Upper/Lower, Bro Split"
                placeholderTextColor={colors.textDim}
                value={name}
                onChangeText={setName}
                autoFocus
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Short Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="How many days? What's the goal?"
                placeholderTextColor={colors.textDim}
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.tipCard}>
                <Ionicons name="information-circle-outline" size={20} color="#E00000" />
                <Text style={[styles.tipText, { color: colors.textMuted }]}>
                  After creating the program, you'll add specific "Sessions" (like Push Day, Pull Day) inside it.
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
          >
            <LinearGradient
              colors={['#E00000', '#B00000']}
              style={styles.saveBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>CREATE PROGRAM</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 10,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  
  form: { marginTop: 10 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 10 },
  input: {
    borderRadius: 14,
    padding: 16,
    fontFamily: FONTS.body,
    fontSize: 16,
    borderWidth: 1,
  },
  
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(224,0,0,0.05)',
    padding: 16,
    borderRadius: 16,
    marginTop: 32,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
  },
  
  saveBtn: {
    marginTop: 'auto',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFF',
    letterSpacing: 1,
  },
});
