import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KerTheme } from '../types';
import { EmojiPicker } from './EmojiPicker';
import { GradientLayer, bubbleRadius, gradientColors } from './GradientLayer';
import { usePalette } from '../theme/palette';

export interface PendingAttachment {
  /** Local file:// URI for the preview thumbnail. */
  uri: string;
  name: string;
  isImage: boolean;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  isUploading?: boolean;
  pendingAttachment?: PendingAttachment | null;
  onRemoveAttachment?: () => void;
  theme: KerTheme;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  onAttach,
  isUploading,
  pendingAttachment,
  onRemoveAttachment,
  theme,
  disabled,
  placeholder,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);

  const canSend = (!!value.trim() || !!pendingAttachment) && !disabled && !isUploading;

  const handleSend = () => {
    if (!canSend) return;
    onSend();
    setShowEmoji(false);
  };

  const palette = usePalette(theme);

  const insertEmoji = (emoji: string) => {
    onChangeText(value + emoji);
  };

  return (
    <View style={[styles.container, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
      {pendingAttachment && (
        <View style={[styles.pendingRow, { backgroundColor: palette.surface }]}>
          {pendingAttachment.isImage ? (
            <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingThumb} />
          ) : (
            <View style={[styles.pendingFileIcon, { backgroundColor: palette.surfaceStrong }]}>
              <Text style={{ fontSize: 15 }}>📎</Text>
            </View>
          )}
          <Text numberOfLines={1} style={[styles.pendingName, { color: palette.text }]}>{pendingAttachment.name}</Text>
          {isUploading ? (
            <ActivityIndicator size="small" color={palette.textMuted} />
          ) : (
            <TouchableOpacity onPress={onRemoveAttachment} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 13, color: palette.textSubtle }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.row}>
        {onAttach && (
          <TouchableOpacity
            onPress={onAttach}
            disabled={disabled || !!pendingAttachment}
            style={styles.attachBtn}
          >
            <Text style={{ fontSize: 18, color: disabled || pendingAttachment ? palette.borderStrong : palette.textMuted }}>📎</Text>
          </TouchableOpacity>
        )}

        <View style={styles.inputWrap}>
          <TextInput
            style={[
              styles.input,
              {
                color: palette.text,
                fontFamily: theme.fontFamily,
                backgroundColor: palette.inputBackground,
                borderRadius: bubbleRadius(theme) + 4,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? 'Type a message…'}
            placeholderTextColor={palette.textSubtle}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          {/* Emoji button — positioned inside the input field itself */}
          <TouchableOpacity
            onPress={() => setShowEmoji((v) => !v)}
            disabled={disabled}
            style={styles.emojiBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 17 }}>🙂</Text>
          </TouchableOpacity>
          {showEmoji && <EmojiPicker onSelect={insertEmoji} palette={palette} />}
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? palette.primary : palette.surfaceStrong },
          ]}
        >
          <GradientLayer colors={canSend ? gradientColors(theme) : null} />
          <Text style={{ color: canSend ? palette.onPrimary : palette.textSubtle, fontSize: 16 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  pendingThumb: { width: 32, height: 32, borderRadius: 6 },
  pendingFileIcon: {
    width: 32, height: 32, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  pendingName: { flex: 1, fontSize: 12.5 },
  inputWrap: {
    flex: 1,
    position: 'relative',
    marginRight: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingRight: 40,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  emojiBtn: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  attachBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
