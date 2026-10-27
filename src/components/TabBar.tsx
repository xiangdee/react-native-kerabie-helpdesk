import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, IconName } from './Icon';
import type { KerPalette } from '../theme/palette';

export type WidgetTab = 'home' | 'chat' | 'help' | 'tickets';

interface Props {
  active: WidgetTab;
  ticketsEnabled: boolean;
  unread: number;
  onChange: (tab: WidgetTab) => void;
  palette: KerPalette;
  fontFamily?: string;
}

const TABS: { key: WidgetTab; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'help', label: 'Help', icon: 'help' },
  { key: 'tickets', label: 'Tickets', icon: 'tickets' },
];

// Bottom tabs — same sections, icons and order as the web widget's TabsNavigation.vue.
export function TabBar({ active, ticketsEnabled, unread, onChange, palette, fontFamily }: Props) {
  return (
    <View style={[styles.bar, { backgroundColor: palette.background, borderTopColor: palette.border }]} accessibilityRole="tablist">
      {TABS.filter((t) => t.key !== 'tickets' || ticketsEnabled).map((t) => {
        const on = t.key === active;
        const color = on ? palette.accent : palette.textMuted;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={[styles.indicator, { backgroundColor: on ? palette.accent : 'transparent' }]} />
            <View>
              <Icon name={t.icon} size={22} color={color} />
              {t.key === 'chat' && unread > 0 && (
                <View style={[styles.badge, { backgroundColor: palette.primary }]}>
                  <Text style={[styles.badgeText, { color: palette.onPrimary }]}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color, fontFamily, fontWeight: on ? '700' : '500' }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 4, gap: 3 },
  indicator: { height: 2, width: 28, borderRadius: 1, marginBottom: 7 },
  label: { fontSize: 11 },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '700' },
});
