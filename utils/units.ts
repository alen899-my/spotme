export type UnitSystem = 'metric' | 'imperial';

export const WEIGHT_UNIT_OPTIONS = ['kg', 'lbs'] as const;
export const HEIGHT_UNIT_OPTIONS = ['cm', 'in'] as const;
export const BODY_UNIT_OPTIONS = ['cm', 'in'] as const;

export const DEFAULT_WEIGHT_UNIT = 'kg';
export const DEFAULT_HEIGHT_UNIT = 'cm';
export const DEFAULT_BODY_UNIT = 'cm';

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function inToFtIn(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function parseStoredWeight(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const str = String(val).trim().toLowerCase();
  const numeric = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
  if (str.includes('lb')) return numeric * 0.453592;
  return numeric;
}

export function parseStoredHeight(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const str = String(val).trim();
  if (str.includes("'")) {
    const parts = str.split("'");
    const ft = parseFloat(parts[0]) || 0;
    const inc = parseFloat((parts[1] || '').replace(/[^0-9.]/g, '')) || 0;
    return ft * 30.48 + inc * 2.54;
  }
  const numeric = parseFloat(str) || 0;
  if (str.includes('in')) return numeric * 2.54;
  return numeric;
}

export function displayStoredWeight(val: string | number | null | undefined, system: UnitSystem): string {
  return formatWeight(parseStoredWeight(val), system);
}

export function displayStoredHeight(val: string | number | null | undefined, system: UnitSystem): string {
  return formatHeight(parseStoredHeight(val), system);
}

export function formatWeight(kg: number, system: UnitSystem): string {
  const val = Number(kg) || 0;
  if (system === 'imperial') {
    return `${(kgToLbs(val)).toFixed(1)} lbs`;
  }
  return `${Number(val.toFixed(1))} kg`;
}

export function formatWeightValue(kg: number, system: UnitSystem): string {
  const val = Number(kg) || 0;
  if (system === 'imperial') {
    return (kgToLbs(val)).toFixed(1);
  }
  return Number(val.toFixed(1)).toString();
}

export function formatHeight(cm: number, system: UnitSystem): string {
  const val = Number(cm) || 0;
  if (system === 'imperial') {
    return inToFtIn(cmToIn(val));
  }
  return `${Math.round(val)} cm`;
}

export function weightUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'lbs' : 'kg';
}

export function weightUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)';
}

export function heightUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'ft' : 'cm';
}

export function heightUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'Height (ft)' : 'Height (cm)';
}

export function volumeUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'Volume (lbs)' : 'Volume (kg)';
}

export function formatRecordValue(metricType: string | undefined, value: number | string | undefined, system: UnitSystem): string {
  const numeric = Number(value) || 0;
  if (!numeric) return '0';
  if (metricType === 'max_reps') return `${Math.round(numeric)} reps`;
  const val = system === 'imperial' ? kgToLbs(numeric).toFixed(1) : numeric.toFixed(1);
  const unit = system === 'imperial' ? 'lbs' : 'kg';
  return `${val} ${unit} est. 1RM`;
}

export function formatBodyWeight(kg: number, system: UnitSystem): string {
  const val = Number(kg) || 0;
  if (system === 'imperial') {
    return `${(kgToLbs(val)).toFixed(1)} lbs`;
  }
  return `${Number(val.toFixed(1))} kg`;
}
