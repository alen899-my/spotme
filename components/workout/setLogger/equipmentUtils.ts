// ─────────────────────────────────────────────────────────────────────────────
// Equipment Utilities — normalization and configuration
// ─────────────────────────────────────────────────────────────────────────────

import {
  EquipmentType,
  PlateOption,
  PlateQuantityMap,
  PlateSpec,
  PlateSwatch,
  EquipmentPreset,
  BarbellConfig,
  DumbbellConfig,
  KettlebellConfig,
  CableConfig,
  MachineConfig,
  BandConfig,
  BodyWeightConfig,
  GenericConfig,
  EquipmentConfiguration,
} from './types';

// ─── Normalization ────────────────────────────────────────────────────────────

const EQUIPMENT_MAP: Record<string, EquipmentType> = {
  'barbell':          'barbell',
  'olympic barbell':  'olympic_barbell',
  'olympic_barbell':  'olympic_barbell',
  'ez barbell':       'ez_barbell',
  'ez_barbell':       'ez_barbell',
  'ez bar':           'ez_barbell',
  'trap bar':         'trap_bar',
  'trap_bar':         'trap_bar',
  'dumbbell':         'dumbbell',
  'dumbbells':        'dumbbell',
  'cable':            'cable',
  'machine':          'machine',
  'leverage machine': 'machine',
  'smith machine':    'machine',
  'kettlebell':       'kettlebell',
  'band':             'band',
  'resistance band':  'band',
  'assisted':         'band',
  'body weight':      'body_weight',
  'bodyweight':       'body_weight',
  'body_weight':      'body_weight',
  'cardio':           'cardio',
};

export function normalizeEquipment(raw: string | null | undefined): EquipmentType {
  if (!raw) return 'generic';
  const key = raw.trim().toLowerCase();
  return EQUIPMENT_MAP[key] ?? 'generic';
}

// ─── Bar weights (kg) ─────────────────────────────────────────────────────────

export const BAR_WEIGHTS: Record<string, number> = {
  barbell:         20,
  olympic_barbell: 20,
  ez_barbell:      10,
  trap_bar:        25,
};

export function getBarWeightKg(type: EquipmentType): number {
  return BAR_WEIGHTS[type] ?? 20;
}

export const LB_TO_KG = 0.45359237;

// ─── Plate Specs for 3D Realism (face, deep, edge, ink, thickness, radius) ───

export const SPEC_KG: Record<number, PlateSpec> = {
  25:   { face: '#b9231c', deep: '#64130f', edge: '#ef4438', ink: '#fff0ef', t: 16, ry: 66 },
  20:   { face: '#2b2f34', deep: '#15181b', edge: '#4b535b', ink: '#e8ecef', t: 15, ry: 62 },
  15:   { face: '#17a05c', deep: '#0a5c34', edge: '#35d98b', ink: '#eafff4', t: 13, ry: 56 },
  10:   { face: '#e0b515', deep: '#8a6c05', edge: '#ffdf6b', ink: '#2a2100', t: 11, ry: 48 },
  5:    { face: '#1b6ed0', deep: '#0d3a72', edge: '#5aa9ff', ink: '#eaf5ff', t: 8.5, ry: 38 },
  2.5:  { face: '#cc3730', deep: '#701a16', edge: '#ff7b73', ink: '#fff0ef', t: 6.5, ry: 30 },
  1.25: { face: '#98a3ad', deep: '#4d565e', edge: '#dbe3ea', ink: '#14171a', t: 5.5, ry: 24 },
  0.5:  { face: '#b9c3cb', deep: '#5c666e', edge: '#eaf1f6', ink: '#14171a', t: 4.5, ry: 19 },
  0.25: { face: '#cfd8dc', deep: '#78909c', edge: '#eceff1', ink: '#14171a', t: 3.5, ry: 16 },
};

