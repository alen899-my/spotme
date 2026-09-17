import React, { useMemo } from 'react';
import { useUnits } from '../../../contexts/UnitContext';
import {
  normalizeEquipment,
  getDefaultConfig,
  resolveVisualConfigFromWeight,
  getPlateOptions,
  isExactReconstruction,
} from './equipmentUtils';
import { EquipmentType, EquipmentConfiguration } from './types';

import BarbellBuilder from './equipment/BarbellBuilder';
import DumbbellBuilder from './equipment/DumbbellBuilder';
import KettlebellBuilder from './equipment/KettlebellBuilder';
import CableBuilder from './equipment/CableBuilder';
import MachineBuilder from './equipment/MachineBuilder';
import BandBuilder from './equipment/BandBuilder';
import GenericEquipmentBuilder from './equipment/GenericEquipmentBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// EquipmentRenderer
// Dispatches to the correct builder based on normalized equipment type.
// ─────────────────────────────────────────────────────────────────────────────

interface EquipmentRendererProps {
  /** Raw equipment string from activeExercise.equipment */
  rawEquipment: string | null | undefined;
  /** Stored weight (kg) — used in edit mode to reconstruct visual */
  storedWeightKg?: number;
  /** If true, we're editing an existing set */
  isEditing?: boolean;
  /** Called whenever the visual configuration produces a new numeric weight (kg) */
  onWeightChange: (weightKg: number) => void;
}

const EquipmentRenderer = React.memo(({
  rawEquipment,
  storedWeightKg = 0,
  isEditing = false,
  onWeightChange,
}: EquipmentRendererProps) => {
  const { unitSystem } = useUnits();
  const isImperial = unitSystem === 'imperial';

  const equipmentType: EquipmentType = useMemo(
    () => normalizeEquipment(rawEquipment),
    [rawEquipment],
  );

  // Build initial config: if editing and weight > 0, reconstruct from stored weight
  const initialConfig: EquipmentConfiguration = useMemo(() => {
    if (isEditing && storedWeightKg > 0) {
      return resolveVisualConfigFromWeight(storedWeightKg, equipmentType, isImperial);
    }
    return getDefaultConfig(equipmentType);
  }, [equipmentType, isEditing, storedWeightKg, isImperial]);

  // Check if edit-mode reconstruction is approximate (barbell only)
  const isApproximate = useMemo(() => {
    if (!isEditing || equipmentType === 'body_weight' || equipmentType === 'cardio') return false;
    if (
      equipmentType === 'barbell' ||
      equipmentType === 'ez_barbell' ||
      equipmentType === 'olympic_barbell' ||
      equipmentType === 'trap_bar'
    ) {
      const cfg = initialConfig as any;
      return !isExactReconstruction(
        cfg.plateQuantities ?? {},
        cfg.barWeightKg ?? 20,
        storedWeightKg,
      );
    }
    return false;
  }, [isEditing, equipmentType, initialConfig, storedWeightKg]);

  // ─── Dispatch ───────────────────────────────────────────────────────────────
  switch (equipmentType) {
    case 'barbell':
    case 'ez_barbell':
    case 'olympic_barbell':
    case 'trap_bar':
      return (
        <BarbellBuilder
          equipmentType={equipmentType}
          initialConfig={initialConfig as any}
          isApproximate={isApproximate}
          onWeightChange={onWeightChange}
        />
      );

    case 'dumbbell':
      return (
        <DumbbellBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );

    case 'kettlebell':
      return (
        <KettlebellBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );

    case 'cable':
      return (
        <CableBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );

    case 'machine':
      return (
        <MachineBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );

    case 'band':
      return (
        <BandBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );

    // Bodyweight & cardio: no weight UI
    case 'body_weight':
    case 'cardio':
      return null;

    default:
      return (
        <GenericEquipmentBuilder
          initialConfig={initialConfig as any}
          onWeightChange={onWeightChange}
        />
      );
  }
});

export default EquipmentRenderer;
