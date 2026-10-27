import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/** True under a view that already makes room for the keyboard, so screens inside it must not pad a second time. */
export const KeyboardHandledContext = createContext(false);

/**
 * The keyboard's height on iOS (0 on Android, where the window resizes itself, and while it is hidden).
 *
 * Apply it as bottom padding to a view that reaches the bottom of the screen, such as the widget's modal root.
 * The padding lifts the content to exactly the keyboard's top. No positions are measured, which matters inside
 * the iOS page-sheet modal: there the measured coordinates are relative to the sheet, not the screen, and an
 * offset-based padding came out short by the sheet's top margin.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      change.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * How far the keyboard overlaps the bottom of a view that does not reach the screen's bottom edge (the chat embedded in
 * the app's own screen, in push mode). Measures where the view ends and where the keyboard starts. Returns 0 inside the
 * widget, whose root already pads by the keyboard's height (see [useKeyboardHeight]).
 */
export function useKeyboardInset() {
  const handled = useContext(KeyboardHandledContext);
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  const measure = useCallback(() => {
    const top = keyboardTop.current;
    if (top == null) return setInset(0);
    ref.current?.measureInWindow((_x, y, _w, h) => setInset(Math.max(0, Math.round(y + h - top))));
  }, []);

  useEffect(() => {
    if (handled) return;
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
  }, [measure, handled]);

  return { ref, inset: handled ? 0 : inset };
}
