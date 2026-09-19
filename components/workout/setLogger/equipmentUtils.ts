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
  PlateLoadedMachineConfig,
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
  // Free weights & Barbells
  'barbell':              'barbell',
  'olympic barbell':      'olympic_barbell',
  'olympic_barbell':      'olympic_barbell',
  'ez barbell':           'ez_barbell',
  'ez_barbell':           'ez_barbell',
  'ez bar':               'ez_barbell',
  'ez-bar':               'ez_barbell',
  'trap bar':             'trap_bar',
  'trap_bar':             'trap_bar',
  'hex bar':              'trap_bar',
  'smith machine':        'smith_machine',
  'smith_machine':        'smith_machine',
  'smith':                'smith_machine',

  // Dumbbells
  'dumbbell':             'dumbbell',
  'dumbbells':            'dumbbell',

  // Kettlebell
  'kettlebell':           'kettlebell',
  'kettlebells':          'kettlebell',

  // Cables
  'cable':                'cable',
  'cables':               'cable',
  'cable machine':        'cable',

  // Selectorized Pin Stack Machines
  'machine':              'machine',
  'pin machine':          'machine',
  'selectorized':         'machine',

  // Plate-Loaded Machines
  'leverage machine':     'plate_loaded_machine',
  'sled machine':         'plate_loaded_machine',
  'plate loaded':         'plate_loaded_machine',
  'plate loaded machine': 'plate_loaded_machine',
  'plate_loaded':         'plate_loaded_machine',

  // Bands & Assisted
  'band':                 'band',
  'resistance band':      'band',
  'bands':                'band',
  'assisted':             'band',

  // Bodyweight & Mobility (Timer + Reps only, no weight plate UI)
  'body weight':          'body_weight',
  'bodyweight':           'body_weight',
  'body_weight':          'body_weight',
  'calisthenics':         'body_weight',
  'wheel roller':         'body_weight',
  'roller':               'body_weight',
  'bosu ball':            'body_weight',
  'stability ball':       'body_weight',

  // Cardio (Duration timer only)
  'cardio':               'cardio',
  'elliptical machine':   'cardio',
  'stationary bike':      'cardio',
  'stepmill machine':     'cardio',
  'skierg machine':       'cardio',
  'upper body ergometer': 'cardio',
  'rope':                 'cardio',

  // Generic / Weighted / Functional
  'weighted':             'generic',
  'medicine ball':        'generic',
  'hammer':               'generic',
  'tire':                 'generic',
};

export function normalizeEquipment(raw: string | null | undefined): EquipmentType {
  if (!raw) return 'generic';
  const key = raw.trim().toLowerCase();
  return EQUIPMENT_MAP[key] ?? 'generic';
}

// ─── Bar weights (kg) ─────────────────────────────────────────────────────────

export const BAR_WEIGHTS: Record<string, number> = {
  barbell:              20,
  olympic_barbell:      20,
  ez_barbell:           10,
  trap_bar:             25,
  smith_machine:        15, // Standard counterbalanced smith bar tare
  plate_loaded_machine: 0,
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

export const CABLE_STACK_WEIGHTS_KG: number[] = [
  2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100,
];

export const CABLE_STACK_WEIGHTS_LBS: number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200,
];

export const MACHINE_STACK_WEIGHTS_KG: number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150,
];

export const MACHINE_STACK_WEIGHTS_LBS: number[] = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 175, 190, 205, 220, 250, 275, 300,
];

export const CABLE_WEIGHTS_KG = CABLE_STACK_WEIGHTS_KG;

