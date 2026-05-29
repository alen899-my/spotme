import React, { useState } from "react";
import { View, Text, Dimensions } from "react-native";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

const { width: SW } = Dimensions.get("window");

interface WeightEntry {
  weight: string;
}

interface Props {
  data: WeightEntry[];
}

export default function WeightSparkline({ data }: Props) {
  const { colors, isDark } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <View style={{ alignItems: "center", paddingVertical: vs(16) }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: scale(13), color: isDark ? colors.textMuted : P.muted }}>
          Log workouts with weight to see your trend
        </Text>
      </View>
    );
  }

  const vals  = data.map((d) => parseFloat(d.weight));
  const min   = Math.min(...vals) - 2;
  const max   = Math.max(...vals) + 2;
  const range = max - min || 1;
  const H     = vs(80);
  const W     = SW - scale(80);
  const step  = W / (vals.length - 1);

  let pathD = "";
  vals.forEach((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    pathD += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
  });

  return (
    <View style={{ height: H + vs(30) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: vs(8) }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: scale(12), color: isDark ? colors.textMuted : P.muted }}>
          {vals[0]}kg
        </Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: scale(13), color: isDark ? colors.primary : P.cta }}>
          {vals[vals.length - 1]}kg
        </Text>
      </View>
      <View style={{ height: H, width: "100%" }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Path
            d={pathD}
            fill="none"
            stroke={isDark ? colors.primary : P.cta}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {vals.map((v, i) => {
            const x    = i * step;
            const y    = H - ((v - min) / range) * H;
            const isSel = selectedIdx === i;
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={x} cy={y}
                  r={isSel ? "6" : "4"}
                  fill={P.sun}
                  stroke={isDark ? colors.card : P.white}
                  strokeWidth="2"
                />
                <Circle
                  cx={x} cy={y}
                  r="16"
                  fill="transparent"
                  onPress={() => setSelectedIdx(isSel ? null : i)}
                />
                {isSel && (
                  <SvgText
                    x={x} y={y - 12}
                    fill={isDark ? "#FFFFFF" : P.ink}
                    fontSize={scale(12)}
                    fontFamily={FONTS.bodyBold}
                    textAnchor={i === 0 ? "start" : i === vals.length - 1 ? "end" : "middle"}
                  >
                    {v}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}