export const SPEC_LBS: Record<number, PlateSpec> = {
  45:   { face: '#2b2f34', deep: '#15181b', edge: '#4b535b', ink: '#e8ecef', t: 16, ry: 64 },
  35:   { face: '#17a05c', deep: '#0a5c34', edge: '#35d98b', ink: '#eafff4', t: 14, ry: 58 },
  25:   { face: '#e0b515', deep: '#8a6c05', edge: '#ffdf6b', ink: '#2a2100', t: 12, ry: 50 },
  10:   { face: '#1b6ed0', deep: '#0d3a72', edge: '#5aa9ff', ink: '#eaf5ff', t: 9,   ry: 40 },
  5:    { face: '#cc3730', deep: '#701a16', edge: '#ff7b73', ink: '#fff0ef', t: 7,   ry: 32 },
  2.5:  { face: '#98a3ad', deep: '#4d565e', edge: '#dbe3ea', ink: '#14171a', t: 5.5, ry: 25 },
  1.25: { face: '#b9c3cb', deep: '#5c666e', edge: '#eaf1f6', ink: '#14171a', t: 5.0, ry: 21 },
  0.5:  { face: '#a0aec0', deep: '#4a5568', edge: '#edf2f7', ink: '#14171a', t: 4.5, ry: 18 },
  0.25: { face: '#cfd8dc', deep: '#78909c', edge: '#eceff1', ink: '#14171a', t: 3.5, ry: 15 },
};

export const KG_PLATES: PlateOption[] = [
  { weightKg: 25,   label: '25',   color: '#b9231c', ringColor: '#ef4438' },
  { weightKg: 20,   label: '20',   color: '#2b2f34', ringColor: '#4b535b' },
  { weightKg: 15,   label: '15',   color: '#17a05c', ringColor: '#35d98b' },
  { weightKg: 10,   label: '10',   color: '#e0b515', ringColor: '#ffdf6b' },
  { weightKg: 5,    label: '5',    color: '#1b6ed0', ringColor: '#5aa9ff' },
  { weightKg: 2.5,  label: '2.5',  color: '#cc3730', ringColor: '#ff7b73' },
  { weightKg: 1.25, label: '1.25', color: '#98a3ad', ringColor: '#dbe3ea' },
  { weightKg: 0.5,  label: '0.5',  color: '#b9c3cb', ringColor: '#eaf1f6' },
  { weightKg: 0.25, label: '0.25', color: '#cfd8dc', ringColor: '#eceff1' },
];

export const LBS_PLATES: PlateOption[] = [
  { weightKg: 45 * LB_TO_KG,   label: '45',   color: '#2b2f34', ringColor: '#4b535b' },
  { weightKg: 35 * LB_TO_KG,   label: '35',   color: '#17a05c', ringColor: '#35d98b' },
  { weightKg: 25 * LB_TO_KG,   label: '25',   color: '#e0b515', ringColor: '#ffdf6b' },
  { weightKg: 10 * LB_TO_KG,   label: '10',   color: '#1b6ed0', ringColor: '#5aa9ff' },
  { weightKg: 5  * LB_TO_KG,   label: '5',    color: '#cc3730', ringColor: '#ff7b73' },
  { weightKg: 2.5* LB_TO_KG,   label: '2.5',  color: '#98a3ad', ringColor: '#dbe3ea' },
  { weightKg: 1.25 * LB_TO_KG, label: '1.25', color: '#b9c3cb', ringColor: '#eaf1f6' },
  { weightKg: 0.5  * LB_TO_KG, label: '0.5',  color: '#a0aec0', ringColor: '#edf2f7' },
  { weightKg: 0.25 * LB_TO_KG, label: '0.25', color: '#cfd8dc', ringColor: '#eceff1' },
];

export function getPlateOptions(isImperial: boolean): PlateOption[] {
  return isImperial ? LBS_PLATES : KG_PLATES;
}

export function getPlateSpec(plate: PlateOption, isImperial: boolean): PlateSpec {
  const num = parseFloat(plate.label);
  const specMap = isImperial ? SPEC_LBS : SPEC_KG;
  return specMap[num] ?? {
    face: plate.color,
    deep: '#15181b',
    edge: plate.ringColor,
    ink: '#ffffff',
    t: 10,
    ry: 45,
  };
}

