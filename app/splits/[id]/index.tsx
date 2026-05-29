import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SplitSessionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
      style={[
        styles.sessionCard, 
        { 
          backgroundColor: isDark ? colors.card : P.cta, 
          borderColor: isDark ? colors.border : P.cta, 
          borderWidth: isDark ? 1 : 0 
        }
      ]}
      activeOpacity={0.8}
      onPress={() => router.push(`/splits/session/${item.id}`)}
    >
      <View style={styles.cardMain}>
        <View style={styles.sessionImageContainer}>
          <Image 
            source={{ uri: item.sample_image || 'https://images.unsplash.com/photo-1517836357463-d25dfeac00ad?q=80&w=200&auto=format&fit=crop' }} 
            style={styles.sessionImage} 
          />
          <View style={styles.sessionOverlay} />
        </View>
        <View style={styles.titleArea}>
          <Text style={styles.sessionName}>{item.name}</Text>
          <Text style={[styles.sessionMeta, { color: isDark ? colors.textMuted : '#FFF' }]}>
            <Ionicons name="barbell-outline" size={12} color={isDark ? colors.textMuted : '#FFF'} /> {item.exercise_count} Exercises
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.actionText}>Manage Routine</Text>
        <Ionicons name="chevron-forward" size={14} color={P.sun} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
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
            <View style={styles.addBtnGradient}>
              <Ionicons name="add" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
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
              style={styles.createNowBtn}
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
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 32 + Math.max(insets.bottom, 12) }
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 8,
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
    backgroundColor: P.cta,
  },
  listContent: { paddingBottom: 40 },

  // Session Card
  sessionCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0,
    backgroundColor: P.cta,
    elevation: 4,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionImageContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionImage: {
    width: '100%',
    height: '100%',
  },
  sessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  titleArea: { flex: 1 },
  sessionName: { fontFamily: FONTS.bodyBold, fontSize: 17, marginBottom: 4, color: P.sun },
  sessionMeta: { fontFamily: FONTS.body, fontSize: 12, flexDirection: 'row', alignItems: 'center', gap: 4, color: '#FFF' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    backgroundColor: P.sun,
  },
  actionText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: P.ink },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  createNowBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: P.cta,
  },
  createNowText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
});
