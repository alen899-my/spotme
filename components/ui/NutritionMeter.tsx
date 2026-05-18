import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Macro { label: string; icon: string; consumed: number; target: number; color: string; unit: string; }
interface Props { caloriesConsumed: number; caloriesTarget: number; protein: Macro; carbs: Macro; fat: Macro; }

const { width: W } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Pure-View donut ring — zero native modules, 100% web-safe
// Uses the CSS "rotated half-circle" technique adapted for React Native.
// rightRot: fills 0→50%   leftRot: fills 50→100%
// ─────────────────────────────────────────────────────────────────────────────
function DonutRing({ pct, size, stroke, fillColor, trackColor, children }: any) {
  const half = size / 2;
  const rPct = Math.min(pct, 50);
  const lPct = Math.max(0, pct - 50);
  const rightRot = `${-180 + rPct * 3.6}deg`;
  const leftRot  = `${-180 + lPct * 3.6}deg`;

  return (
    <View style={{ width: size, height: size }}>
      {/* Background track */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: trackColor }} />

      {/* Right half fill (0–50%) */}
      <View style={{ position: 'absolute', right: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: -half, top: 0,
          width: size, height: size, borderRadius: half,
          borderWidth: stroke, borderColor: fillColor,
          transform: [{ rotate: rightRot }],
        }} />
      </View>

      {/* Left half fill (50–100%) */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: 0, top: 0,
          width: size, height: size, borderRadius: half,
          borderWidth: stroke, borderColor: fillColor,
          transform: [{ rotate: leftRot }],
        }} />
      </View>

      {/* Centre label */}
      <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini pie made from stacked arcs (same technique, 3 segments)
// ─────────────────────────────────────────────────────────────────────────────
function MiniPie({ protein, carbs, fat, total, size }: any) {
  const { colors } = useTheme();
  if (total === 0) return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: colors.border }} />;

  const p = (protein / total) * 100;
  const c = (carbs   / total) * 100;

  // We layer 3 DonutRings with different rotations (offsets) to simulate a pie
  // Simpler approach: use a stepped ring with clip offsets
  // Even simpler: show 3 colored arc segments using pure views offset by rotation
  // For brevity, use the standard "conic" trick with border trick
  const half = size / 2;
  const stroke = size * 0.38; // thick border = almost-solid

  const pPct  = Math.min(p, 100);
  const cPct  = Math.min(c, 100);

  return (
    <View style={{ width: size, height: size }}>
      {/* Base: fat color full circle */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: '#F59E0B' }} />
      {/* Carbs layer (protein + carbs) */}
      <DonutRing pct={pPct + cPct} size={size} stroke={stroke} fillColor="#3B82F6" trackColor="transparent">
        <View />
      </DonutRing>
      {/* Protein top layer */}
      <DonutRing pct={pPct} size={size} stroke={stroke} fillColor="#10B981" trackColor="transparent">
        <View />
      </DonutRing>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Macro bar row