// ─── Universal Weight Chips: 0.5, 1, 2, 2.5, 5, 7.5, 10, 12.5, 15 ... 100 ──────

export const STANDARD_WEIGHT_CHIPS_KG: number[] = [
  0.5, 1, 2, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20,
  22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45,
  47.5, 50, 52.5, 55, 57.5, 60, 62.5, 65, 67.5, 70,
  72.5, 75, 77.5, 80, 82.5, 85, 87.5, 90, 92.5, 95,
  97.5, 100,
];

export const DUMBBELL_WEIGHTS_KG = STANDARD_WEIGHT_CHIPS_KG;

export const KETTLEBELL_WEIGHTS_KG = STANDARD_WEIGHT_CHIPS_KG;

export const CABLE_WEIGHTS_KG = STANDARD_WEIGHT_CHIPS_KG;

export const MACHINE_WEIGHTS_KG = STANDARD_WEIGHT_CHIPS_KG;

// ─── Plate decomposition ──────────────────────────────────────────────────────

/**
 * Given a target weight per side (kg), find the optimal plate arrangement.
 * Uses a greedy descending algorithm.
 * Returns plateQuantities (plate weightKg → count per side).
 */
export function plateConfigFromSideWeight(
  sideWeightKg: number,
  plates: PlateOption[],
): PlateQuantityMap {
  const sorted = [...plates].sort((a, b) => b.weightKg - a.weightKg);
  const quantities: PlateQuantityMap = {};
  let remaining = Math.max(0, sideWeightKg);

  for (const plate of sorted) {
    const count = Math.floor(remaining / plate.weightKg + 0.001); // small epsilon for float precision
    if (count > 0) {
      quantities[plate.weightKg] = count;
      remaining -= count * plate.weightKg;
      remaining = Math.round(remaining * 1000) / 1000; // avoid float drift
    }
  }

  return quantities;
}

/**
 * Check if a plate quantity map exactly reconstructs the target weight.
 */
export function isExactReconstruction(
  plateQuantities?: PlateQuantityMap | null,
  barWeightKg: number = 20,
  targetWeightKg: number = 0,
): boolean {
  if (!plateQuantities || typeof plateQuantities !== 'object') return false;
  const platesTotal = Object.entries(plateQuantities).reduce(
    (sum, [w, count]) => sum + (parseFloat(w) || 0) * (Number(count) || 0) * 2,
    0,
  );
  const total = Math.round((barWeightKg + platesTotal) * 1000) / 1000;
  return Math.abs(total - targetWeightKg) < 0.1;
}

// ─── Default configurations ───────────────────────────────────────────────────

export function getDefaultConfig(type: EquipmentType): EquipmentConfiguration {
  switch (type) {
    case 'barbell':
    case 'olympic_barbell':
    case 'ez_barbell':
    case 'trap_bar':
      return {
        type,
        barWeightKg: getBarWeightKg(type),
        plateQuantities: {},
      } as BarbellConfig;
    case 'dumbbell':
      return { type: 'dumbbell', weightPerDumbbell: 10 } as DumbbellConfig;
    case 'kettlebell':
      return { type: 'kettlebell', selectedWeightKg: 16 } as KettlebellConfig;
    case 'cable':
      return { type: 'cable', selectedWeightKg: 20 } as CableConfig;
    case 'machine':
      return { type: 'machine', selectedWeightKg: 40 } as MachineConfig;
    case 'band':
      return { type: 'band', level: 1 } as BandConfig;
    case 'body_weight':
    case 'cardio':
      return { type } as BodyWeightConfig;
    default:
      return { type: 'generic', selectedWeightKg: 0 } as GenericConfig;
  }
}

// ─── Resolve visual config from stored weight (for edit mode) ──────────────────

