function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseWeightKg(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallback;

  const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return fallback;

  if (raw.includes('lb')) {
    return numeric * 0.45359237;
  }

  return numeric;
}

function calculateEstimatedOneRepMax(weightKg, reps) {
  const weight = Number(weightKg) || 0;
  const repCount = Number(reps) || 0;

  if (weight <= 0 || repCount <= 0) return 0;
  if (repCount === 1) return weight;

  return weight * (1 + repCount / 30);
}

function estimateWorkoutCalories({
  weightKg,
  totalDurationSeconds,
  totalRestSeconds,
  totalVolume,
  totalSets,
  totalReps,
}) {
  const bodyWeight = clamp(Number(weightKg) || 0, 35, 250);
  const durationMinutes = Math.max((Number(totalDurationSeconds) || 0) / 60, 0);

  if (!bodyWeight || durationMinutes <= 0) {
    return {
      caloriesBurned: 0,
      workoutMet: 0,
      method: 'met-strength-dynamic',
    };
  }

  const restRatio = clamp((Number(totalRestSeconds) || 0) / Math.max(Number(totalDurationSeconds) || 1, 1), 0, 1);
  const setsPerMinute = (Number(totalSets) || 0) / durationMinutes;
  const repsPerMinute = (Number(totalReps) || 0) / durationMinutes;
  const volumePerKgPerMinute = (Number(totalVolume) || 0) / Math.max(bodyWeight * durationMinutes, 1);

  const densityScore = clamp(setsPerMinute / 0.75, 0, 1);
  const repScore = clamp(repsPerMinute / 12, 0, 1);
  const volumeScore = clamp(volumePerKgPerMinute / 5, 0, 1);
  const effortScore = clamp(
    densityScore * 0.4 +
      repScore * 0.2 +
      volumeScore * 0.25 +
      (1 - restRatio) * 0.15,
    0,
    1
  );

  // Anchored to standard resistance training MET ranges:
  // general effort ≈ 3.5 MET, vigorous effort ≈ 6.0 MET.
  const workoutMet = clamp(3.5 + effortScore * 2.5, 3.5, 6.0);
  const caloriesBurned = Math.round(0.0175 * workoutMet * bodyWeight * durationMinutes);

  return {
    caloriesBurned,
    workoutMet: Number(workoutMet.toFixed(2)),
    method: 'met-strength-dynamic',
  };
}

function formatRecordValue(metricType, metricValue) {
  const value = Number(metricValue) || 0;
  if (!value) return '0';

  if (metricType === 'max_reps') {
    return `${Math.round(value)} reps`;
  }

  return `${value.toFixed(1)} kg est. 1RM`;
}

module.exports = {
  parseWeightKg,
  calculateEstimatedOneRepMax,
  estimateWorkoutCalories,
  formatRecordValue,
};