// ─────────────────────────────────────────────────────────────────────────────
function MacroBar({ macro }: { macro: Macro }) {
  const { colors } = useTheme();
  const pct  = Math.min((macro.consumed / (macro.target || 1)) * 100, 100);
  const over = macro.consumed > macro.target;

  return (
    <View style={s.macroRow}>
      <View style={[s.macroIcon, { backgroundColor: macro.color + '20' }]}>
        <Ionicons name={macro.icon as any} size={15} color={macro.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.macroTopRow}>
          <Text style={[s.macroLabel, { color: colors.text }]}>{macro.label}</Text>
          <Text style={[s.macroValText, { color: colors.textMuted }]}>
            <Text style={{ color: macro.color, fontFamily: FONTS.bodyBold }}>{Math.round(macro.consumed)}</Text>
            {'  /  '}{macro.target}{macro.unit}
          </Text>
        </View>

        {/* Segmented tick bar */}
        <View style={s.tickRow}>
          {Array.from({ length: 20 }).map((_, i) => {
            const filled = i < Math.round(pct / 5);
            return (
              <View
                key={i}
                style={[
                  s.tick,
                  {
                    backgroundColor: filled
                      ? over ? '#E00000' : macro.color
                      : colors.border,
                    opacity: filled ? (0.5 + (i / 20) * 0.5) : 1,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={s.barFooter}>
          <Text style={[s.pctLabel, { color: colors.textDim }]}>{Math.round(pct)}%</Text>
          {over && <Text style={s.overLabel}>Over target</Text>}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function NutritionMeter({ caloriesConsumed, caloriesTarget, protein, carbs, fat }: Props) {
  const { colors, isDark } = useTheme();
  const pct  = Math.min(Math.round((caloriesConsumed / (caloriesTarget || 1)) * 100), 100);
  const left = Math.max(caloriesTarget - caloriesConsumed, 0);
  const over = caloriesConsumed > caloriesTarget;
  const RING = Math.min(W * 0.36, 148);
  const STROKE = Math.max(Math.round(RING * 0.1), 12);
  const totalMacros = protein.consumed + carbs.consumed + fat.consumed;

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.cardHeader}>
        <Text style={[s.title, { color: colors.text }]}>Today's Nutrition</Text>
        <View style={[s.statusChip, { backgroundColor: over ? '#E0000015' : '#10B98115' }]}>
          <View style={[s.statusDot, { backgroundColor: over ? '#E00000' : '#10B981' }]} />
          <Text style={[s.statusChipText, { color: over ? '#E00000' : '#10B981' }]}>
            {over ? 'Over limit' : 'On track'}
          </Text>
        </View>
      </View>

      {/* ── Top row: Donut + stats + mini-pie ── */}
      <View style={s.topRow}>
        {/* Main calorie donut */}
        <DonutRing pct={pct} size={RING} stroke={STROKE} fillColor="#E00000" trackColor={colors.border}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[s.ringNum, { color: colors.text }]}>{Math.round(caloriesConsumed).toLocaleString()}</Text>
            <Text style={[s.ringUnit, { color: colors.textMuted }]}>kcal</Text>
            <View style={[s.pctBadge, { backgroundColor: over ? '#E0000025' : '#10B98125' }]}>
              <Text style={[s.pctText, { color: over ? '#E00000' : '#10B981' }]}>{pct}%</Text>
            </View>
          </View>
        </DonutRing>

        {/* Stat cards */}
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[s.statCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[s.statLabel, { color: colors.textDim }]}>Daily Target</Text>
            <Text style={[s.statVal, { color: colors.text }]}>{caloriesTarget.toLocaleString()} kcal</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: over ? '#E0000010' : '#10B98110', borderColor: over ? '#E0000025' : '#10B98125' }]}>
            <Text style={[s.statLabel, { color: colors.textDim }]}>{over ? 'Over by' : 'Remaining'}</Text>
            <Text style={[s.statVal, { color: over ? '#E00000' : '#10B981' }]}>
              {Math.round(over ? caloriesConsumed - caloriesTarget : left)} kcal
            </Text>
          </View>

          {/* Mini macro pie + legend */}
          <View style={[s.statCard, { backgroundColor: colors.inputBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <MiniPie protein={protein.consumed} carbs={carbs.consumed} fat={fat.consumed} total={totalMacros} size={44} />
            <View style={{ gap: 3 }}>
              {[
                { label: 'P', color: '#10B981', val: `${Math.round(protein.consumed)}g` },
                { label: 'C', color: '#3B82F6', val: `${Math.round(carbs.consumed)}g` },
                { label: 'F', color: '#F59E0B', val: `${Math.round(fat.consumed)}g` },
              ].map(m => (
                <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: m.color }} />
                  <Text style={[s.miniLabel, { color: colors.textMuted }]}>
                    {m.label}{' '}
                    <Text style={{ color: m.color, fontFamily: FONTS.bodyBold }}>{m.val}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── Macro bars ── */}
      <View style={[s.macroSection, { borderTopColor: colors.border }]}>
        <Text style={[s.macroSectionTitle, { color: colors.text }]}>Macronutrients</Text>
        <MacroBar macro={protein} />
        <MacroBar macro={carbs} />
        <MacroBar macro={fat} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 0, marginBottom: 16,
    borderRadius: 24, borderWidth: 1, padding: 16,
    shadowColor: '#E00000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.055, 22), letterSpacing: 0.3 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.027, 11) },
  topRow: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' },
  ringNum: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.065, 26), lineHeight: Math.min(W * 0.07, 28), letterSpacing: -1 },
  ringUnit: { fontFamily: FONTS.bodySemiBold, fontSize: Math.min(W * 0.028, 11), marginTop: 2 },
  pctBadge: { marginTop: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  pctText: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.027, 11) },
  statCard: { borderRadius: 12, borderWidth: 1, padding: 9 },
  statLabel: { fontFamily: FONTS.body, fontSize: Math.min(W * 0.026, 11), marginBottom: 2 },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.035, 14) },
  miniLabel: { fontFamily: FONTS.body, fontSize: Math.min(W * 0.026, 11) },
  macroSection: { borderTopWidth: 1, paddingTop: 14, gap: 14 },
  macroSectionTitle: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.034, 14), letterSpacing: 0.3, marginBottom: 2 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  macroTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  macroLabel: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.032, 13) },
  macroValText: { fontFamily: FONTS.bodySemiBold, fontSize: Math.min(W * 0.029, 12) },
  tickRow: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, height: 8, borderRadius: 2 },
  barFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  pctLabel: { fontFamily: FONTS.body, fontSize: 10 },
  overLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#E00000' },
});
