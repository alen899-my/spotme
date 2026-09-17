// ─────────────────────────────────────────────────────────────────────────────
// Weight Utilities — calculate total weight from equipment configuration
// ─────────────────────────────────────────────────────────────────────────────

import { UnitSystem } from '../../../utils/units';
import { formatWeight, formatWeightValue, weightUnit, kgToLbs } from '../../../utils/units';
import {
  EquipmentConfiguration,
  WeightCalculationResult,
  PlateQuantityMap,
} from './types';

// ─── Core calculation ─────────────────────────────────────────────────────────

export function calculateEquipmentWeight(
  config: EquipmentConfiguration,
  unitSystem: UnitSystem,
): WeightCalculationResult {
  const unit = weightUnit(unitSystem);

  switch (config.type) {
    case 'barbell':
    case 'ez_barbell':
    case 'olympic_barbell':
    case 'trap_bar': {
      const platesTotal = calcPlatesTotal(config.plateQuantities);
      const total = Math.round((config.barWeightKg + platesTotal) * 100) / 100;
      const perSide = Math.round((platesTotal / 2) * 100) / 100;

      const displayTotal = formatWeightValue(total, unitSystem);
      const barDisplay = formatWeightValue(config.barWeightKg, unitSystem);
      const sideDisplay = formatWeightValue(perSide, unitSystem);

      return {
        totalWeightKg: total,
        displayWeight: `${displayTotal} ${unit}`,
        perSideKg: perSide,
        details: `${barDisplay}${unit} bar · ${sideDisplay}${unit}/side`,
      };
    }

    case 'dumbbell': {
      const perDb = Math.round(config.weightPerDumbbell * 100) / 100;
      const total = Math.round(perDb * 2 * 100) / 100;
      const displayPer = formatWeightValue(perDb, unitSystem);
      const displayTotal = formatWeightValue(total, unitSystem);

      return {
        totalWeightKg: total,
        displayWeight: `${displayPer} ${unit}`,
        perDumbbellKg: perDb,
        details: `each · ${displayTotal}${unit} total`,
      };
    }

    case 'kettlebell': {
      const w = config.selectedWeightKg;
      return {
        totalWeightKg: w,
        displayWeight: `${formatWeightValue(w, unitSystem)} ${unit}`,
        details: 'kettlebell',
      };
    }

    case 'cable': {
      const w = config.selectedWeightKg;
      return {
        totalWeightKg: w,
        displayWeight: `${formatWeightValue(w, unitSystem)} ${unit}`,
        details: 'cable stack',
      };
    }

    case 'machine': {
      const w = config.selectedWeightKg;
      return {
        totalWeightKg: w,
        displayWeight: `${formatWeightValue(w, unitSystem)} ${unit}`,
        details: 'weight stack',
      };
    }

    case 'band': {
      const labels = ['Light', 'Medium', 'Heavy', 'X-Heavy'];
      return {
        totalWeightKg: 0,
        displayWeight: labels[config.level] ?? 'Medium',
        details: 'resistance band',
      };
    }

    case 'body_weight':
    case 'cardio':
      return {
        totalWeightKg: 0,
        displayWeight: 'Bodyweight',
        details: '',
      };

    default: {
      const w = (config as any).selectedWeightKg ?? 0;
      return {
        totalWeightKg: w,
        displayWeight: `${formatWeightValue(w, unitSystem)} ${unit}`,
        details: '',
      };
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcPlatesTotal(quantities?: PlateQuantityMap | null): number {
  if (!quantities || typeof quantities !== 'object') return 0;
  const sum = Object.entries(quantities).reduce(
    (acc, [w, count]) => acc + (parseFloat(w) || 0) * (Number(count) || 0) * 2,
    0,
  );
  return Math.round(sum * 1000) / 1000;
}

/**
 * Snap a value to the nearest option in an array.
 */
export function snapToNearest(value: number, options: number[]): number {
  if (options.length === 0) return value;
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}
