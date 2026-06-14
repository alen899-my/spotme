import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import SplitRating from './SplitRating';

interface SplitCardProps {
  item: any;
  onDelete?: (id: number) => void;
}

export default function SplitCard({ item, onDelete }: SplitCardProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const creatorName = item.original_creator_name || 'unknown';
  const cardBg = isDark ? colors.card : (colors.primary || '#E00000');
  const cardBorderColor = isDark ? colors.border : (colors.primary || '#E00000');
  const exImages = item.exercise_images || [];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorderColor,
          borderWidth: isDark ? 1 : 0,
          shadowColor: isDark ? 'transparent' : cardBg,
          elevation: isDark ? 0 : 4,
        },
      ]}
      activeOpacity={0.9}
      onPress={() => router.push(`/splits/${item.id}`)}
    >
      <View style={styles.topRow}>
        <View style={styles.imageStack}>
          {exImages.slice(0, 3).map((uri: string, i: number) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.stackImg,
                {
                  marginLeft: i > 0 ? -16 : 0,
                  zIndex: 3 - i,
                  borderColor: isDark ? colors.card : '#FFF',
                },
              ]}
            />
          ))}
          {exImages.length === 0 && (
            <View style={[styles.stackImg, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)', marginLeft: 0, justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="dumbbell" size={18} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.5)'} />
            </View>
          )}
        </View>

        <View style={styles.rightActions}>
          {item.original_creator_name && (
            <TouchableOpacity
              style={styles.creatorBadge}
              onPress={() => router.push(`/profile/${item.original_creator_id}`)}
            >
              {item.original_creator_pic ? (
                <Image source={{ uri: item.original_creator_pic }} style={styles.creatorAvatar} />
              ) : (
                <View style={[styles.creatorAvatar, { backgroundColor: colors.primary }]}>
                  <Ionicons name="person" size={9} color="#FFF" />
                </View>
              )}
              <Text style={[styles.creatorName, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.65)' }]} numberOfLines={1}>
                @{creatorName}
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={13} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.5)'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.name, { color: isDark ? colors.text : '#FFF' }]} numberOfLines={1}>
        {item.name}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.statsLeft}>
          <View style={[styles.statPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="flash" size={10} color={isDark ? colors.primary : '#FFF'} />
            <Text style={[styles.statText, { color: isDark ? colors.textMuted : '#FFF' }]}>{item.session_count}</Text>
          </View>
          {item.user_count > 0 && (
            <View style={[styles.statPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="people-outline" size={10} color={isDark ? colors.primary : '#FFF'} />
              <Text style={[styles.statText, { color: isDark ? colors.textMuted : '#FFF' }]}>{item.user_count}</Text>
            </View>
          )}
        </View>
        {item.avg_rating > 0 && (
          <SplitRating avgRating={item.avg_rating} ratingCount={item.rating_count} size="sm" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  imageStack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  stackImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingTop: 2,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    fontFamily: FONTS.body,
    fontSize: 11,
    maxWidth: 90,
  },
  deleteBtn: {
    padding: 2,
  },
  name: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
});
