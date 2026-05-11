import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SplitSessionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/splits/${id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  const handleDelete = async (sessionId: number) => {
    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.delete(`${API_URL}/workouts/sessions/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchSessions();
          } catch (err) {
            console.error('Error deleting session:', err);
          }
        }
      }
    ]);
  };

  const renderSession = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => router.push(`/splits/session/${item.id}`)}
    >
      <View style={styles.cardMain}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(224,0,0,0.1)' }]}>
          <Ionicons name="calendar" size={22} color="#E00000" />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.sessionName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>{item.exercise_count} Exercises Added</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={20} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.actionText, { color: '#E00000' }]}>Manage Routine</Text>
        <Ionicons name="chevron-forward" size={16} color="#E00000" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Split Sessions</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage individual training days</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push({ pathname: `/splits/${id}/create-session` })}
          >
            <LinearGradient colors={['#E00000', '#B00000']} style={styles.addBtnGradient}>
              <Ionicons name="add" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#E00000" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="calendar-plus" size={72} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Create your first session (e.g. Push Day, Upper Body) within this program.
            </Text>
            <TouchableOpacity 
              style={[styles.createNowBtn, { backgroundColor: '#E00000' }]}
              onPress={() => router.push({ pathname: `/splits/${id}/create-session` })}
            >
              <Text style={styles.createNowText}>ADD NEW SESSION</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSession}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 26 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 40 },

  // Session Card
  sessionCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleArea: { flex: 1 },
  sessionName: { fontFamily: FONTS.bodyBold, fontSize: 17, marginBottom: 2 },
  sessionMeta: { fontFamily: FONTS.body, fontSize: 12 },
  deleteBtn: { padding: 4 },
  
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224,0,0,0.03)',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  actionText: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  createNowBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createNowText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
});
