import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../../../utils/api';



export default function UserSplitsScreen() {
  const router = useRouter();
  const { id, name, pic, count } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSplits = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/shared-splits`, {
        params: { creator_id: id, limit: 50 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplits(res.data.data);
    } catch (err) {
      console.error('Error fetching user splits:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSplits();
    }, [fetchSplits])
  );

  const renderCard = ({ item }: { item: any }) => {
    const exImages = item.exercise_images || [];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => router.push({
          pathname: `/splits/${item.id}`,
          params: { shared: '1', creatorName: item.creator_name, creatorPic: item.creator_pic || '', splitName: item.name }
        })}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardImageStack}>
            {exImages.slice(0, 3).map((uri: string, i: number) => (
              <Image
                key={i}
                source={{ uri }}
                style={[
                  styles.cardStackImg,
                  {
                    marginLeft: i > 0 ? -14 : 0,
                    zIndex: 3 - i,
                    borderColor: colors.card,
                  }
                ]}
              />
            ))}
            {exImages.length === 0 && (
              <View style={[styles.cardStackImg, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', marginLeft: 0 }]}>
                <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardSessions, { color: colors.textMuted }]}>{item.session_count} sessions</Text>
        </View>
        <View style={styles.cardRight}>
          {item.is_already_added ? (
            <View style={[styles.cardBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.textMuted} />
              <Text style={[styles.cardBadgeText, { color: colors.textMuted }]}>Added</Text>
            </View>
          ) : (
            <View style={[styles.cardBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Ionicons name="add-circle-outline" size={12} color={colors.primary} />
              <Text style={[styles.cardBadgeText, { color: colors.primary }]}>Add</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {pic ? (
              <Image source={{ uri: pic as string }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={16} color={colors.textMuted} />
              </View>
            )}
            <View>
              <Text style={[styles.headerName, { color: colors.text }]}>{String(name || 'Athlete')}</Text>
              <Text style={[styles.headerCount, { color: colors.textMuted }]}>{count || splits.length} program{(parseInt(String(count || splits.length), 10) || splits.length) > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={splits}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No programs found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  headerCount: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardLeft: {
    width: 60,
    height: 44,
    justifyContent: 'center',
  },
  cardImageStack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  cardStackImg: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
  },
  cardCenter: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  cardSessions: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 15,
  },
});
