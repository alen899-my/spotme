import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  meal: any;
};

const MACRO_CONFIG = [
  { key: 'total_protein', label: 'Protein',  unit: 'g',  color: '#34EEB0', dimColor: 'rgba(52,238,176,0.12)',  icon: 'barbell-outline'   as const },
  { key: 'total_carbs',   label: 'Carbs',    unit: 'g',  color: '#60A5FA', dimColor: 'rgba(96,165,250,0.12)',  icon: 'flash-outline'     as const },
  { key: 'total_fat',     label: 'Fat',      unit: 'g',  color: '#FBBF24', dimColor: 'rgba(251,191,36,0.12)',  icon: 'water-outline'     as const },
  { key: 'total_fiber',   label: 'Fiber',    unit: 'g',  color: '#A78BFA', dimColor: 'rgba(167,139,250,0.12)', icon: 'leaf-outline'      as const },
  { key: 'total_sugar',   label: 'Sugar',    unit: 'g',  color: '#F472B6', dimColor: 'rgba(244,114,182,0.12)', icon: 'cafe-outline'      as const },
  { key: 'total_sodium',  label: 'Sodium',   unit: 'mg', color: '#FB923C', dimColor: 'rgba(251,146,60,0.12)',  icon: 'beaker-outline'    as const },
];

const ITEM_ACCENT_COLORS = ['#34EEB0', '#60A5FA', '#FBBF24', '#A78BFA', '#F472B6', '#FB923C'];

export default function MealNutrientCard({ meal }: Props) {
  const { colors, isDark } = useTheme();

  const cals = Math.round(meal.total_calories || 0);

  const activeMacros = MACRO_CONFIG.filter(m => Math.round(meal[m.key] || 0) > 0);

  // Total macros for progress bar proportions (protein + carbs + fat)
  const totalMacroG =
    Math.round(meal.total_protein || 0) +
    Math.round(meal.total_carbs   || 0) +
    Math.round(meal.total_fat     || 0);

  const surface     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textPrimary   = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted     = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.42)';

  return (
    <View style={styles.root}>

      {/* ── CALORIE HERO ─────────────────────────────────────────── */}
      <LinearGradient
        colors={isDark
          ? ['rgba(231,177,0,0.18)', 'rgba(251,146,60,0.10)', 'rgba(0,0,0,0)']
          : ['rgba(251,191,36,0.22)', 'rgba(245,158,11,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.calHero, { borderColor: isDark ? 'rgba(231,177,0,0.18)' : 'rgba(245,158,11,0.20)' }]}
      >
        <View style={styles.calHeroContent}>
          {/* Icon pulse ring */}
          <View style={styles.flameWrapper}>
            <View style={[styles.flamePulse, { backgroundColor: 'rgba(231,177,0,0.12)' }]} />
            <View style={[styles.flameInner, { backgroundColor: isDark ? 'rgba(231,177,0,0.16)' : 'rgba(231,177,0,0.20)' }]}>
              <Ionicons name="flame" size={24} color="#FBBF24" />
            </View>
          </View>

          <View style={styles.calTextGroup}>
            <View style={styles.calRow}>
              <Text style={[styles.calValue, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                {cals}
              </Text>
              <Text style={[styles.calUnit, { color: isDark ? 'rgba(252,211,77,0.65)' : 'rgba(217,119,6,0.70)' }]}>
                kcal
              </Text>
            </View>
            <Text style={[styles.calSubtext, { color: textMuted }]}>
              Total energy · this meal
            </Text>
          </View>
        </View>

       
      </LinearGradient>

      {/* ── MACRO GRID ───────────────────────────────────────────── */}
      {activeMacros.length > 0 && (
        <View style={styles.macroGrid}>
          {activeMacros.map(m => {
            const val = Math.round(meal[m.key] || 0);
            return (
              <View
                key={m.key}
                style={[
                  styles.macroCell,
                  {
                    backgroundColor: isDark ? surface : m.dimColor,
                    borderColor:     isDark ? surfaceBorder : `${m.color}22`,
                  },
                ]}
              >
                <View style={[styles.macroIconWrap, { backgroundColor: m.dimColor }]}>
                  <Ionicons name={m.icon} size={13} color={m.color} />
                </View>

                <Text style={[styles.macroVal, { color: m.color }]}>
                  {val}
                  <Text style={[styles.macroUnitInline, { color: isDark ? `${m.color}90` : `${m.color}bb` }]}>
                    {m.unit}
                  </Text>
                </Text>
                <Text style={[styles.macroLabel, { color: textMuted }]}>
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── DETECTED ITEMS ───────────────────────────────────────── */}
      {meal.items && meal.items.length > 0 && (
        <View style={styles.itemsSection}>

          {/* Section label */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionLabelLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]} />
            <Text style={[styles.sectionLabelText, { color: textMuted }]}>ITEMS</Text>
            <View style={[styles.sectionLabelLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]} />
          </View>

          {meal.items.map((item: any, idx: number) => {
            const accent = ITEM_ACCENT_COLORS[idx % ITEM_ACCENT_COLORS.length];
            const itemCals = Math.round(item.calories || 0);
            return (
              <View
                key={`item-${idx}`}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: isDark ? surface : 'rgba(0,0,0,0.025)',
                    borderColor:     isDark ? surfaceBorder : 'rgba(0,0,0,0.055)',
                  },
                ]}
              >
                {/* Thumb */}
                <View style={[styles.itemThumb, { backgroundColor: `${accent}15` }]}>
                  {meal.image_url ? (
                    <Image source={{ uri: meal.image_url }} style={styles.itemThumbImage} />
                  ) : (
                    <Ionicons
                      name={idx % 2 === 0 ? 'restaurant' : 'nutrition'}
                      size={17}
                      color={accent}
                    />
                  )}
                </View>

                {/* Text */}
                <View style={styles.itemTextBlock}>
                  <Text style={[styles.itemName, { color: textPrimary }]} numberOfLines={1}>
                    {item.item_name}
                  </Text>
                  <Text style={[styles.itemQty, { color: textMuted }]}>
                    {item.quantity || 'Estimated serving'}
                  </Text>
                </View>

              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },

  /* ── Calorie Hero ── */
  calHero: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
  },
  calHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flameWrapper: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flamePulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  flameInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calTextGroup: {
    gap: 3,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  calValue: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1,
  },
  calUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  calSubtext: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  /* Ratio bar */
  ratioBarWrap: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratioSegment: {
    borderRadius: 4,
  },
  ratioLegend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    letterSpacing: 0.1,
  },

  /* ── Macro Grid ── */
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroCell: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    gap: 6,
  },
  macroIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  macroUnitInline: {
    fontSize: 11,
    letterSpacing: 0,
  },
  macroLabel: {
    fontFamily: FONTS.body,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  /* ── Items Section ── */
  itemsSection: {
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
  },
  sectionLabelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 12,
    gap: 12,
    overflow: 'hidden',
  },
  itemThumb: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemThumbImage: {
    width: '100%',
    height: '100%',
  },
  itemTextBlock: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  itemQty: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  calBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 52,
  },
  calBadgeValue: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  calBadgeUnit: {
    fontFamily: FONTS.body,
    fontSize: 9,
    letterSpacing: 0.3,
  },
});