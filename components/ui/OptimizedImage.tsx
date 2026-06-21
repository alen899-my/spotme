import { Image } from 'expo-image';
import type { ImageProps } from 'expo-image';

type OptimizedImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null;
};

export default function OptimizedImage({ uri, style, ...props }: OptimizedImageProps) {
  const source = uri ? { uri } : null;

  return (
    <Image
      source={source}
      style={style}
      contentFit="cover"
      cachePolicy="disk"
      transition={300}
      {...props}
    />
  );
}