export function resolveVisualConfigFromWeight(
  storedWeightKg: number,
  equipment: EquipmentType,
  isImperial: boolean,
): EquipmentConfiguration {
  const plates = getPlateOptions(isImperial);

  switch (equipment) {
    case 'barbell':
    case 'olympic_barbell':
    case 'ez_barbell':
    case 'trap_bar': {
      const barWeight = getBarWeightKg(equipment);
      const sideWeight = (storedWeightKg - barWeight) / 2;
      const plateQuantities = sideWeight > 0
        ? plateConfigFromSideWeight(sideWeight, plates)
        : {};
      return { type: equipment, barWeightKg: barWeight, plateQuantities } as BarbellConfig;
    }
    case 'dumbbell':
      return { type: 'dumbbell', weightPerDumbbell: storedWeightKg / 2 || storedWeightKg } as DumbbellConfig;
    case 'kettlebell':
      return { type: 'kettlebell', selectedWeightKg: storedWeightKg } as KettlebellConfig;
    case 'cable':
      return { type: 'cable', selectedWeightKg: storedWeightKg } as CableConfig;
    case 'machine':
      return { type: 'machine', selectedWeightKg: storedWeightKg } as MachineConfig;
    case 'body_weight':
    case 'cardio':
      return { type: equipment } as BodyWeightConfig;
    case 'band':
      return { type: 'band', level: 1 } as BandConfig;
    default:
      return { type: 'generic', selectedWeightKg: storedWeightKg } as GenericConfig;
  }
}

// ─── Plate Swatches (for preset rows and logged set cards) ────────────────────

export function getPlateSwatchesForWeight(
  totalWeightKg: number,
  equipment: EquipmentType,
  isImperial: boolean = false,
): PlateSwatch[] {
  if (totalWeightKg <= 0) return [];
  const plates = getPlateOptions(isImperial);
  const specMap = isImperial ? SPEC_LBS : SPEC_KG;

  if (
    equipment === 'barbell' ||
    equipment === 'olympic_barbell' ||
    equipment === 'ez_barbell' ||
    equipment === 'trap_bar'
  ) {
    const barWeight = getBarWeightKg(equipment);
    const sideWeight = (totalWeightKg - barWeight) / 2;
    if (sideWeight <= 0) return [];

    const quantities = plateConfigFromSideWeight(sideWeight, plates);
    const swatches: PlateSwatch[] = [];

    // Sort descending
    const sortedWeights = Object.keys(quantities || {})
      .map(Number)
      .sort((a, b) => b - a);

    for (const w of sortedWeights) {
      const count = quantities[w];
      const opt = plates.find(p => Math.abs(p.weightKg - w) < 0.05);
      const label = opt ? opt.label : String(w);
      const spec = specMap[parseFloat(label)] ?? { face: opt?.color ?? '#2b2f34' };
      for (let i = 0; i < count; i++) {
        swatches.push({
          color: spec.face,
          label,
          weightKg: w,
        });
      }
    }
    return swatches;
  }

  if (equipment === 'dumbbell') {
    const eachKg = totalWeightKg / 2;
    const opt = plates.find(p => Math.abs(p.weightKg - eachKg) < 0.5);
    const color = opt ? opt.color : '#16a9ff';
    return [{ color, label: `${eachKg}kg`, weightKg: eachKg }];
  }

  if (equipment === 'machine' || equipment === 'cable') {
    return [{ color: '#16a9ff', label: `${totalWeightKg}kg`, weightKg: totalWeightKg }];
  }

  return [];
}

// ─── Default / Recent Presets Generator ───────────────────────────────────────

