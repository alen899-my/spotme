import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { FONTS } from '../../constants/theme';

// ─── BMI Zones ───────────────────────────────────────────────────────────────
const ZONES = [
  { label: 'Under',  min: 10,   max: 18.5, color: '#60A5FA' },
  { label: 'Normal', min: 18.5, max: 25,   color: '#34D399' },
  { label: 'Over',   min: 25,   max: 30,   color: '#FBBF24' },
  { label: 'Obese',  min: 30,   max: 40,   color: '#F87171' },
];

const BMI_MIN   = 10;
const BMI_MAX   = 40;
// Arc opens at BOTTOM: starts lower-left (150°), ends lower-right (390°=30°)
// clockwise sweep of 240° — standard car-speedometer orientation
const START_DEG = 150;
const SWEEP_DEG = 240;

function deg2rad(d: number) { return (d * Math.PI) / 180; }

/** Maps BMI → SVG angle in [150°, 390°] */
function bmiToAngle(bmi: number): number {
  const clamped = Math.max(BMI_MIN, Math.min(BMI_MAX, bmi));
  return START_DEG + ((clamped - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG;
}

/** SVG arc path from startDeg to endDeg (clockwise, sweep-flag=1) */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s  = deg2rad(startDeg);
  const e  = deg2rad(endDeg);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = (endDeg - startDeg > 180) ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function getZoneColor(bmi: number): string {
  const z = ZONES.find(z => bmi >= z.min && bmi < z.max);
  return z ? z.color : ZONES[ZONES.length - 1].color;
}

interface Props {
  bmi: number;
  bmiCategory: string;
  isDark?: boolean;
  size?: number;
}

export default function BmiSpeedometer({ bmi, bmiCategory, isDark = true, size = 260 }: Props) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: 1,
      duration: 1100,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [bmi]);

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const cx     = size / 2;
  // cy slightly above mid so the arc endpoints (lower-left/right) fall within container
  const cy     = size * 0.44;
  const outerR = size * 0.43;
  const innerR = size * 0.31;
  const midR   = (outerR + innerR) / 2;
  const stroke = outerR - innerR;

  // The arc endpoints are at 150° and 30°:
  // y_endpoint = cy + midR * sin(150°) = cy + midR * 0.5
  // Container height must be > this value
  const endpointY   = cy + midR * 0.5;
  const containerH  = Math.ceil(endpointY + 32); // 32px padding below arc ends

  // ── Theme ──────────────────────────────────────────────────────────────────
  const cardBg   = isDark ? '#1A1A1A' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF'  : '#111111';
  const textMuted= isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)';
  const trackBg  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const divider  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // ── Zone arcs ───────────────────────────────────────────────────────────────
  const zoneArcs = ZONES.map(z => ({
    ...z,
    startAngle: START_DEG + ((z.min - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG,
    endAngle  : START_DEG + ((Math.min(z.max, BMI_MAX) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG,
  }));

  // ── Needle ────────────────────────────────────────────────────────────────
  // The needle is drawn pointing UP in SVG (270° from positive x-axis).
  // React Native rotate is clockwise from "up", so to point toward SVG angle A:
  //   RN_rotation = A - 270°
  const targetAngle    = bmiToAngle(bmi);
  const startRot       = START_DEG - 270;            // -120° for lower-left
  const targetRot      = targetAngle - 270;          //  varies
  const needleRotate   = animVal.interpolate({
    inputRange : [0, 1],
    outputRange: [`${startRot}deg`, `${targetRot}deg`],
  });

  const activeColor = getZoneColor(bmi);

  // ── Tick positions at key BMI values ─────────────────────────────────────
  const tickValues = [10, 18.5, 25, 30, 40];

  return (
    <View style={[styles.wrapper, { backgroundColor: cardBg, borderColor: divider }]}>
      {/* Header */}
      <Text style={[styles.headerLabel, { color: textMuted }]}>BODY MASS INDEX</Text>

      {/* Gauge canvas — height is exactly enough to show all arc */}
      <View style={{ width: size, height: containerH, overflow: 'hidden', alignSelf: 'center' }}>

        {/* Static SVG: track + colored zones + ticks + inner fill */}
        <Svg width={size} height={size}>
          {/* Background track */}
          <Path
            d={arcPath(cx, cy, midR, START_DEG, START_DEG + SWEEP_DEG)}
            stroke={trackBg}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
          />

          {/* Zone arcs */}
          {zoneArcs.map((z, i) => (
            <Path
              key={i}
              d={arcPath(cx, cy, midR, z.startAngle, z.endAngle - 0.8)}
              stroke={z.color}
              strokeWidth={stroke}
              fill="none"
              strokeOpacity={0.88}
            />
          ))}

          {/* Gap dividers between zones */}
          {zoneArcs.slice(0, -1).map((z, i) => (
            <Path
              key={`gap-${i}`}
              d={arcPath(cx, cy, midR, z.endAngle - 0.8, z.endAngle + 0.4)}
              stroke={cardBg}
              strokeWidth={stroke + 3}
              fill="none"
            />
          ))}

          {/* Tick marks */}
          {tickValues.map(t => {
            const angle = deg2rad(START_DEG + ((t - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG);
            const tx1 = cx + (outerR + 3)  * Math.cos(angle);
            const ty1 = cy + (outerR + 3)  * Math.sin(angle);
            const tx2 = cx + (outerR + 10) * Math.cos(angle);
            const ty2 = cy + (outerR + 10) * Math.sin(angle);
            const tlx = cx + (outerR + 22) * Math.cos(angle);
            const tly = cy + (outerR + 22) * Math.sin(angle);
            return (
              <G key={t}>
                <Path
                  d={`M ${tx1} ${ty1} L ${tx2} ${ty2}`}
                  stroke={textMuted}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={tlx}
                  y={tly + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={textMuted}
                  fontFamily={FONTS.bodySemiBold}
                >
                  {t}
                </SvgText>
              </G>
            );
          })}

          {/* Inner fill (hides inner portion of arcs) */}
          <Circle cx={cx} cy={cy} r={innerR - 1} fill={cardBg} />

          {/* BMI value in center */}
          <SvgText
            x={cx}
            y={cy - 14}
            textAnchor="middle"
            fontSize={34}
            fontFamily={FONTS.heading}
            fill={textMain}
            letterSpacing={1}
          >
            {typeof bmi === 'number' ? bmi.toFixed(1) : String(bmi)}
          </SvgText>

          {/* Category label */}
          <SvgText
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fontSize={11}
            fontFamily={FONTS.bodyBold}
            fill={activeColor}
            letterSpacing={0.8}
          >
            {(bmiCategory || '').toUpperCase()}
          </SvgText>
        </Svg>

        {/* Animated needle — separate Animated.View for smooth rotation */}
        <Animated.View
          style={[StyleSheet.absoluteFill, {
            transform: [
              { translateX: cx },
              { translateY: cy },
              { rotate: needleRotate },
              { translateX: -cx },
              { translateY: -cy },
            ],
          }]}
          pointerEvents="none"
        >
          <Svg width={size} height={size}>
            {/* Shaft */}
            <Path
              d={`M ${cx - 2.5} ${cy + 8} L ${cx} ${cy - (midR - 14)} L ${cx + 2.5} ${cy + 8} Z`}
              fill={textMain}
              opacity={0.92}
            />
            {/* Hub glow */}
            <Circle cx={cx} cy={cy} r={12} fill={activeColor} opacity={0.18} />
            <Circle cx={cx} cy={cy} r={8}  fill={activeColor} />
            <Circle cx={cx} cy={cy} r={3.5} fill={cardBg} />
          </Svg>
        </Animated.View>
      </View>

      {/* Zone legend */}
      <View style={[styles.legend, { borderTopColor: divider }]}>
        {ZONES.map(z => {
          const isActive = bmi >= z.min && bmi < z.max;
          return (
            <View key={z.label} style={styles.legendItem}>
              <View style={[styles.legendDot, {
                backgroundColor: z.color,
                opacity: isActive ? 1 : 0.38,
              }]} />
              <Text style={[styles.legendLabel, {
                color    : isActive ? (isDark ? '#fff' : '#111') : textMuted,
                fontFamily: isActive ? FONTS.bodyBold : FONTS.bodySemiBold,
              }]}>
                {z.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '88%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
});
