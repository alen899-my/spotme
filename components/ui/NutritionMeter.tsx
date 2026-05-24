import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FONTS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

interface Macro {
  label: string;
  icon: string;
  consumed: number;
  target: number;
  color: string;
  unit: string;
}

interface Props {
  caloriesConsumed: number;
  caloriesTarget: number;
  protein: Macro;
  carbs: Macro;
  fat: Macro;
}

function DonutRing({ pct, size, stroke, fillColor, trackColor, children }: any) {
  const half = size / 2;
  const rPct = Math.min(pct, 50);
  const lPct = Math.max(0, pct - 50);

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: trackColor }} />
      <View style={{ position: 'absolute', right: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            left: -half,
            top: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: fillColor,
            transform: [{ rotate: `${-180 + rPct * 3.6}deg` }],
          }}
        />
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: fillColor,
            transform: [{ rotate: `${-180 + lPct * 3.6}deg` }],
          }}
        />
      </View>
      <View style={{ position: 'absolute', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}

function macroTheme(label: string) {
  const key = label.toLowerCase();
  if (key === 'protein') {
    return {
      bg: '#0E8C63',
      accent: '#D7F171',
      iconBg: 'rgba(255,255,255,0.14)',
      text: '#FFF',
      subText: 'rgba(255,255,255,0.78)',
      track: 'rgba(255,255,255,0.16)',
      footer: 'rgba(255,255,255,0.78)',
      pillBg: 'rgba(255,255,255,0.16)',
      pillText: '#FFF',
      iconColor: '#FFF',
    };
  }

  if (key === 'carbs') {
    return {
      bg: '#1A6E8A',
      accent: '#F7CB16',
      iconBg: 'rgba(255,255,255,0.16)',
      text: '#FFF',
      subText: 'rgba(255,255,255,0.78)',
      track: 'rgba(255,255,255,0.16)',
      footer: 'rgba(255,255,255,0.78)',
      pillBg: 'rgba(4,40,43,0.15)',
      pillText: '#FFF',
      iconColor: '#FFF',
    };
  }

  return {
    bg: '#D9A404',
    accent: '#04282B',
    iconBg: 'rgba(4,40,43,0.12)',
    text: '#04282B',
    subText: 'rgba(4,40,43,0.72)',
    track: 'rgba(4,40,43,0.12)',
    footer: 'rgba(4,40,43,0.72)',
    pillBg: 'rgba(4,40,43,0.10)',
    pillText: '#04282B',
    iconColor: '#04282B',
  };
}

function MacroBar({ macro }: { macro: Macro }) {
  const pct = Math.min((macro.consumed / (macro.target || 1)) * 100, 100);
  const over = macro.consumed > macro.target;
  const theme = macroTheme(macro.label);
  const totalSegments = 11;
  const filledSegments = Math.max(0, Math.min(totalSegments, Math.round((pct / 100) * totalSegments)));

  return (
    <View style={[s.macroCard, { backgroundColor: theme.bg }]}>
      <View style={s.macroHeader}>
        <View style={[s.macroIcon, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={macro.icon as any} size={16} color={theme.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.macroLabel, { color: theme.text }]}>{macro.label}</Text>
          <Text style={[s.macroSub, { color: theme.subText }]}>
            {Math.round(macro.consumed)} / {macro.target}
            {macro.unit}
          </Text>
        </View>
        <View style={[s.macroPctPill, { backgroundColor: theme.pillBg }]}>
          <Text style={[s.macroPctText, { color: theme.pillText }]}>{Math.round(pct)}%</Text>
        </View>
      </View>

      <View style={s.macroMeterRow}>
        {Array.from({ length: totalSegments }).map((_, index) => (
          <View
            key={`${macro.label}-${index}`}
            style={[
              s.macroMeterTick,
              {
                backgroundColor: index < filledSegments ? (over ? '#FFF' : theme.accent) : theme.track,
              },
            ]}
          />
        ))}
      </View>

      {over && (
        <View style={s.macroFooter}>
          <Ionicons name="warning-outline" size={14} color={theme.footer} />
          <Text style={[s.macroFooterText, { color: theme.footer }]}>Over target</Text>
        </View>
      )}
    </View>
  );
}

export default function NutritionMeter({ caloriesConsumed, caloriesTarget, protein, carbs, fat }: Props) {
  const pct = Math.min(Math.round((caloriesConsumed / (caloriesTarget || 1)) * 100), 100);
  const left = Math.max(caloriesTarget - caloriesConsumed, 0);
  const over = caloriesConsumed > caloriesTarget;
  const RING = Math.min(W * 0.36, 148);
  const STROKE = Math.max(Math.round(RING * 0.11), 13);
  const ringColor = over ? '#E7B100' : pct >= 100 ? '#2596BE' : pct >= 70 ? '#E7B100' : '#F7CB16';

  return (
    <View style={s.card}>
      <View style={s.titleRow}>
        <View style={s.titleLeft}>
          <View style={s.titleIcon}>
            <Ionicons name="flame" size={18} color="#FFF" />
          </View>
          <View>
            <Text style={s.title}>Today's Nutrition</Text>
            <Text style={s.subtitle}>Calorie and macro progress</Text>
          </View>
        </View>
      </View>

      <View style={s.topRow}>
        <DonutRing pct={pct} size={RING} stroke={STROKE} fillColor={ringColor} trackColor="rgba(255,255,255,0.24)">
          <View style={{ alignItems: 'center' }}>
            <Text style={s.ringNum}>{Math.round(caloriesConsumed).toLocaleString()}</Text>
            <Text style={s.ringUnit}>kcal</Text>
            <View style={s.pctBadge}>
              <Text style={s.pctText}>{pct}%</Text>
            </View>
          </View>
        </DonutRing>

        <View style={{ flex: 1, gap: 7 }}>
          <View style={[s.statCard, s.caloriesCard]}>
            <View style={s.statHeader}>
              <View style={s.statIconDark}>
                <Ionicons name="flame-outline" size={16} color="#04282B" />
              </View>
              <Text style={s.statLabelDark}>Calories Eaten</Text>
            </View>
            <Text style={s.statValueDark}>{Math.round(caloriesConsumed).toLocaleString()} kcal</Text>
          </View>

          <View style={[s.statCard, s.targetCard]}>
            <View style={s.statHeader}>
              <View style={s.statIconLight}>
                <Ionicons name="flag-outline" size={16} color="#FFF" />
              </View>
              <Text style={s.statLabelLight}>Daily Target</Text>
            </View>
            <Text style={s.statValueLight}>{caloriesTarget.toLocaleString()} kcal</Text>
          </View>

          <View style={[s.statCard, over ? s.overCard : s.remainingCard]}>
            <View style={s.statHeader}>
              <View style={s.statIconLight}>
                <Ionicons name={over ? 'warning-outline' : 'checkmark-circle-outline'} size={16} color="#FFF" />
              </View>
              <Text style={s.statLabelLight}>{over ? 'Over by' : 'Remaining'}</Text>
            </View>
            <Text style={s.statValueLight}>
              {Math.round(over ? caloriesConsumed - caloriesTarget : left)} kcal
            </Text>
          </View>
        </View>
      </View>

      <View style={s.macroSection}>
        <Text style={s.macroTitle}>Macronutrients</Text>
        <MacroBar macro={protein} />
        <MacroBar macro={carbs} />
        <MacroBar macro={fat} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    backgroundColor: '#2596BE',
    borderColor: 'rgba(247,203,22,0.38)',
    shadowColor: '#2596BE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  title: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.048, 20), color: '#FFF' },
  subtitle: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1, color: 'rgba(255,255,255,0.82)' },
  topRow: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  ringNum: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.062, 24), lineHeight: Math.min(W * 0.066, 26), letterSpacing: -1, color: '#FFF' },
  ringUnit: { fontFamily: FONTS.bodySemiBold, fontSize: 10, marginTop: 2, color: 'rgba(255,255,255,0.78)' },
  pctBadge: { marginTop: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.14)' },
  pctText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF' },
  statCard: { borderRadius: 14, padding: 10 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  statIconDark: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(247,203,22,0.95)' },
  statIconLight: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  statLabelDark: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#04282B' },
  statLabelLight: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF' },
  statValueDark: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.034, 13), color: '#04282B' },
  statValueLight: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.034, 13), color: '#FFF' },
  caloriesCard: { backgroundColor: '#F7CB16' },
  targetCard: { backgroundColor: '#10B981' },
  remainingCard: { backgroundColor: '#D9A404' },
  overCard: { backgroundColor: '#E7B100' },
  macroSection: { paddingTop: 2, gap: 12 },
  macroTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.3, marginBottom: 2, color: '#FFF' },
  macroCard: { borderRadius: 18, padding: 14 },
  macroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  macroIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  macroLabel: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  macroSub: { fontFamily: FONTS.bodySemiBold, fontSize: 11, marginTop: 2 },
  macroPctPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  macroPctText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  macroMeterRow: { flexDirection: 'row', gap: 5 },
  macroMeterTick: { flex: 1, height: 10, borderRadius: 999 },
  macroFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  macroFooterText: { fontFamily: FONTS.bodySemiBold, fontSize: 10 },
});
