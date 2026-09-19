import React, { memo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image, type ImageProps } from 'expo-image';

export interface AppImageBackgroundProps {
  source: any;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Universal cross-platform ImageBackground component powered by expo-image.
 * Fixes the notorious React Native Web bug (Issue #1820) where standard ImageBackground
 * blows up to natural image dimensions (e.g. 1920x1080) or collapses to 0 height on web,
 * while maintaining 100% native performance on Android and iOS.
 */
function AppImageBackground({
  source,
  style,
  imageStyle,
  resizeMode = 'cover',
  children,
  ...props
}: AppImageBackgroundProps) {
  const contentFit: ImageProps['contentFit'] =
    resizeMode === 'contain' ? 'contain' :
    resizeMode === 'stretch' ? 'fill' :
    resizeMode === 'center' ? 'none' : 'cover';

  const flattened = StyleSheet.flatten(style) as ViewStyle | undefined;
  const borderRadiusStyle = flattened ? {
    borderRadius: flattened.borderRadius,
    borderTopLeftRadius: flattened.borderTopLeftRadius,
    borderTopRightRadius: flattened.borderTopRightRadius,
    borderBottomLeftRadius: flattened.borderBottomLeftRadius,
    borderBottomRightRadius: flattened.borderBottomRightRadius,
  } : undefined;

  return (
    <View style={[styles.container, style]} {...props}>
      <Image
        source={source}
        style={[
          StyleSheet.absoluteFillObject,
          styles.image,
          borderRadiusStyle,
          imageStyle,
        ]}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        allowDownscaling={true}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default memo(AppImageBackground);
