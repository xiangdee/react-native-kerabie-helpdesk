import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/** Pop-in for a launcher: fades and springs up from a smaller size and lower position when `visible` turns true. */
export function useLauncherReveal(visible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { progress.setValue(0); return; }
    Animated.spring(progress, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [visible, progress]);

  return {
    opacity: progress,
    transform: [
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
    ],
  };
}
