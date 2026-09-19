import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Vibration,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  revealedWidth?: number;
  confirmThreshold?: number;
  deleteLabel?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export default function SwipeableRow({
  children,
  onDelete,
  disabled = false,
  revealedWidth = 78,
  confirmThreshold = -120,
  deleteLabel = 'DELETE',
  iconName = 'trash-outline',
  iconSize = 20,
  style,
  borderRadius = 14,
}: SwipeableRowProps) {
  const panX = useRef(new Animated.Value(0)).current;
  const currentPan = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  panX.addListener(({ value }) => {
    currentPan.current = value;
  });

  const snapTo = (toValue: number, callback?: () => void) => {
    Animated.spring(panX, {
      toValue,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(toValue < 0);
      if (callback) callback();
    });
  };

  const close = () => {
    snapTo(0);
  };

  const handleDelete = () => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(30);
      }
    } catch (_) {}
    close();
    onDelete();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) return false;
        // Dominantly horizontal motion to the left, or to the right if already open
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        if (!isHorizontal) return false;

        if (currentPan.current < 0) {
          // Already open: allow dragging left or right
          return Math.abs(gestureState.dx) > 5;
        }
        // Closed: only respond to dragging left
        return gestureState.dx < -8;
      },
      onPanResponderGrant: () => {
        panX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabled) return;
        let newX = (isOpen ? -revealedWidth : 0) + gestureState.dx;

        if (newX > 0) {
          // Slight resistance when dragging right beyond 0
          newX = newX * 0.2;
        } else if (newX < -revealedWidth) {
          // Resistance when dragging further left past revealed width
          const excess = newX + revealedWidth;
          newX = -revealedWidth + excess * 0.4;
        }

        panX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled) return;

        // Forceful swipe past confirmThreshold or fast flick left
        if (gestureState.dx < confirmThreshold || (gestureState.dx < -50 && gestureState.vx < -0.8)) {
          handleDelete();
          return;
        }

        // Normal drag release
        if (isOpen) {
          // If currently open and dragged right past 25px, close
          if (gestureState.dx > 25) {
            snapTo(0);
          } else {
            snapTo(-revealedWidth);
          }
        } else {
          // If closed and dragged left past half the revealed width, snap open
          if (gestureState.dx < -revealedWidth * 0.45) {
            try {
              if (Platform.OS !== 'web') Vibration.vibrate(15);
            } catch (_) {}
            snapTo(-revealedWidth);
          } else {
            snapTo(0);
          }
        }
      },
      onPanResponderTerminate: () => {
        snapTo(isOpen ? -revealedWidth : 0);
      },
    })
  ).current;

  return (
    <View style={[styles.shadowWrap, style]}>
      <View style={[styles.container, { borderRadius }]}>
        {/* Background Revealed Delete Layer */}
        <View style={[styles.underlay, { borderRadius }]}>
          <TouchableOpacity
            style={[styles.deleteButton, { width: revealedWidth }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name={iconName} size={iconSize} color="#FFF" />
            <Text style={styles.deleteText}>{deleteLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Foreground Content */}
        <Animated.View
          style={[
            styles.frontContent,
            {
              borderRadius,
              transform: [{ translateX: panX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {children}
          {isOpen && (
            <TouchableOpacity
              style={[StyleSheet.absoluteFillObject, styles.tapToCloseOverlay]}
              activeOpacity={1}
              onPress={close}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  deleteButton: {
    height: '100%',
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  deleteText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 0.8,
  },
  frontContent: {
    width: '100%',
  },
  tapToCloseOverlay: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
});
