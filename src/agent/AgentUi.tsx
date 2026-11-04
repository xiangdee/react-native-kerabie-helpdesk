import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KerModal } from '../components/KerModal';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { usePalette } from '../theme/palette';
import type { AgentItem, AgentUiHandlers, AgentUiToolName } from './types';

type Request =
  | { tool: 'show_items'; payload: { title: string; items: AgentItem[] }; resolve: (v: string) => void }
  | { tool: 'confirm_action'; payload: { summary: string }; resolve: (v: string) => void }
  | { tool: 'request_address_input'; payload: { purpose: string }; resolve: (v: string) => void };

/**
 * The screens the SDK can show without help: a list to tap, a yes/no confirmation and a box to type an address. Screens that
 * need your data (saved addresses) or your design (date picker, opening a screen) are passed in by your app.
 * Returns the merged handlers, and the element to render inside the call screen.
 */
export function useAgentUi(custom: AgentUiHandlers | undefined) {
  const [request, setRequest] = useState<Request | null>(null);
  const current = useRef<Request | null>(null);

  const ask = useCallback(<R extends Request>(tool: R['tool'], payload: R['payload']) => {
    // A screen the customer never answered is closed before the next one opens, and the agent is told "none".
    current.current?.resolve('none');
    return new Promise<string>((resolve) => {
      const next = { tool, payload, resolve } as Request;
      current.current = next;
      setRequest(next);
    });
  }, []);

  const finish = useCallback((answer: string) => {
    current.current?.resolve(answer);
    current.current = null;
    setRequest(null);
  }, []);

  const handlers = useMemo<AgentUiHandlers>(
    () => ({
      show_items: (p) => ask('show_items', p),
      confirm_action: (p) => ask('confirm_action', p),
      request_address_input: (p) => ask('request_address_input', p),
      ...custom,
    }),
    [ask, custom],
  );

  const element = <AgentUiModal request={request} onDone={finish} />;
  return { handlers, element, dismiss: () => finish('none'), names: Object.keys(handlers) as AgentUiToolName[] };
}

function AgentUiModal({ request, onDone }: { request: Request | null; onDone: (answer: string) => void }) {
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);
  const { theme } = config;
  const [address, setAddress] = useState('');

  if (!request) return null;
  const font = { fontFamily: theme.fontFamily };
  const button = (label: string, onPress: () => void, primary = false, disabled = false) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.btn, { backgroundColor: primary ? palette.primary : palette.surface, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[styles.btnText, font, { color: primary ? palette.onPrimary : palette.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (request.tool === 'confirm_action') {
    return (
      <KerModal visible title="Please confirm" onClose={() => onDone('no')} theme={theme} palette={palette}
        footer={<>{button('No', () => onDone('no'))}{button('Yes', () => onDone('yes'), true)}</>}>
        <Text style={[styles.body, font, { color: palette.text }]}>{request.payload.summary}</Text>
      </KerModal>
    );
  }

  if (request.tool === 'request_address_input') {
    const cancel = () => { setAddress(''); onDone('none'); };
    const submit = () => { const a = address.trim(); setAddress(''); onDone(a || 'none'); };
    return (
      <KerModal visible title="Type your address" onClose={cancel} theme={theme} palette={palette}
        footer={<>{button('Cancel', cancel)}{button('Use this address', submit, true, address.trim().length < 5)}</>}>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="House number, street, area, city"
          placeholderTextColor={palette.textSubtle}
          multiline
          autoFocus
          style={[styles.input, font, { color: palette.text, backgroundColor: palette.inputBackground, borderColor: palette.border }]}
        />
      </KerModal>
    );
  }

  return (
    <KerModal visible title={request.payload.title} onClose={() => onDone('none')} theme={theme} palette={palette}
      footer={button('Close', () => onDone('none'))}>
      <ScrollView style={styles.list}>
        {request.payload.items.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => onDone(item.id)} accessibilityRole="button" style={[styles.row, { borderColor: palette.border }]}>
            {!!item.image && <Image source={{ uri: item.image }} style={styles.thumb} />}
            <View style={styles.rowText}>
              <Text style={[styles.name, font, { color: palette.text }]} numberOfLines={2}>{item.name}</Text>
              {!!item.subtitle && <Text style={[styles.sub, font, { color: palette.textMuted }]} numberOfLines={1}>{item.subtitle}</Text>}
            </View>
            {!!item.price && <Text style={[styles.price, font, { color: palette.text }]}>{item.price}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </KerModal>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 23 },
  btn: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnText: { fontSize: 15, fontWeight: '600' },
  input: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  list: { maxHeight: 380 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13 },
  price: { fontSize: 15, fontWeight: '700' },
});