export const MACHINE_WEIGHTS_KG = MACHINE_STACK_WEIGHTS_KG;

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
    case 'smith_machine':
      return {
        type,
        barWeightKg: getBarWeightKg(type),
        plateQuantities: {},
      } as BarbellConfig;
    case 'plate_loaded_machine':
      return {
        type: 'plate_loaded_machine',
        startingResistanceKg: 0,
        plateQuantities: {},
      } as PlateLoadedMachineConfig;
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
    case 'trap_bar':
    case 'smith_machine': {
      const barWeight = getBarWeightKg(equipment);
      const sideWeight = (storedWeightKg - barWeight) / 2;
      const plateQuantities = sideWeight > 0
        ? plateConfigFromSideWeight(sideWeight, plates)
        : {};
      return { type: equipment, barWeightKg: barWeight, plateQuantities } as BarbellConfig;
    }
    case 'plate_loaded_machine': {
      const sideWeight = storedWeightKg / 2;
      const plateQuantities = sideWeight > 0
        ? plateConfigFromSideWeight(sideWeight, plates)
        : {};
      return {
        type: 'plate_loaded_machine',
        startingResistanceKg: 0,
        plateQuantities,
      } as PlateLoadedMachineConfig;
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
    equipment === 'trap_bar' ||
    equipment === 'smith_machine'
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

  if (equipment === 'plate_loaded_machine') {
    const sideWeight = totalWeightKg / 2;
    if (sideWeight <= 0) return [];

    const quantities = plateConfigFromSideWeight(sideWeight, plates);
    const swatches: PlateSwatch[] = [];
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
          equipment === 'trap_bar' ||
          equipment === 'smith_machine'
        ) {
          const sideW = Math.max(0, (wKg - barWeightKg) / 2);
          plateMap = plateConfigFromSideWeight(sideW, plates);
        } else if (equipment === 'plate_loaded_machine') {
          const sideW = Math.max(0, wKg / 2);
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
    equipment === 'trap_bar' ||
    equipment === 'smith_machine'
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

  if (equipment === 'plate_loaded_machine') {
    if (isImperial) {
      const p45 = 45 * LB_TO_KG;
      const p25 = 25 * LB_TO_KG;
      return [
        {
          id: 'pre-plm-1',
          plates: { [p45]: 2 },
          reps: 8,
          totalWeightKg: p45 * 4,
          label: '90 lb/peg',
          swatches: [
            { color: SPEC_LBS[45].face, label: '45', weightKg: p45 },
            { color: SPEC_LBS[45].face, label: '45', weightKg: p45 },
          ],
        },
        {
          id: 'pre-plm-2',
          plates: { [p45]: 1, [p25]: 1 },
          reps: 10,
          totalWeightKg: (p45 + p25) * 2,
          label: '70 lb/peg',
          swatches: [
            { color: SPEC_LBS[45].face, label: '45', weightKg: p45 },
            { color: SPEC_LBS[25].face, label: '25', weightKg: p25 },
          ],
        },
        {
          id: 'pre-plm-3',
          plates: { [p45]: 1 },
          reps: 12,
          totalWeightKg: p45 * 2,
          label: '45 lb/peg',
          swatches: [{ color: SPEC_LBS[45].face, label: '45', weightKg: p45 }],
        },
      ];
    } else {
      return [
        {
          id: 'pre-plm-1',
          plates: { 20: 2 },
          reps: 8,
          totalWeightKg: 80,
          label: '40 kg/peg',
          swatches: [
            { color: SPEC_KG[20].face, label: '20', weightKg: 20 },
            { color: SPEC_KG[20].face, label: '20', weightKg: 20 },
          ],
        },
        {
          id: 'pre-plm-2',
          plates: { 20: 1, 10: 1 },
          reps: 10,
          totalWeightKg: 60,
          label: '30 kg/peg',
          swatches: [
            { color: SPEC_KG[20].face, label: '20', weightKg: 20 },
            { color: SPEC_KG[10].face, label: '10', weightKg: 10 },
          ],
        },
        {
          id: 'pre-plm-3',
          plates: { 20: 1 },
          reps: 12,
          totalWeightKg: 40,
          label: '20 kg/peg',
          swatches: [{ color: SPEC_KG[20].face, label: '20', weightKg: 20 }],
        },
      ];
    }
  }

  if (equipment === 'dumbbell') {
    return [
      { id: 'pre-1', weightKg: 24, reps: 8, totalWeightKg: 24 * 2, label: '24 kg each', swatches: [{ color: getDumbbellStyle(24).color, label: '24', weightKg: 24 }] },
      { id: 'pre-2', weightKg: 20, reps: 10, totalWeightKg: 20 * 2, label: '20 kg each', swatches: [{ color: getDumbbellStyle(20).color, label: '20', weightKg: 20 }] },
      { id: 'pre-3', weightKg: 16, reps: 12, totalWeightKg: 16 * 2, label: '16 kg each', swatches: [{ color: getDumbbellStyle(16).color, label: '16', weightKg: 16 }] },
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

/**
 * Curated distinct colors for every dumbbell weight.
 * Every single standard weight and common increment has a completely unique color.
 */
const DUMBBELL_EXACT_COLORS: Record<number, { color: string; accent: string; darkColor: string }> = {
  0.5:  { color: '#64748B', accent: '#94A3B8', darkColor: '#334155' }, // Slate Pearl
  1:    { color: '#06B6D4', accent: '#67E8F9', darkColor: '#0E7490' }, // Arctic Cyan
  1.5:  { color: '#38BDF8', accent: '#7DD3FC', darkColor: '#0284C7' }, // Sky Frost
  2:    { color: '#0EA5E9', accent: '#38BDF8', darkColor: '#0369A1' }, // Pacific Aqua
  2.5:  { color: '#14B8A6', accent: '#5EEAD4', darkColor: '#0F766E' }, // Mint Teal
  3:    { color: '#2DD4BF', accent: '#99F6E4', darkColor: '#115E59' }, // Seafoam
  4:    { color: '#10B981', accent: '#6EE7B7', darkColor: '#047857' }, // Jade Green
  5:    { color: '#059669', accent: '#34D399', darkColor: '#064E3B' }, // Vibrant Emerald
  6:    { color: '#84CC16', accent: '#BEF264', darkColor: '#4D7C0F' }, // Lime Apple
  7:    { color: '#65A30D', accent: '#A3E635', darkColor: '#3F6212' }, // Citron
  7.5:  { color: '#EAB308', accent: '#FDE047', darkColor: '#A16207' }, // Solar Yellow
  8:    { color: '#F59E0B', accent: '#FCD34D', darkColor: '#B45309' }, // Amber Gold
  9:    { color: '#D97706', accent: '#FBBF24', darkColor: '#92400E' }, // Ochre
  10:   { color: '#F97316', accent: '#FDBA74', darkColor: '#C2410C' }, // Blaze Orange
  11:   { color: '#EA580C', accent: '#FB923C', darkColor: '#9A3412' }, // Rust Copper
  12:   { color: '#FB7185', accent: '#FDA4AF', darkColor: '#E11D48' }, // Coral Punch
  12.5: { color: '#F43F5E', accent: '#FECDD3', darkColor: '#BE123C' }, // Flamingo Rose
  13:   { color: '#E11D48', accent: '#FB7185', darkColor: '#9F1239' }, // Crimson Flame
  14:   { color: '#DC2626', accent: '#F87171', darkColor: '#991B1B' }, // Ruby Red
  15:   { color: '#EF4444', accent: '#FCA5A5', darkColor: '#B91C1C' }, // Olympic Scarlet
  16:   { color: '#BE185D', accent: '#F472B6', darkColor: '#831843' }, // Rose Wine
  17:   { color: '#C026D3', accent: '#E879F9', darkColor: '#86198F' }, // Fuchsia Berry
  17.5: { color: '#D946EF', accent: '#F0ABFC', darkColor: '#A21CAF' }, // Neon Orchid
  18:   { color: '#A855F7', accent: '#D8B4FE', darkColor: '#7E22CE' }, // Electric Violet
  20:   { color: '#9333EA', accent: '#C084FC', darkColor: '#6B21A8' }, // Royal Purple
  22:   { color: '#8B5CF6', accent: '#C4B5FD', darkColor: '#6D28D9' }, // Deep Iris
  22.5: { color: '#6366F1', accent: '#A5B4FC', darkColor: '#4338CA' }, // Imperial Indigo
  24:   { color: '#4F46E5', accent: '#818CF8', darkColor: '#3730A3' }, // Royal Blue
  25:   { color: '#3B82F6', accent: '#93C5FD', darkColor: '#1D4ED8' }, // Cobalt Blue
  26:   { color: '#2563EB', accent: '#60A5FA', darkColor: '#1E40AF' }, // Electric Azure
  27.5: { color: '#0284C7', accent: '#38BDF8', darkColor: '#075985' }, // Cerulean
  28:   { color: '#0891B2', accent: '#22D3EE', darkColor: '#155E75' }, // Deep Cyan
  30:   { color: '#0D9488', accent: '#2DD4BF', darkColor: '#115E59' }, // Persian Teal
  32:   { color: '#047857', accent: '#34D399', darkColor: '#064E3B' }, // Deep Pine
  32.5: { color: '#15803D', accent: '#4ADE80', darkColor: '#14532D' }, // Rainforest Green
  34:   { color: '#166534', accent: '#22C55E', darkColor: '#052E16' }, // Forest Hunter
  35:   { color: '#4D7C0F', accent: '#84CC16', darkColor: '#365314' }, // Olive Moss
  36:   { color: '#A16207', accent: '#EAB308', darkColor: '#713F12' }, // Mustard Gold
  37.5: { color: '#CA8A04', accent: '#FACC15', darkColor: '#854D0E' }, // Amber Bronze
  38:   { color: '#C2410C', accent: '#FB923C', darkColor: '#7C2D12' }, // Burnt Orange
  40:   { color: '#B91C1C', accent: '#EF4444', darkColor: '#7F1D1D' }, // Lava Red
  42.5: { color: '#9F1239', accent: '#FB7185', darkColor: '#4C0519' }, // Claret Ruby
  45:   { color: '#7E22CE', accent: '#C084FC', darkColor: '#581C87' }, // Plum Purple
  47.5: { color: '#7C3AED', accent: '#A78BFA', darkColor: '#4C1D95' }, // Velvet Purple
  50:   { color: '#4338CA', accent: '#818CF8', darkColor: '#312E81' }, // Midnight Indigo
  52.5: { color: '#1D4ED8', accent: '#60A5FA', darkColor: '#172554' }, // Atlantic Blue
  55:   { color: '#1E40AF', accent: '#3B82F6', darkColor: '#1E3A8A' }, // Deep Navy
  57.5: { color: '#0F766E', accent: '#2DD4BF', darkColor: '#134E4A' }, // Caribbean Teal
  60:   { color: '#14532D', accent: '#16A34A', darkColor: '#052E16' }, // Alpine Pine
  62.5: { color: '#92400E', accent: '#F59E0B', darkColor: '#451A03' }, // Desert Ochre
  65:   { color: '#9A3412', accent: '#F97316', darkColor: '#431407' }, // Terracotta
  67.5: { color: '#991B1B', accent: '#F87171', darkColor: '#450A0A' }, // Cardinal Scarlet
  70:   { color: '#831843', accent: '#F472B6', darkColor: '#500724' }, // Black Cherry
  72.5: { color: '#6B21A8', accent: '#A855F7', darkColor: '#3B0764' }, // Royal Blackberry
  75:   { color: '#3730A3', accent: '#6366F1', darkColor: '#1E1B4B' }, // Deep Abyss
  77.5: { color: '#1E3A8A', accent: '#38BDF8', darkColor: '#0F172A' }, // Twilight Cobalt
  80:   { color: '#064E3B', accent: '#10B981', darkColor: '#022C22' }, // Dark Emerald
  82.5: { color: '#78350F', accent: '#D97706', darkColor: '#451A03' }, // Molten Bronze
  85:   { color: '#7F1D1D', accent: '#DC2626', darkColor: '#450A0A' }, // Crimson Forge
  87.5: { color: '#581C87', accent: '#9333EA', darkColor: '#3B0764' }, // Tyrian Purple
  90:   { color: '#334155', accent: '#94A3B8', darkColor: '#0F172A' }, // Titanium Grey
  92.5: { color: '#0F172A', accent: '#38BDF8', darkColor: '#020617' }, // Deep Space
  95:   { color: '#18181B', accent: '#A1A1AA', darkColor: '#09090B' }, // Cast Charcoal
  97.5: { color: '#1C1917', accent: '#F59E0B', darkColor: '#0C0A09' }, // Onyx Bronze
  100:  { color: '#0F172A', accent: '#FBBF24', darkColor: '#020617' }, // Champion Gold
};

function getDumbbellColor(weightKg: number): { color: string; accent: string; darkColor: string } {
  const roundedKey = Math.round(weightKg * 10) / 10;
  if (DUMBBELL_EXACT_COLORS[roundedKey]) {
    return DUMBBELL_EXACT_COLORS[roundedKey];
  }
  // Deterministic golden-ratio hue fallback for custom fractional weights
  const hue = Math.round((Math.abs(weightKg) * 137.508) % 360);
  return {
    color: `hsl(${hue}, 76%, 50%)`,
    accent: `hsl(${hue}, 88%, 68%)`,
    darkColor: `hsl(${hue}, 80%, 34%)`,
  };
}

export function getDumbbellStyle(weightKg: number): DumbbellStyleSpec {
  const colors = getDumbbellColor(weightKg);
  const safeKg = Math.max(0.5, weightKg);

  return {
    color: colors.color,
    accent: colors.accent,
    darkColor: colors.darkColor,
    headHeight: 28 + Math.min(34, Math.sqrt(safeKg) * 3.4),
    headWidth: 14 + Math.min(14, Math.sqrt(safeKg) * 1.4),
    cornerRadius: Math.min(12, 6 + Math.round(Math.sqrt(safeKg) * 0.6)),
  };
}