export function getDefaultPresets(
  equipment: EquipmentType,
  barWeightKg: number = 20,
  isImperial: boolean = false,
  previousSets?: any[],
): EquipmentPreset[] {
  const plates = getPlateOptions(isImperial);

  // If previous sets exist from workout history, construct presets from them
  if (previousSets && previousSets.length > 0) {
    const valid = previousSets
      .filter(s => s && !s.skipped && Number(s.weight) > 0)
      .slice(-3);

    if (valid.length > 0) {
      return valid.map((s, idx) => {
        const wKg = Number(s.weight);
        const reps = Number(s.reps) || 10;
        const swatches = getPlateSwatchesForWeight(wKg, equipment, isImperial);

        let plateMap: PlateQuantityMap = {};
        if (
          equipment === 'barbell' ||
          equipment === 'olympic_barbell' ||
          equipment === 'ez_barbell' ||
          equipment === 'trap_bar'
        ) {
          const sideW = Math.max(0, (wKg - barWeightKg) / 2);
          plateMap = plateConfigFromSideWeight(sideW, plates);
        }

        const label = swatches.length
          ? swatches.map(sw => sw.label).join(' + ')
          : `${wKg} ${isImperial ? 'lb' : 'kg'}`;

        return {
          id: `prev-${idx}`,
          plates: plateMap,
          weightKg: wKg,
          reps,
          label,
          totalWeightKg: wKg,
          swatches,
        };
      });
    }
  }

  // Fallback realistic presets based on equipment
  if (
    equipment === 'barbell' ||
    equipment === 'olympic_barbell' ||
    equipment === 'ez_barbell' ||
    equipment === 'trap_bar'
  ) {
    if (isImperial) {
      // e.g. 135 lb (45s), 185 lb (45 + 25), 225 lb (45 + 45)
      const p45 = 45 * LB_TO_KG;
      const p25 = 25 * LB_TO_KG;
      return [
        {
          id: 'pre-1',
          plates: { [p45]: 1, [p25]: 1 },
          reps: 8,
          totalWeightKg: 45 * LB_TO_KG + (p45 + p25) * 2,
          label: '45 + 25',
          swatches: [
            { color: SPEC_LBS[45].face, label: '45', weightKg: p45 },
            { color: SPEC_LBS[25].face, label: '25', weightKg: p25 },
          ],
        },
        {
          id: 'pre-2',
          plates: { [p45]: 1 },
          reps: 10,
          totalWeightKg: 45 * LB_TO_KG + p45 * 2,
          label: '45',
          swatches: [{ color: SPEC_LBS[45].face, label: '45', weightKg: p45 }],
        },
        {
          id: 'pre-3',
          plates: { [p25]: 1 },
          reps: 12,
          totalWeightKg: 45 * LB_TO_KG + p25 * 2,
          label: '25',
          swatches: [{ color: SPEC_LBS[25].face, label: '25', weightKg: p25 }],
        },
      ];
    } else {
      // Metric: 100kg (20+15+5), 80kg (20+10), 60kg (20)
      return [
        {
          id: 'pre-1',
          plates: { 20: 1, 15: 0, 10: 1, 5: 1 },
          reps: 8,
          totalWeightKg: barWeightKg + (20 + 10 + 5) * 2,
          label: '20 + 10 + 5',
          swatches: [
            { color: SPEC_KG[20].face, label: '20', weightKg: 20 },
            { color: SPEC_KG[10].face, label: '10', weightKg: 10 },
            { color: SPEC_KG[5].face, label: '5', weightKg: 5 },
          ],
        },
        {
          id: 'pre-2',
          plates: { 20: 1, 10: 1 },
          reps: 10,
          totalWeightKg: barWeightKg + (20 + 10) * 2,
          label: '20 + 10',
          swatches: [
            { color: SPEC_KG[20].face, label: '20', weightKg: 20 },
            { color: SPEC_KG[10].face, label: '10', weightKg: 10 },
          ],
        },
        {
          id: 'pre-3',
          plates: { 20: 1 },
          reps: 12,
          totalWeightKg: barWeightKg + 20 * 2,
          label: '20',
          swatches: [{ color: SPEC_KG[20].face, label: '20', weightKg: 20 }],
        },
      ];
    }
  }

  if (equipment === 'dumbbell') {
    return [
      { id: 'pre-1', weightKg: 24, reps: 8, totalWeightKg: 24 * 2, label: '24 kg each', swatches: [{ color: '#16a9ff', label: '24', weightKg: 24 }] },
      { id: 'pre-2', weightKg: 20, reps: 10, totalWeightKg: 20 * 2, label: '20 kg each', swatches: [{ color: '#16a9ff', label: '20', weightKg: 20 }] },
      { id: 'pre-3', weightKg: 16, reps: 12, totalWeightKg: 16 * 2, label: '16 kg each', swatches: [{ color: '#16a9ff', label: '16', weightKg: 16 }] },
    ];
  }

  if (equipment === 'machine') {
    return [
      { id: 'pre-1', weightKg: 65, reps: 8, totalWeightKg: 65, label: '65 kg stack', swatches: [{ color: '#16a9ff', label: '65', weightKg: 65 }] },
      { id: 'pre-2', weightKg: 55, reps: 10, totalWeightKg: 55, label: '55 kg stack', swatches: [{ color: '#16a9ff', label: '55', weightKg: 55 }] },
      { id: 'pre-3', weightKg: 45, reps: 12, totalWeightKg: 45, label: '45 kg stack', swatches: [{ color: '#16a9ff', label: '45', weightKg: 45 }] },
    ];
  }

  if (equipment === 'cable') {
    return [
      { id: 'pre-1', weightKg: 35, reps: 10, totalWeightKg: 35, label: '35 kg stack', swatches: [{ color: '#16a9ff', label: '35', weightKg: 35 }] },
      { id: 'pre-2', weightKg: 25, reps: 12, totalWeightKg: 25, label: '25 kg stack', swatches: [{ color: '#16a9ff', label: '25', weightKg: 25 }] },
      { id: 'pre-3', weightKg: 20, reps: 15, totalWeightKg: 20, label: '20 kg stack', swatches: [{ color: '#16a9ff', label: '20', weightKg: 20 }] },
    ];
  }

  return [];
}

