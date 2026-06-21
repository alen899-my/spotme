import * as ImageManipulator from 'expo-image-manipulator';

export type ImagePreset = 'profile' | 'workout' | 'meal' | 'physique';

type PresetConfig = {
  maxWidth: number;
  quality: number;
};

const presets: Record<ImagePreset, PresetConfig> = {
  profile:  { maxWidth: 800,  quality: 0.8 },
  workout:  { maxWidth: 1200, quality: 0.7 },
  meal:     { maxWidth: 1000, quality: 0.8 },
  physique: { maxWidth: 1200, quality: 0.85 },
};

export async function optimizeImage(
  uri: string,
  preset: ImagePreset = 'workout',
): Promise<string> {
  const { maxWidth, quality } = presets[preset];

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );

  return result.uri;
}
