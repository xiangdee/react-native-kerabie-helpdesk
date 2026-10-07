import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KerEnrichmentField, KerTheme } from '../types';
import { KerPalette } from '../theme/palette';

interface Props {
  fields: KerEnrichmentField[];
  title: string;
  subtitle: string;
  submitLabel: string;
  /** The built-in name + email form still needs at least one way to follow up. */
  requireContact: boolean;
  initial: Record<string, string>;
  theme: KerTheme;
  palette: KerPalette;
  onSubmit: (answers: Record<string, string>) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The pre-chat form — the org's own questions (dashboard: Messages > Pre-chat form), or the
 * built-in name + email form. Mirrors the web widget's ChatScreen enrichment form: required /
 * optional, email and number checks, multiple choice as tappable options.
 */
export function PreChatForm({ fields, title, subtitle, submitLabel, requireContact, initial, theme, palette, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [error, setError] = useState('');

  const validate = (): string => {
    for (const f of fields) {
      const v = (answers[f.key] ?? '').trim();
      if (f.required && !v) return `${f.label} is required`;
      if (v && f.type === 'email' && !EMAIL_RE.test(v)) return 'Enter a valid email address';
      if (v && f.type === 'number' && Number.isNaN(Number(v))) return `${f.label} must be a number`;
    }
    if (requireContact && !(answers.name ?? '').trim() && !(answers.email ?? '').trim()) {
      return 'Enter a name or email so we can follow up';
    }
    return '';
  };

  const submit = () => {
    const problem = validate();
    setError(problem);
    if (!problem) onSubmit(answers);
  };

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.inputBackground, fontFamily: theme.fontFamily }];

  return (
    <View style={[styles.root, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text, fontFamily: theme.fontFamily }]}>{title}</Text>
      <Text style={[styles.sub, { color: palette.textMuted, fontFamily: theme.fontFamily }]}>{subtitle}</Text>
      <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
        {fields.map((f) => (
          <View key={f.key} style={{ gap: 4 }}>
            <Text style={[styles.label, { color: palette.textMuted }]}>
              {f.label}{f.required ? '' : ' (optional)'}
            </Text>
            {f.type === 'select' ? (
              <View style={styles.choices}>
                {(f.options ?? []).map((o) => {
                  const selected = answers[f.key] === o;
                  return (
                    <TouchableOpacity
                      key={o}
                      onPress={() => setAnswers((a) => ({ ...a, [f.key]: o }))}
                      style={[styles.choice, { borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primary : 'transparent' }]}
                    >
                      <Text style={{ color: selected ? palette.onPrimary : palette.text, fontSize: 13 }}>{o}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TextInput
                value={answers[f.key] ?? ''}
                onChangeText={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={palette.textSubtle}
                multiline={f.type === 'textarea'}
                keyboardType={f.type === 'email' ? 'email-address' : f.type === 'phone' ? 'phone-pad' : f.type === 'number' ? 'numeric' : 'default'}
                autoCapitalize={f.type === 'email' ? 'none' : 'sentences'}
                style={[inputStyle, f.type === 'textarea' ? { minHeight: 70, textAlignVertical: 'top' } : null]}
              />
            )}
          </View>
        ))}
      </ScrollView>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={[styles.btn, { backgroundColor: palette.primary }]} onPress={submit}>
        <Text style={[styles.btnText, { color: palette.onPrimary }]}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: -6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  error: { color: '#dc2626', fontSize: 12 },
  btn: { borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
});
