import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KerTheme } from '../types';
import { KerPalette } from '../theme/palette';
import { Icon } from './Icon';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  theme: KerTheme;
  palette: KerPalette;
  children: React.ReactNode;
  /** Footer buttons (e.g. Cancel / Save). */
  footer?: React.ReactNode;
}

// In-app dialog built on React Native's own <Modal> (no extra dependency) —
// replaces native Alert.alert popups. Mirrors the web widget's WidgetModal.vue.
export function KerModal({ visible, title, onClose, theme, palette, children, footer }: Props) {
  const { ref, inset } = useKeyboardInset();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View ref={ref} style={[styles.root, { paddingBottom: inset }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.card, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text, fontFamily: theme.fontFamily }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close">
              <Icon name="close" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>{children}</View>
          {!!footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '600' },
  close: { fontSize: 16 },
  body: { gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
