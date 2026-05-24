import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

interface Macro {
  label: string; icon: string; consumed: number;
  target: number; color: string; unit: string;
}
interface Props {
  caloriesConsumed: number; caloriesTarget: number;
  protein: Macro; carbs: Macro; fat: Macro;
}

// ── Pure-View donut ring (zero SVG) ──────────────────────────────────────────
function DonutRing({ pct, size, stroke, fillColor, trackColor, children }: any) {
  const half = size / 2;
  const rPct = Math.min(pct, 50);
  const lPct = Math.max(0, pct - 50);

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: trackColor }} />
      {/* Right fill 0→50% */}
      <View style={{ position: 'absolute', right: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: -half, top: 0, width: size, height: size,
          borderRadius: half, borderWidth: stroke, borderColor: fillColor,
          transform: [{ rotate: `${-180 + rPct * 3.6}deg` }],
        }} />
      </View>
      {/* Left fill 50→100% */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: 0, top: 0, width: size, height: size,
          borderRadius: half, borderWidth: stroke, borderColor: fillColor,
          transform: [{ rotate: `${-180 + lPct * 3.6}deg` }],
        }} />
      </View>
      <View style={{ position: 'absolute', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ── Mini 3-layer donut for macro breakdown ────────────────────────────────────
function MiniPie({ protein, carbs, fat, total, size }: any) {
  const { colors } = useTheme();
  if (total === 0) return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: Math.round(size * 0.38), borderColor: colors.border }} />;
  const stroke = Math.round(size * 0.38);
  const p = Math.min((protein / total) * 100, 100);
  const c = Math.min((carbs   / total) * 100, 100);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#E7B100' }} />
      <DonutRing pct={p + c} size={size} stroke={stroke} fillColor="#1a6e8a" trackColor="transparent"><View /></DonutRing>
      <DonutRing pct={p}     size={size} stroke={stroke} fillColor="#2596BE" trackColor="transparent"><View /></DonutRing>
    </View>
  );
}

