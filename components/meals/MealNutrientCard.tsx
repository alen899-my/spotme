import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  meal: any;
};

// Solid vibrant palette — white text sits directly on these.
const SOLID: Record<string, string> = {
  protein: '#10B981',
  carbs:   '#3B82F6',
  fat:     '#F59E0B',
  fiber:   '#14B8A6',
  sugar:   '#EC4899',
  sodium:  '#8B5CF6',
};

const MACRO_CONFIG = [
  { key: 'total_protein', macro: 'protein', label: 'Protein',  unit: 'g',  icon: 'barbell-outline'   as const },
  { key: 'total_carbs',   macro: 'carbs',   label: 'Carbs',    unit: 'g',  icon: 'flash-outline'     as const },
  { key: 'total_fat',     macro: 'fat',     label: 'Fat',      unit: 'g',  icon: 'water-outline'     as const },
  { key: 'total_fiber',   macro: 'fiber',   label: 'Fiber',    unit: 'g',  icon: 'leaf-outline'      as const },
  { key: 'total_sugar',   macro: 'sugar',   label: 'Sugar',    unit: 'g',  icon: 'cafe-outline'      as const },
  { key: 'total_sodium',  macro: 'sodium',  label: 'Sodium',   unit: 'mg', icon: 'beaker-outline'    as const },
];

const ITEM_THUMBS = ['#2596BE', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#06B6D4'];

const shortMacroColor = (key: string) =>
  key === 'protein' ? SOLID.protein
  : key === 'carbs' ? SOLID.carbs
  : key === 'fat' ? SOLID.fat
  : key === 'fiber' ? SOLID.fiber
  : key === 'sugar' ? SOLID.sugar
  : SOLID.sodium;

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

      {/* ── CALORIE HERO (solid amber gradient) ──────────────────── */}
      <LinearGradient
        colors={['#FBBF24', '#F59E0B', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.calHero}
      >
        <View style={styles.calGlow} />
        <View style={styles.calHeroContent}>
          {/* Icon */}
          <View style={styles.flameWrapper}>
            <View style={styles.flameInner}>
              <Ionicons name="flame" size={24} color="#FFF" />
            </View>
          </View>

          <View style={styles.calTextGroup}>
            <View style={styles.calRow}>
              <Text style={styles.calValue}>
                {cals}
              </Text>
              <Text style={styles.calUnit}>
                kcal
              </Text>
            </View>
            <Text style={styles.calSubtext}>
              Total energy · this meal
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── MACRO GRID (solid per-macro colors) ──────────────────── */}
      {activeMacros.length > 0 && (
        <View style={styles.macroGrid}>
          {activeMacros.map(m => {
            const val = Math.round(meal[m.key] || 0);
            const solid = SOLID[m.macro] || colors.primary;
            return (
              <View
                key={m.key}
                style={[
                  styles.macroCell,
                  {
                    backgroundColor: solid,
                    borderColor: 'transparent',
                  },
                ]}
              >
                <View style={styles.macroIconWrap}>
                  <Ionicons name={m.icon} size={13} color="#FFF" />
                </View>

                <Text style={styles.macroVal}>
                  {val}
                  <Text style={styles.macroUnitInline}>
                    {m.unit}
                  </Text>
                </Text>
                <Text style={styles.macroLabel}>
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
            const itemCals = Math.round(item.calories || 0);
            const itemMacros = [
              { key: 'protein', val: Math.round(item.protein || 0), unit: 'g', label: 'Protein' },
              { key: 'carbs',   val: Math.round(item.carbs || 0),   unit: 'g', label: 'Carbs' },
              { key: 'fat',     val: Math.round(item.fat || 0),     unit: 'g', label: 'Fat' },
              { key: 'fiber',   val: Math.round(item.fiber || 0),   unit: 'g', label: 'Fiber' },
              { key: 'sugar',   val: Math.round(item.sugar || 0),   unit: 'g', label: 'Sugar' },
              { key: 'sodium',  val: Math.round(item.sodium || 0),  unit: 'mg', label: 'Sodium' },
            ].filter(m => m.val > 0);

            return (
              <View
                key={`item-${idx}`}
                style={[
                  styles.itemOuter,
                  {
                    backgroundColor: isDark ? surface : 'rgba(0,0,0,0.025)',
                    borderColor:     isDark ? surfaceBorder : 'rgba(0,0,0,0.055)',
                  },
                ]}
              >
                {/* Top row: thumb + name + calorie badge */}
                <View style={styles.itemRow}>
                  <View style={[styles.itemThumb, { backgroundColor: ITEM_THUMBS[idx % ITEM_THUMBS.length] }]}>
                    <Ionicons
                      name={idx % 2 === 0 ? 'restaurant' : 'nutrition'}
                      size={17}
                      color="#FFF"
                    />
                  </View>

                  <View style={styles.itemTextBlock}>
                    <Text style={[styles.itemName, { color: textPrimary }]} numberOfLines={1}>
                      {item.item_name}
                    </Text>
                    <Text style={[styles.itemQty, { color: textMuted }]}>
                      {item.quantity || 'Estimated serving'}
                    </Text>
                  </View>

                  <View style={[styles.itemCalBadge, { backgroundColor: colors.primary, borderColor: 'transparent' }]}>
                    <Text style={[styles.itemCalBadgeVal, { color: '#FFF' }]}>{itemCals}</Text>
                    <Text style={[styles.itemCalBadgeUnit, { color: 'rgba(255,255,255,0.8)' }]}>kcal</Text>
                  </View>
                </View>

                {/* Macro chips (solid) */}
                {itemMacros.length > 0 && (
                  <View style={styles.itemMacroGrid}>
                    {itemMacros.map(m => {
                      const solid = shortMacroColor(m.key);
                      return (
                        <View key={m.key} style={[styles.itemMacroChip, { backgroundColor: solid, borderColor: 'transparent' }]}>
                          <Text style={[styles.itemMacroChipText, { color: '#FFF' }]}>
                            {m.val}
                            <Text style={[styles.itemMacroChipUnit, { color: 'rgba(255,255,255,0.85)' }]}>{m.unit}</Text>
                          </Text>
                          <Text style={[styles.itemMacroChipLabel, { color: 'rgba(255,255,255,0.9)' }]}>{m.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
    overflow: 'hidden',
  },
  calGlow: {
    position: 'absolute',
    top: -50,
    right: -36,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
  flameInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
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
    color: '#FFF',
  },
  calUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.9)',
  },
  calSubtext: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.85)',
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
    borderWidth: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  macroIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  macroVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 20,
    color: '#FFF',
  },
  macroUnitInline: {
    fontSize: 11,
    letterSpacing: 0,
    color: 'rgba(255,255,255,0.85)',
  },
  macroLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
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
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 12,
    gap: 12,
  },
  itemThumb: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  /* ── Per-Item Macro Display ── */
  itemOuter: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemCalBadge: {
    borderRadius: 10,
    borderWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 52,
  },
  itemCalBadgeVal: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  itemCalBadgeUnit: {
    fontFamily: FONTS.body,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  itemMacroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  itemMacroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemMacroChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  itemMacroChipUnit: {
    fontSize: 9,
  },
  itemMacroChipLabel: {
    fontFamily: FONTS.body,
    fontSize: 9,
    letterSpacing: 0.2,
  },
});