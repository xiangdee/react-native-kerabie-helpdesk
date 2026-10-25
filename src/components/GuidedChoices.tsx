import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { KerGuidedChoice, KerTheme } from '../types';
import type { KerPalette } from '../theme/palette';

interface Props {
  choices: KerGuidedChoice[];
  onPick: (choice: KerGuidedChoice) => void;
  disabled?: boolean;
  theme: KerTheme;
  palette: KerPalette;
}

/** The buttons of a guided flow, as the chat widget shows them: outlined pills in the brand colour, wrapping onto lines. */
export function GuidedChoices({ choices, onPick, disabled, theme, palette }: Props) {
  return (
    <View style={styles.row} accessibilityRole="menu">
      {choices.map((c) => (
        <TouchableOpacity
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={c.label}
          disabled={disabled}
          onPress={() => onPick(c)}
          activeOpacity={0.7}
          style={[styles.pill, { borderColor: palette.accent, backgroundColor: palette.background, opacity: disabled ? 0.5 : 1 }]}
        >
          <Text style={[styles.label, { color: palette.accent, fontFamily: theme.fontFamily }]}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  pill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500' },
});
