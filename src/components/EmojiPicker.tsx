import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { EMOJI_GROUPS, EmojiEntry } from '../data/emoji';
import { StorageService } from '../services/storage.service';
import type { KerPalette } from '../theme/palette';

interface Props {
  onSelect: (emoji: string) => void;
  palette: KerPalette;
}

const RECENTS_KEY = 'recent_emoji';
const MAX_RECENTS = 24;
const ALL = EMOJI_GROUPS.flatMap((g) => g.emoji);
const BY_EMOJI = new Map(ALL.map((x) => [x.e, x] as const));

export function EmojiPicker({ onSelect, palette }: Props) {
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const [activeId, setActiveId] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  useEffect(() => {
    StorageService.get<string[]>(RECENTS_KEY).then((r) => { if (Array.isArray(r)) setRecents(r); }).catch(() => {});
  }, []);

  const sections = useMemo(() => {
    const recentEntries: EmojiEntry[] = recents.map((e) => BY_EMOJI.get(e) ?? { e, k: '' });
    return [
      ...(recentEntries.length ? [{ id: 'recent', label: 'Recently used', icon: '🕘', emoji: recentEntries }] : []),
      ...EMOJI_GROUPS,
    ];
  }, [recents]);

  // Every typed word must match the emoji's name or keywords ("red heart", "thumbs up").
  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? ALL.filter((x) => words.every((w) => x.k.includes(w))) : [];
  }, [query]);

  const pick = (e: string) => {
    const next = [e, ...recents.filter((x) => x !== e)].slice(0, MAX_RECENTS);
    setRecents(next);
    StorageService.set(RECENTS_KEY, next).catch(() => {});
    onSelect(e);
  };

  const jumpTo = (id: string) => {
    setActiveId(id);
    scrollRef.current?.scrollTo({ y: offsets.current[id] ?? 0, animated: true });
  };

  // Highlights the tab of whichever section is at the top of the list.
  const onScroll = (y: number) => {
    let current = sections[0]?.id ?? '';
    for (const s of sections) if ((offsets.current[s.id] ?? Infinity) <= y + 8) current = s.id;
    if (current !== activeId) setActiveId(current);
  };

  const grid = (list: EmojiEntry[]) => (
    <View style={styles.grid}>
      {list.map((x) => (
        <TouchableOpacity key={x.e} style={styles.item} onPress={() => pick(x.e)} accessibilityLabel={x.k.split(' ').slice(0, 3).join(' ')}>
          <Text style={styles.itemText}>{x.e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const current = activeId || sections[0]?.id;

  return (
    <View style={[styles.container, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search emoji"
        placeholderTextColor={palette.textSubtle}
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.search, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
      />

      {!query && (
        <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => jumpTo(s.id)}
              accessibilityRole="tab"
              accessibilityLabel={s.label}
              accessibilityState={{ selected: current === s.id }}
              style={[styles.tab, current === s.id && { borderBottomColor: palette.accent }]}
            >
              <Text style={[styles.tabIcon, { opacity: current === s.id ? 1 : 0.5 }]}>{s.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => !query && onScroll(e.nativeEvent.contentOffset.y)}
      >
        {query ? (
          <View>
            <Text style={[styles.groupLabel, { color: palette.textSubtle }]}>Results</Text>
            {results.length ? grid(results) : <Text style={[styles.empty, { color: palette.textSubtle }]}>No emoji found</Text>}
          </View>
        ) : (
          sections.map((s) => (
            <View key={s.id} onLayout={(e) => { offsets.current[s.id] = e.nativeEvent.layout.y; }}>
              <Text style={[styles.groupLabel, { color: palette.textSubtle }]}>{s.label}</Text>
              {grid(s.emoji)}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    width: 288,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  search: {
    marginHorizontal: 10,
    height: 34,
    paddingHorizontal: 10,
    fontSize: 13.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabIcon: { fontSize: 15 },
  list: { height: 200, paddingHorizontal: 10 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { fontSize: 20 },
  empty: { textAlign: 'center', fontSize: 13, marginVertical: 24 },
});
