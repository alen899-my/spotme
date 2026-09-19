// ─────────────────────────────────────────────────────────────────────────────
// Set Logger — Core Types
// ─────────────────────────────────────────────────────────────────────────────
import { Animated } from 'react-native';

export type EquipmentType =
  | 'barbell'
  | 'ez_barbell'
  | 'olympic_barbell'
  | 'trap_bar'
  | 'smith_machine'
  | 'plate_loaded_machine'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'kettlebell'
  | 'band'
  | 'body_weight'
  | 'cardio'
  | 'generic';

// ─── Plate ───────────────────────────────────────────────────────────────────

export interface PlateOption {
  /** Weight in kg */
  weightKg: number;
  /** Display label (e.g. "20" or "45") */
  label: string;
  /** Hex color for the plate visual */
  color: string;
  /** Ring/accent color */
  ringColor: string;
}

export interface PlateSpec {
  face: string;
  deep: string;
  edge: string;
  ink: string;
  t: number;
  ry: number;
}

export interface PlateSwatch {
  color: string;
  label: string;
  weightKg: number;
}

export interface EquipmentPreset {
  id?: string;
  plates?: PlateQuantityMap;
  weightKg?: number;
  reps: number;
  label?: string;
  totalWeightKg: number;
  swatches?: PlateSwatch[];
}

/** plateWeightKg → count placed on each side */
export type PlateQuantityMap = Record<number, number>;

// ─── Equipment Configuration ──────────────────────────────────────────────────

export interface BarbellConfig {
  type: 'barbell' | 'ez_barbell' | 'olympic_barbell' | 'trap_bar' | 'smith_machine';
  barWeightKg: number;
  plateQuantities: PlateQuantityMap;
}

export interface PlateLoadedMachineConfig {
  type: 'plate_loaded_machine';
  startingResistanceKg: number;
  plateQuantities: PlateQuantityMap;
}

export interface DumbbellConfig {
  type: 'dumbbell';
  /** Weight per dumbbell in kg */
  weightPerDumbbell: number;
}

export interface KettlebellConfig {
  type: 'kettlebell';
  selectedWeightKg: number;
}

export interface CableConfig {
  type: 'cable';
  selectedWeightKg: number;
}

export interface MachineConfig {
  type: 'machine';
  selectedWeightKg: number;
}

export interface BandConfig {
  type: 'band';
  /** 0=Light, 1=Medium, 2=Heavy, 3=X-Heavy */
  level: number;
}

export interface BodyWeightConfig {
  type: 'body_weight' | 'cardio';
}

export interface GenericConfig {
  type: 'generic';
  selectedWeightKg: number;
}

export type EquipmentConfiguration =
  | BarbellConfig
  | PlateLoadedMachineConfig
  | DumbbellConfig
  | KettlebellConfig
  | CableConfig
  | MachineConfig
  | BandConfig
  | BodyWeightConfig
  | GenericConfig;

// ─── Weight Calculation Result ────────────────────────────────────────────────

export interface WeightCalculationResult {
  /** Always in kg — what goes to the API */
  totalWeightKg: number;
  /** Primary display string, respects unit system */
  displayWeight: string;
  /** Sub-label: e.g. "20kg bar · 40kg/side" or "20kg each · 40kg total" */
  details: string;
  /** For barbell: weight on each side in kg */
  perSideKg?: number;
  /** For dumbbell: per-dumbbell in display unit */
  perDumbbellKg?: number;
}

// ─── Set Logger Modal Props ────────────────────────────────────────────────────

export interface SetLoggerModalProps {
  visible: boolean;
  activeExercise: any;
  activeSetNum: number;
  editingSet: any;
  setTimer: number;
  setTimerRunning: boolean;
  inputWeight: string;
  inputReps: string;
  loadingLogSet: boolean;
  loadingEditSet: boolean;
  loadingSkip: boolean;
  keyboardHeight: number;
  workoutElapsed: number;
  restTimer: number;
  setModalSlideAnim: Animated.Value;
  setModalFadeAnim: Animated.Value;
  onClose: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onChangeWeight: (w: string) => void;
  onChangeReps: (r: string) => void;
  onLogSet: () => void;
  onEditSet: () => void;
  onSkipSet: () => void;
}