// ── Segmented tick macro bar ──────────────────────────────────────────────────
function MacroBar({ macro }: { macro: Macro }) {
  const { colors } = useTheme();
  const pct  = Math.min((macro.consumed / (macro.target || 1)) * 100, 100);
  const over = macro.consumed > macro.target;
  const filled = Math.round(pct / 5); // out of 20 ticks

  return (
    <View style={s.macroRow}>
      <View style={[s.macroIcon, { backgroundColor: macro.color + '20' }]}>
        <Ionicons name={macro.icon as any} size={14} color={macro.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.macroTopRow}>
          <Text style={[s.macroLabel, { color: colors.text }]}>{macro.label}</Text>
          <Text style={[s.macroVal, { color: colors.textMuted }]}>
            <Text style={{ color: macro.color, fontFamily: FONTS.bodyBold }}>{Math.round(macro.consumed)}</Text>
            {'  /  '}{macro.target}{macro.unit}
          </Text>
        </View>
        {/* Ticks */}
        <View style={s.tickRow}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={[
                s.tick,
                {
                  backgroundColor: i < filled
                    ? over ? '#2596BE' : macro.color
                    : colors.border,
                  opacity: i < filled ? 0.4 + (i / 20) * 0.6 : 1,
                },
              ]}
            />
          ))}
        </View>
        <View style={s.barFooter}>
          <Text style={[s.pctLabel, { color: colors.textDim }]}>{Math.round(pct)}%</Text>
          {over && <Text style={s.overTag}>Over target</Text>}
        </View>
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function NutritionMeter({ caloriesConsumed, caloriesTarget, protein, carbs, fat }: Props) {
  const { colors } = useTheme();
  const pct  = Math.min(Math.round((caloriesConsumed / (caloriesTarget || 1)) * 100), 100);
  const left = Math.max(caloriesTarget - caloriesConsumed, 0);
  const over = caloriesConsumed > caloriesTarget;
  const RING = Math.min(W * 0.36, 148);
  const STROKE = Math.max(Math.round(RING * 0.11), 13);
  const totalMacros = protein.consumed + carbs.consumed + fat.consumed;
  const ringColor = over
    ? '#E7B100' // over target = red
    : pct >= 100
    ? '#2596BE' // target reached = green
    : pct >= 70
    ? '#E7B100' // close to target = deep coral/orange
    : '#F7CB16'; // initial progress = bright orange

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* ── Title row ── */}
      <View style={s.titleRow}>
        <View style={s.titleLeft}>
          <View style={[s.titleIcon, { backgroundColor: ringColor + '18' }]}>
            <Ionicons name="flame" size={18} color={ringColor} />
          </View>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Today's Nutrition</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>Calorie & macro progress</Text>
          </View>
        </View>
        <View style={[s.chip, { backgroundColor: over ? '#E7B10018' : '#2596BE18' }]}>
          <View style={[s.chipDot, { backgroundColor: over ? '#E7B100' : '#2596BE' }]} />
          <Text style={[s.chipText, { color: over ? '#E7B100' : '#2596BE' }]}>
            {over ? 'Over target' : 'On track'}
          </Text>
        </View>
      </View>

      {/* ── Donut + side panel ── */}
      <View style={s.topRow}>
        <DonutRing pct={pct} size={RING} stroke={STROKE} fillColor={ringColor} trackColor={colors.border}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[s.ringNum, { color: colors.text }]}>{Math.round(caloriesConsumed).toLocaleString()}</Text>
            <Text style={[s.ringUnit, { color: colors.textMuted }]}>kcal</Text>
            <View style={[s.pctBadge, { backgroundColor: ringColor + '20' }]}>
              <Text style={[s.pctText, { color: ringColor }]}>{pct}%</Text>
            </View>
          </View>
        </DonutRing>

        {/* Right stat cards */}
        <View style={{ flex: 1, gap: 7 }}>
          <View style={[s.statCard, { backgroundColor: ringColor + '0E', borderColor: ringColor + '25' }]}>
            <Text style={[s.statLabel, { color: colors.textDim }]}>Calories Eaten</Text>
            <Text style={[s.statVal, { color: ringColor }]}>{Math.round(caloriesConsumed).toLocaleString()} kcal</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[s.statLabel, { color: colors.textDim }]}>Daily Target</Text>
            <Text style={[s.statVal, { color: colors.text }]}>{caloriesTarget.toLocaleString()} kcal</Text>
          </View>

          <View style={[s.statCard, {
            backgroundColor: over ? '#E7B1000E' : '#2596BE0E',
            borderColor: over ? '#E7B10025' : '#2596BE25',
          }]}>
            <Text style={[s.statLabel, { color: colors.textDim }]}>{over ? 'Over by' : 'Remaining'}</Text>
            <Text style={[s.statVal, { color: over ? '#E7B100' : '#2596BE' }]}>
              {Math.round(over ? caloriesConsumed - caloriesTarget : left)} kcal
            </Text>
          </View>

          {/* Macro summary — 3 columns, no rings */}
          <View style={[s.statCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Protein', color: '#2596BE', val: `${Math.round(protein.consumed)}g` },
                { label: 'Carbs',   color: '#1a6e8a', val: `${Math.round(carbs.consumed)}g` },
                { label: 'Fat',     color: '#E7B100', val: `${Math.round(fat.consumed)}g` },
              ].map(m => (
                <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: m.color }}>{m.val}</Text>
                  <Text style={[s.statLabel, { color: colors.textDim, marginBottom: 0 }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── Banner ── */}
      <View style={[s.banner, { backgroundColor: over ? '#E7B1000E' : '#2596BE0E', borderColor: over ? '#E7B10030' : '#2596BE30' }]}>
        <Ionicons name={over ? 'warning-outline' : 'checkmark-circle-outline'} size={15} color={over ? '#E7B100' : '#2596BE'} />
        <Text style={[s.bannerText, { color: over ? '#E7B100' : '#2596BE' }]}>
          {over
            ? `${Math.round(caloriesConsumed - caloriesTarget)} kcal over your daily goal`
            : `${Math.round(left)} kcal remaining to reach your goal`}
        </Text>
      </View>

      {/* ── Macro bars ── */}
      <View style={[s.macroSection, { borderTopColor: colors.border }]}>
        <Text style={[s.macroTitle, { color: colors.text }]}>Macronutrients</Text>
        <MacroBar macro={protein} />
        <MacroBar macro={carbs} />
        <MacroBar macro={fat} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 0, marginBottom: 16, borderRadius: 24, borderWidth: 1, padding: 18,
    shadowColor: '#2596BE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.048, 20) },
  subtitle: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  topRow: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  ringNum: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.062, 24), lineHeight: Math.min(W * 0.066, 26), letterSpacing: -1 },
  ringUnit: { fontFamily: FONTS.bodySemiBold, fontSize: 10, marginTop: 2 },
  pctBadge: { marginTop: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  pctText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  statCard: { borderRadius: 12, borderWidth: 1, padding: 9 },
  statLabel: { fontFamily: FONTS.body, fontSize: 10, marginBottom: 2 },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.034, 13) },
  miniLeg: { fontFamily: FONTS.body, fontSize: 10 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 11, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  bannerText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, flex: 1 },
  macroSection: { borderTopWidth: 1, paddingTop: 14, gap: 13 },
  macroTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.3, marginBottom: 2 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  macroTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroLabel: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.031, 12) },
  macroVal: { fontFamily: FONTS.bodySemiBold, fontSize: Math.min(W * 0.028, 11) },
  tickRow: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, height: 7, borderRadius: 2 },
  barFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  pctLabel: { fontFamily: FONTS.body, fontSize: 9 },
  overTag: { fontFamily: FONTS.bodyBold, fontSize: 9, color: '#2596BE' },
});


