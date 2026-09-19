import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { ImageProps } from 'expo-image';

type OptimizedImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  source?: any;
};

export default function OptimizedImage({ uri, source: propSource, style, ...props }: OptimizedImageProps) {
  const source = propSource !== undefined ? propSource : (uri ? { uri } : null);
  const flattened = StyleSheet.flatten(style);
  const isAbsolute = flattened?.position === 'absolute';

  return (
    <Image
      source={source}
      style={[
        isAbsolute && { width: '100%', height: '100%' },
        style,
      ]}
      contentFit="cover"
      cachePolicy="disk"
      transition={300}
      {...props}
    />
  );
}
