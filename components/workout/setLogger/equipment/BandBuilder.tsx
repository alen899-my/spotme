import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Ellipse, Path, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FONTS } from '../../../../constants/theme';
import { BandConfig } from '../types';

const BAND_LEVELS = [
  { label: 'Light',   sublabel: '~5–15 lbs (2–7 kg)',   color: '#eab308', deep: '#854d0e', edge: '#fde047' },
  { label: 'Medium',  sublabel: '~15–35 lbs (7–16 kg)',  color: '#22c55e', deep: '#14532d', edge: '#4ade80' },
  { label: 'Heavy',   sublabel: '~35–55 lbs (16–25 kg)', color: '#ef4444', deep: '#7f1d1d', edge: '#f87171' },
  { label: 'X-Heavy', sublabel: '~55–80 lbs (25–36 kg)', color: '#a855f7', deep: '#581c87', edge: '#c084fc' },
];

interface BandBuilderProps {
  initialConfig: BandConfig;
  onWeightChange: (weightKg: number) => void;
}

const BandSvg = React.memo(({ level, width: svgWidth }: { level: number; width: number }) => {
  const b = BAND_LEVELS[level] ?? BAND_LEVELS[1];
  const viewBoxWidth = 260;
  const viewBoxHeight = 180;

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        <LinearGradient id="bandTube" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={b.edge} stopOpacity={0.9} />
          <Stop offset="0.3" stopColor={b.color} />
          <Stop offset="0.75" stopColor={b.deep} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </LinearGradient>
      </Defs>

      {/* Cast shadow */}
      <Ellipse cx={130} cy={162} rx={66} ry={9} fill="#000" opacity={0.3} />

      {/* Back half of the loop */}
      <Path
        d="M 60 90 C 60 40, 200 40, 200 90"
        fill="none"
        stroke={b.deep}
        strokeWidth={16}
        strokeLinecap="round"
      />

      {/* Front half of the loop with highlight */}
      <Path
        d="M 60 90 C 60 146, 200 146, 200 90"
        fill="none"
        stroke="url(#bandTube)"
        strokeWidth={18}
        strokeLinecap="round"
      />

      {/* Specular sheen highlight along front curve */}
      <Path
        d="M 74 98 C 88 136, 172 136, 186 98"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.25}
        strokeWidth={2.8}
        strokeLinecap="round"
      />

      {/* Center Label Badge */}
      <Rect x={102} y={116} width={56} height={18} rx={6} fill="#0f172a" opacity={0.8} />
      <SvgText
        x={130}
        y={129}
        fontFamily="sans-serif"
        fontSize={9}
        fontWeight="bold"
        fill="#ffffff"
        textAnchor="middle"
        letterSpacing={0.8}
      >
        {b.label.toUpperCase()}
      </SvgText>
    </Svg>
  );
});

const BandBuilder = React.memo(({ initialConfig, onWeightChange }: BandBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [level, setLevel] = useState<number>(initialConfig.level ?? 1);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 380)
      : Math.min(windowWidth - 32, 320);
    return Math.max(240, maxW);
  }, [windowWidth]);

  const handleSelect = useCallback((idx: number) => {
    setLevel(idx);
    onWeightChange(0); // Band exercises log 0 weight
  }, [onWeightChange]);

  const activeBand = BAND_LEVELS[level] ?? BAND_LEVELS[1];

  return (
    <View style={styles.container}>
      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: isDark ? '#070809' : '#EDE9FE', color: isDark ? '#929ba5' : '#6D28D9', borderColor: isDark ? '#22262a' : '#DDD6FE' }]}>
            LATEX LOOP · {activeBand.label.toUpperCase()} RESISTANCE
          </Text>
        </View>

        <BandSvg level={level} width={svgWidth} />
      </View>

      {/* Resistance Level Selector Card */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Resistance level
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {activeBand.sublabel}
            </Text>
          </View>
        </View>

        {/* Level Chips Grid */}
        <View style={styles.levelRow}>
          {BAND_LEVELS.map((b, i) => {
            const isSelected = level === i;
            return (
              <TouchableOpacity
                key={b.label}
                style={[
                  styles.levelChip,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(22, 169, 255, 0.12)'
                      : isDark ? '#0d1012' : '#F8FAFC',
                    borderColor: isSelected
                      ? b.color
                      : isDark ? '#22262a' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSelect(i)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${b.label} resistance band`}
              >
                <View style={[styles.colorDot, { backgroundColor: b.color }]} />
                <Text style={[styles.levelChipText, { color: isSelected ? b.color : (isDark ? '#f5f7f8' : '#0F172A') }]}>
                  {b.label}
                </Text>
                <Text style={[styles.levelChipSub, { color: isDark ? '#626b75' : '#94A3B8' }]}>
                  {b.sublabel.split('(')[0].trim()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

export default BandBuilder;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  secTitle: {
    fontFamily: FONTS.heading,
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  secNote: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 1,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelChip: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelChipText: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  levelChipSub: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
  },
});