// ─── Dumbbell Visual Specifications (Color & Size by Weight) ─────────────────

export interface DumbbellStyleSpec {
  color: string;
  accent: string;
  darkColor: string;
  headHeight: number;
  headWidth: number;
  cornerRadius: number;
}

export function getDumbbellStyle(weightKg: number): DumbbellStyleSpec {
  if (weightKg <= 2.5) {
    return {
      color: '#06B6D4',
      accent: '#67E8F9',
      darkColor: '#0E7490',
      headHeight: 28,
      headWidth: 14,
      cornerRadius: 6,
    };
  }
  if (weightKg <= 5) {
    return {
      color: '#64748B',
      accent: '#94A3B8',
      darkColor: '#334155',
      headHeight: 32,
      headWidth: 16,
      cornerRadius: 7,
    };
  }
  if (weightKg <= 10) {
    return {
      color: '#10B981',
      accent: '#34D399',
      darkColor: '#047857',
      headHeight: 38,
      headWidth: 18,
      cornerRadius: 8,
    };
  }
  if (weightKg <= 15) {
    return {
      color: '#F59E0B',
      accent: '#FCD34D',
      darkColor: '#B45309',
      headHeight: 42,
      headWidth: 20,
      cornerRadius: 9,
    };
  }
  if (weightKg <= 20) {
    return {
      color: '#3B82F6',
      accent: '#60A5FA',
      darkColor: '#1D4ED8',
      headHeight: 46,
      headWidth: 22,
      cornerRadius: 9,
    };
  }
  if (weightKg <= 25) {
    return {
      color: '#EF4444',
      accent: '#F87171',
      darkColor: '#B91C1C',
      headHeight: 50,
      headWidth: 24,
      cornerRadius: 10,
    };
  }
  if (weightKg <= 30) {
    return {
      color: '#8B5CF6',
      accent: '#A78BFA',
      darkColor: '#6D28D9',
      headHeight: 53,
      headWidth: 25,
      cornerRadius: 10,
    };
  }
  if (weightKg <= 40) {
    return {
      color: '#F97316',
      accent: '#FB923C',
      darkColor: '#C2410C',
      headHeight: 56,
      headWidth: 26,
      cornerRadius: 11,
    };
  }
  if (weightKg <= 50) {
    return {
      color: '#84CC16',
      accent: '#A3E635',
      darkColor: '#4D7C0F',
      headHeight: 59,
      headWidth: 27,
      cornerRadius: 11,
    };
  }
  return {
    color: '#0EA5E9',
    accent: '#7DD3FC',
    darkColor: '#0369A1',
    headHeight: 62,
    headWidth: 28,
    cornerRadius: 12,
  };
}
