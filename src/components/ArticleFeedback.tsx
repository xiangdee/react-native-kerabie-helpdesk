import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

interface Props {
  articleId: number;
  textColor: string;
  borderColor: string;
}

const voteKey = (id: number) => `kb-vote:${id}`;

/**
 * "Was this helpful?" under an article. The vote feeds the helpfulness the team sees in the dashboard.
 * Mirrors kerabie-chat-widget's ArticleFeedback.vue: asked once per article, remembered on the device.
 */
export function ArticleFeedback({ articleId, textColor, borderColor }: Props) {
  const [voted, setVoted] = useState<boolean | null | undefined>(undefined); // undefined = still loading
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    StorageService.get<boolean>(voteKey(articleId)).then((v) => { if (alive) setVoted(v); }).catch(() => { if (alive) setVoted(null); });
    return () => { alive = false; };
  }, [articleId]);

  const vote = async (helpful: boolean) => {
    if (sending) return;
    setSending(true);
    try {
      await ApiService.post(`/public/kb/articles/${articleId}/feedback`, { helpful });
      await StorageService.set(voteKey(articleId), helpful).catch(() => undefined);
      setVoted(helpful);
    } catch (e: any) {
      // Already voted plenty today (429): treat as done. Anything else: the buttons stay so they can try again.
      if (/HTTP 429|already/i.test(String(e?.message))) setVoted(helpful);
    } finally {
      setSending(false);
    }
  };

  if (voted === undefined) return null;

  return (
    <View style={[styles.row, { borderTopColor: borderColor }]}>
      {voted === null ? (
        <>
          <Text style={[styles.q, { color: textColor }]}>Was this helpful?</Text>
          {([['Yes', true], ['No', false]] as const).map(([label, value]) => (
            <TouchableOpacity key={label} disabled={sending} onPress={() => vote(value)} style={[styles.btn, { borderColor, opacity: sending ? 0.5 : 1 }]} accessibilityLabel={value ? 'Yes, helpful' : 'No, not helpful'}>
              <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <Text style={[styles.q, { color: textColor }]}>Thanks for the feedback.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  q: { fontSize: 12.5, opacity: 0.75, marginRight: 2 },
  btn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  btnText: { fontSize: 12.5, fontWeight: '600' },
});
