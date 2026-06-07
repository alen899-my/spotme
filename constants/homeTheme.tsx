import { Dimensions } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;

export const scale = (n: number) => Math.round((SW / BASE_W) * n);
export const vs    = (n: number) => Math.round((SH / 844)  * n);

// ── Theme palette ─────────────────────────────────────────────────────────────
export const P = {
  sun:      "#F7CB16",
  sunDeep:  "#E7B100",
  sunLight: "#FEF6D0",
  cta:      "#2596BE",
  ctaDark:  "#1a6e8a",
  ctaDeep:  "#0d4d65",
  ctaLight: "#D6EEF7",
  ink:      "#04282B",
  inkDeep:  "#021518",
  white:    "#FFFFFF",
  offWhite: "#F5F9FC",
  muted:    "#6B8E9A",
  border:   "#B8D8E8",
};

// ── XP Tier colours ───────────────────────────────────────────────────────────
export const TIER_COLORS: Record<string, [string, string]> = {
  Bronze:      ["#CD7F32", "#8B4513"],
  Silver:      ["#A8A9AD", "#6C6C6C"],
  Gold:        ["#FFD700", "#B8860B"],
  Platinum:    ["#00C9C8", "#007BFF"],
  Diamond:     ["#B9F2FF", "#00BFFF"],
  Master:      ["#9B59B6", "#6C3483"],
  Grandmaster: ["#E91E63", "#880E4F"],
  Elite:       ["#FF5722", "#BF360C"],
  Champion:    ["#E00000", "#7F0000"],
  Legend:      ["#FF9900", "#E00000"],
};

export const TIER_XP: Record<string, number> = {
  Bronze: 0, Silver: 2000, Gold: 6000, Platinum: 12000, Diamond: 24000,
  Master: 40000, Grandmaster: 60000, Elite: 80000, Champion: 120000, Legend: 200000,
};

export const TIER_ORDER = Object.keys(TIER_XP);

export function getXPProgress(tier: string, totalXP: number) {
  const idx     = TIER_ORDER.indexOf(tier);
  const current = TIER_XP[tier] || 0;
  const next    = TIER_XP[TIER_ORDER[idx + 1]] ?? current + 5000;
  const progress = Math.min((totalXP - current) / (next - current), 1);
  return {
    progress: isNaN(progress) ? 0 : progress,
    nextTier: TIER_ORDER[idx + 1] || "Legend",
    xpToNext: Math.max(next - totalXP, 0),
  };
}

export function getBMIStatus(bmi: number): { fitnessStatus: string; fitnessColor: string } {
  if      (bmi < 17)   return { fitnessStatus: "Severely Underweight", fitnessColor: "#F59E0B" };
  else if (bmi < 18.5) return { fitnessStatus: "Underweight",          fitnessColor: "#FBBF24" };
  else if (bmi < 22)   return { fitnessStatus: "Lean & Athletic",      fitnessColor: "#10B981" };
  else if (bmi < 25)   return { fitnessStatus: "Healthy Weight",       fitnessColor: "#34D399" };
  else if (bmi < 30)   return { fitnessStatus: "Overweight",           fitnessColor: "#F97316" };
  else if (bmi < 35)   return { fitnessStatus: "Obese",                fitnessColor: "#EF4444" };
  else                  return { fitnessStatus: "Severely Obese",       fitnessColor: "#DC2626" };
}