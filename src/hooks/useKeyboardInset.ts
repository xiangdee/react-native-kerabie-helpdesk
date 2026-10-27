import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/**
 * How far the keyboard overlaps the bottom of a view, so the view can pad itself and keep its input visible.
 *
 * KeyboardAvoidingView assumes the view reaches the bottom of the screen, which is wrong inside the iOS page-sheet
 * modal the widget opens in (the keyboard then covers the composer) and does nothing on Android with edge-to-edge.
 * This measures where the view really ends and where the keyboard really starts, so it is right in both.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  const measure = useCallback(() => {
    const top = keyboardTop.current;
    if (top == null) return setInset(0);
    ref.current?.measureInWindow((_x, y, _w, h) => setInset(Math.max(0, Math.round(y + h - top))));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);

  return { ref, inset };
}
